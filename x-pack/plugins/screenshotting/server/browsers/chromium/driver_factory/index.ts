/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getDataPath } from '@kbn/utils';
import { spawn } from 'child_process';
import del from 'del';
import fs from 'fs';
import { uniq } from 'lodash';
import path from 'path';
import puppeteer, { Browser, ConsoleMessage, HTTPRequest, Page } from 'puppeteer';
import { createInterface } from 'readline';
import * as Rx from 'rxjs';
import { InnerSubscriber } from 'rxjs/internal/InnerSubscriber';
import { catchError, ignoreElements, map, mergeMap, reduce, takeUntil, tap } from 'rxjs/operators';
import type { Logger } from 'src/core/server';
import type { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/server';
import { ConfigType } from '../../../config';
import { getChromiumDisconnectedError } from '../';
import { safeChildProcess } from '../../safe_child_process';
import { HeadlessChromiumDriver } from '../driver';
import { args } from './args';
import { getMetrics, PerformanceMetrics } from './metrics';

interface CreatePageOptions {
  browserTimezone?: string;
  openUrlTimeout: number;
}

interface CreatePageResult {
  driver: HeadlessChromiumDriver;
  exit$: Rx.Observable<never>;
  metrics$: Rx.Observable<PerformanceMetrics>;
}

export const DEFAULT_VIEWPORT = {
  width: 1950,
  height: 1200,
};

// Default args used by pptr
// https://github.com/puppeteer/puppeteer/blob/13ea347/src/node/Launcher.ts#L168
const DEFAULT_ARGS = [
  '--disable-background-networking',
  '--enable-features=NetworkService,NetworkServiceInProcess',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-features=TranslateUI',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--no-first-run',
  '--enable-automation',
  '--password-store=basic',
  '--use-mock-keychain',
  '--remote-debugging-port=0',
  '--headless',
];

const DIAGNOSTIC_TIME = 5 * 1000;

export class HeadlessChromiumDriverFactory {
  private userDataDir = fs.mkdtempSync(path.join(getDataPath(), 'chromium-'));
  type = 'chromium';

  constructor(
    private screenshotMode: ScreenshotModePluginSetup,
    private config: ConfigType,
    private logger: Logger,
    private binaryPath: string
  ) {
    if (this.config.browser.chromium.disableSandbox) {
      logger.warn(`Enabling the Chromium sandbox provides an additional layer of protection.`);
    }
  }

  private getChromiumArgs() {
    return args({
      userDataDir: this.userDataDir,
      disableSandbox: this.config.browser.chromium.disableSandbox,
      proxy: this.config.browser.chromium.proxy,
      viewport: DEFAULT_VIEWPORT,
    });
  }

  /*
   * Return an observable to objects which will drive screenshot capture for a page
   */
  createPage(
    { browserTimezone, openUrlTimeout }: CreatePageOptions,
    pLogger = this.logger
  ): Rx.Observable<CreatePageResult> {
    // FIXME: 'create' is deprecated
    return Rx.Observable.create(async (observer: InnerSubscriber<unknown, unknown>) => {
      const logger = pLogger.get('browser-driver');
      logger.info(`Creating browser page driver`);

      const chromiumArgs = this.getChromiumArgs();
      logger.debug(`Chromium launch args set to: ${chromiumArgs}`);

      let browser: Browser | undefined;

      try {
        browser = await puppeteer.launch({
          pipe: !this.config.browser.chromium.inspect,
          userDataDir: this.userDataDir,
          executablePath: this.binaryPath,
          ignoreHTTPSErrors: true,
          handleSIGHUP: false,
          args: chromiumArgs,
          env: {
            TZ: browserTimezone,
          },
        });
      } catch (err) {
        observer.error(new Error(`Error spawning Chromium browser! ${err}`));
        return;
      }

      const page = await browser.newPage();
      const devTools = await page.target().createCDPSession();

      await devTools.send('Performance.enable', { timeDomain: 'timeTicks' });
      const startMetrics = await devTools.send('Performance.getMetrics');
      const metrics$ = new Rx.Subject<PerformanceMetrics>();

      // Log version info for debugging / maintenance
      const versionInfo = await devTools.send('Browser.getVersion');
      logger.debug(`Browser version: ${JSON.stringify(versionInfo)}`);

      await page.emulateTimezone(browserTimezone);

      // Set the default timeout for all navigation methods to the openUrl timeout
      // All waitFor methods have their own timeout config passed in to them
      page.setDefaultTimeout(openUrlTimeout);

      logger.debug(`Browser page driver created`);

      const childProcess = {
        async kill() {
          try {
            if (devTools && startMetrics) {
              const endMetrics = await devTools.send('Performance.getMetrics');
              const metrics = getMetrics(startMetrics, endMetrics);
              const { cpuInPercentage, memoryInMegabytes } = metrics;

              metrics$.next(metrics);
              logger.debug(
                `Chromium consumed CPU ${cpuInPercentage}% Memory ${memoryInMegabytes}MB`
              );
            }
          } catch (error) {
            logger.error(error);
          } finally {
            metrics$.complete();
          }

          try {
            await browser?.close();
          } catch (err) {
            // do not throw
            logger.error(err);
          }
        },
      };
      const { terminate$ } = safeChildProcess(logger, childProcess);

      // this is adding unsubscribe logic to our observer
      // so that if our observer unsubscribes, we terminate our child-process
      observer.add(() => {
        logger.debug(`The browser process observer has unsubscribed. Closing the browser...`);
        childProcess.kill(); // ignore async
      });

      // make the observer subscribe to terminate$
      observer.add(
        terminate$
          .pipe(
            tap((signal) => {
              logger.debug(`Termination signal received: ${signal}`);
            }),
            ignoreElements()
          )
          .subscribe(observer)
      );

      // taps the browser log streams and combine them to Kibana logs
      this.getBrowserLogger(page, logger).subscribe();
      this.getProcessLogger(browser, logger).subscribe();

      // HeadlessChromiumDriver: object to "drive" a browser page
      const driver = new HeadlessChromiumDriver(this.screenshotMode, this.config, page);

      // Rx.Observable<never>: stream to interrupt page capture
      const exit$ = this.getPageExit(browser, page);

      observer.next({ driver, exit$, metrics$: metrics$.asObservable() });

      // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
      observer.add(() => {
        const userDataDir = this.userDataDir;
        logger.debug(`deleting chromium user data directory at [${userDataDir}]`);
        // the unsubscribe function isn't `async` so we're going to make our best effort at
        // deleting the userDataDir and if it fails log an error.
        del(userDataDir, { force: true }).catch((error) => {
          logger.error(`error deleting user data directory at [${userDataDir}]!`);
          logger.error(error);
        });
      });
    });
  }

  getBrowserLogger(page: Page, logger: Logger): Rx.Observable<void> {
    const consoleMessages$ = Rx.fromEvent<ConsoleMessage>(page, 'console').pipe(
      map((line) => {
        const formatLine = () => `{ text: "${line.text()?.trim()}", url: ${line.location()?.url} }`;

        if (line.type() === 'error') {
          logger.get('headless-browser-console').error(`Error in browser console: ${formatLine()}`);
        } else {
          logger
            .get(`headless-browser-console:${line.type()}`)
            .debug(`Message in browser console: ${formatLine()}`);
        }
      })
    );

    const uncaughtExceptionPageError$ = Rx.fromEvent<Error>(page, 'pageerror').pipe(
      map((err) => {
        logger.warn(
          i18n.translate('xpack.screenshotting.browsers.chromium.pageErrorDetected', {
            defaultMessage: `Reporting encountered an uncaught error on the page that will be ignored: {err}`,
            values: { err: err.toString() },
          })
        );
      })
    );

    const pageRequestFailed$ = Rx.fromEvent<HTTPRequest>(page, 'requestfailed').pipe(
      map((req) => {
        const failure = req.failure && req.failure();
        if (failure) {
          logger.warn(
            `Request to [${req.url()}] failed! [${failure.errorText}]. This error will be ignored.`
          );
        }
      })
    );

    return Rx.merge(consoleMessages$, uncaughtExceptionPageError$, pageRequestFailed$);
  }

  getProcessLogger(browser: Browser, logger: Logger): Rx.Observable<void> {
    const childProcess = browser.process();
    // NOTE: The browser driver can not observe stdout and stderr of the child process
    // Puppeteer doesn't give a handle to the original ChildProcess object
    // See https://github.com/GoogleChrome/puppeteer/issues/1292#issuecomment-521470627

    if (childProcess == null) {
      throw new TypeError('childProcess is null or undefined!');
    }

    // just log closing of the process
    const processClose$ = Rx.fromEvent<void>(childProcess, 'close').pipe(
      tap(() => {
        logger.get('headless-browser-process').debug('child process closed');
      })
    );

    return processClose$; // ideally, this would also merge with observers for stdout and stderr
  }

  getPageExit(browser: Browser, page: Page) {
    const pageError$ = Rx.fromEvent<Error>(page, 'error').pipe(
      mergeMap((err) => {
        return Rx.throwError(
          i18n.translate('xpack.screenshotting.browsers.chromium.errorDetected', {
            defaultMessage: 'Reporting encountered an error: {err}',
            values: { err: err.toString() },
          })
        );
      })
    );

    const browserDisconnect$ = Rx.fromEvent(browser, 'disconnected').pipe(
      mergeMap(() => Rx.throwError(getChromiumDisconnectedError()))
    );

    return Rx.merge(pageError$, browserDisconnect$);
  }

  diagnose(overrideFlags: string[] = []): Rx.Observable<string> {
    const kbnArgs = this.getChromiumArgs();
    const finalArgs = uniq([...DEFAULT_ARGS, ...kbnArgs, ...overrideFlags]);

    // On non-windows platforms, `detached: true` makes child process a
    // leader of a new process group, making it possible to kill child
    // process tree with `.kill(-pid)` command. @see
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    const browserProcess = spawn(this.binaryPath, finalArgs, {
      detached: process.platform !== 'win32',
    });

    const rl = createInterface({ input: browserProcess.stderr });

    const exit$ = Rx.fromEvent(browserProcess, 'exit').pipe(
      map((code) => {
        this.logger.error(`Browser exited abnormally, received code: ${code}`);
        return i18n.translate('xpack.screenshotting.diagnostic.browserCrashed', {
          defaultMessage: `Browser exited abnormally during startup`,
        });
      })
    );

    const error$ = Rx.fromEvent(browserProcess, 'error').pipe(
      map((err) => {
        this.logger.error(`Browser process threw an error on startup`);
        this.logger.error(err as string | Error);
        return i18n.translate('xpack.screenshotting.diagnostic.browserErrored', {
          defaultMessage: `Browser process threw an error on startup`,
        });
      })
    );

    const browserProcessLogger = this.logger.get('chromium-stderr');
    const log$ = Rx.fromEvent(rl, 'line').pipe(
      tap((message: unknown) => {
        if (typeof message === 'string') {
          browserProcessLogger.info(message);
        }
      })
    );

    // Collect all events (exit, error and on log-lines), but let chromium keep spitting out
    // logs as sometimes it's "bind" successfully for remote connections, but later emit
    // a log indicative of an issue (for example, no default font found).
    return Rx.merge(exit$, error$, log$).pipe(
      takeUntil(Rx.timer(DIAGNOSTIC_TIME)),
      reduce((acc, curr) => `${acc}${curr}\n`, ''),
      tap(() => {
        if (browserProcess && browserProcess.pid && !browserProcess.killed) {
          browserProcess.kill('SIGKILL');
          this.logger.info(
            `Successfully sent 'SIGKILL' to browser process (PID: ${browserProcess.pid})`
          );
        }
        browserProcess.removeAllListeners();
        rl.removeAllListeners();
        rl.close();
        del(this.userDataDir, { force: true }).catch((error) => {
          this.logger.error(`Error deleting user data directory at [${this.userDataDir}]!`);
          this.logger.error(error);
        });
      }),
      catchError((error) => {
        this.logger.error(error);

        return Rx.of(error);
      })
    );
  }
}

export type { PerformanceMetrics };
