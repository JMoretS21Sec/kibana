/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { AppMountParameters } from '../../../../../src/core/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import '../index.scss';
import { NotFoundPage } from '../pages/404';
import { LinkToMetricsPage } from '../pages/link_to/link_to_metrics';
import { InfrastructurePage } from '../pages/metrics';
import { InfraClientStartDeps } from '../types';
import { RedirectWithQueryParams } from '../utils/redirect_with_query_params';
import { CommonInfraProviders, CoreProviders } from './common_providers';
import { prepareMountElement } from './common_styles';

export const renderApp = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  { element, history, setHeaderActionMenu, theme$ }: AppMountParameters
) => {
  const storage = new Storage(window.localStorage);

  prepareMountElement(element, 'infraMetricsPage');

  ReactDOM.render(
    <MetricsApp
      core={core}
      history={history}
      plugins={plugins}
      setHeaderActionMenu={setHeaderActionMenu}
      storage={storage}
      theme$={theme$}
    />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MetricsApp: React.FC<{
  core: CoreStart;
  history: History<unknown>;
  plugins: InfraClientStartDeps;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  storage: Storage;
  theme$: AppMountParameters['theme$'];
}> = ({ core, history, plugins, setHeaderActionMenu, storage, theme$ }) => {
  const uiCapabilities = core.application.capabilities;

  return (
    <CoreProviders core={core} plugins={plugins} theme$={theme$}>
      <CommonInfraProviders
        appName="Metrics UI"
        setHeaderActionMenu={setHeaderActionMenu}
        storage={storage}
        triggersActionsUI={plugins.triggersActionsUi}
      >
        <Router history={history}>
          <Switch>
            <Route path="/link-to" component={LinkToMetricsPage} />
            {uiCapabilities?.infrastructure?.show && (
              <RedirectWithQueryParams from="/" exact={true} to="/inventory" />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <RedirectWithQueryParams from="/snapshot" exact={true} to="/inventory" />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <RedirectWithQueryParams from="/metrics-explorer" exact={true} to="/explorer" />
            )}
            {uiCapabilities?.infrastructure?.show && (
              <Route path="/" component={InfrastructurePage} />
            )}
            <Route component={NotFoundPage} />
          </Switch>
        </Router>
      </CommonInfraProviders>
    </CoreProviders>
  );
};
