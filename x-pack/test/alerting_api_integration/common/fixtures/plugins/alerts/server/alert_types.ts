/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { curry, times } from 'lodash';
import { ES_TEST_INDEX_NAME } from '../../../../lib';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';
import {
  AlertType,
  AlertInstanceState,
  AlertInstanceContext,
  AlertTypeState,
  AlertTypeParams,
} from '../../../../../../../plugins/alerting/server';

export const EscapableStrings = {
  escapableBold: '*bold*',
  escapableBacktic: 'back`tic',
  escapableBackticBold: '`*bold*`',
  escapableHtml: '<&>',
  escapableDoubleQuote: '"double quote"',
  escapableLineFeed: 'line\x0afeed',
};

export const DeepContextVariables = {
  objectA: {
    stringB: 'B',
    arrayC: [
      { stringD: 'D1', numberE: 42 },
      { stringD: 'D2', numberE: 43 },
    ],
    objectF: {
      stringG: 'G',
      nullG: null,
      undefinedG: undefined,
    },
  },
  stringH: 'H',
  arrayI: [44, 45],
  nullJ: null,
  undefinedK: undefined,
};

function getAlwaysFiringAlertType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
    groupsToScheduleActionsInSeries: schema.maybe(schema.arrayOf(schema.nullable(schema.string()))),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends AlertTypeState {
    groupInSeriesIndex?: number;
  }
  interface InstanceState extends AlertInstanceState {
    instanceStateValue: boolean;
  }
  interface InstanceContext extends AlertInstanceContext {
    instanceContextValue: boolean;
  }
  const result: AlertType<
    ParamsType & AlertTypeParams,
    never, // Only use if defining useSavedObjectReferences hook
    State,
    InstanceState,
    InstanceContext,
    'default' | 'other'
  > = {
    id: 'test.always-firing',
    name: 'Test: Always Firing',
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'other', name: 'Other' },
    ],
    validate: {
      params: paramsSchema,
    },
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    actionVariables: {
      state: [{ name: 'instanceStateValue', description: 'the instance state value' }],
      params: [{ name: 'instanceParamsValue', description: 'the instance params value' }],
      context: [{ name: 'instanceContextValue', description: 'the instance context value' }],
    },
    executor: curry(alwaysFiringExecutor)(),
  };
  return result;
}

async function alwaysFiringExecutor(alertExecutorOptions: any) {
  const {
    services,
    params,
    state,
    alertId,
    spaceId,
    namespace,
    name,
    tags,
    createdBy,
    updatedBy,
    rule,
  } = alertExecutorOptions;
  let group: string | null = 'default';
  let subgroup: string | null = null;
  const alertInfo = { alertId, spaceId, namespace, name, tags, createdBy, updatedBy, ...rule };

  if (params.groupsToScheduleActionsInSeries) {
    const index = state.groupInSeriesIndex || 0;
    const [scheduledGroup, scheduledSubgroup] = (
      params.groupsToScheduleActionsInSeries[index] ?? ''
    ).split(':');

    group = scheduledGroup;
    subgroup = scheduledSubgroup;
  }

  if (group) {
    const instance = services.alertInstanceFactory('1').replaceState({ instanceStateValue: true });

    if (subgroup) {
      instance.scheduleActionsWithSubGroup(group, subgroup, {
        instanceContextValue: true,
      });
    } else {
      instance.scheduleActions(group, {
        instanceContextValue: true,
      });
    }
  }

  await services.scopedClusterClient.asCurrentUser.index({
    index: params.index,
    refresh: 'wait_for',
    body: {
      state,
      params,
      reference: params.reference,
      source: 'alert:test.always-firing',
      alertInfo,
    },
  });
  return {
    globalStateValue: true,
    groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
  };
}

function getCumulativeFiringAlertType() {
  interface State extends AlertTypeState {
    runCount?: number;
  }
  interface InstanceState extends AlertInstanceState {
    instanceStateValue: boolean;
  }
  const result: AlertType<{}, {}, State, InstanceState, {}, 'default' | 'other'> = {
    id: 'test.cumulative-firing',
    name: 'Test: Cumulative Firing',
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'other', name: 'Other' },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor(alertExecutorOptions) {
      const { services, state } = alertExecutorOptions;
      const group = 'default';

      const runCount = (state.runCount || 0) + 1;

      times(runCount, (index) => {
        services
          .alertInstanceFactory(`instance-${index}`)
          .replaceState({ instanceStateValue: true })
          .scheduleActions(group);
      });

      return {
        runCount,
      };
    },
  };
  return result;
}

function getNeverFiringAlertType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends AlertTypeState {
    globalStateValue: boolean;
  }
  const result: AlertType<ParamsType, never, State, {}, {}, 'default'> = {
    id: 'test.never-firing',
    name: 'Test: Never firing',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    validate: {
      params: paramsSchema,
    },
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor({ services, params, state }) {
      await services.scopedClusterClient.asCurrentUser.index({
        index: params.index,
        refresh: 'wait_for',
        body: {
          state,
          params,
          reference: params.reference,
          source: 'alert:test.never-firing',
        },
      });
      return {
        globalStateValue: true,
      };
    },
  };
  return result;
}

function getFailingAlertType() {
  const paramsSchema = schema.object({
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: AlertType<ParamsType, never, {}, {}, {}, 'default'> = {
    id: 'test.failing',
    name: 'Test: Failing',
    validate: {
      params: paramsSchema,
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor({ services, params, state }) {
      await services.scopedClusterClient.asCurrentUser.index({
        index: params.index,
        refresh: 'wait_for',
        body: {
          state,
          params,
          reference: params.reference,
          source: 'alert:test.failing',
        },
      });
      throw new Error('Failed to execute alert type');
    },
  };
  return result;
}

function getAuthorizationAlertType(core: CoreSetup<FixtureStartDeps>) {
  const paramsSchema = schema.object({
    callClusterAuthorizationIndex: schema.string(),
    savedObjectsClientType: schema.string(),
    savedObjectsClientId: schema.string(),
    index: schema.string(),
    reference: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: AlertType<ParamsType, never, {}, {}, {}, 'default'> = {
    id: 'test.authorization',
    name: 'Test: Authorization',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    producer: 'alertsFixture',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    validate: {
      params: paramsSchema,
    },
    async executor({ services, params, state }) {
      // Call cluster
      let callClusterSuccess = false;
      let callClusterError;
      try {
        await services.scopedClusterClient.asCurrentUser.index({
          index: params.callClusterAuthorizationIndex,
          refresh: 'wait_for',
          body: {
            param1: 'test',
          },
        });
        callClusterSuccess = true;
      } catch (e) {
        callClusterError = e;
      }
      // Call scoped cluster
      const scopedClusterClient = services.scopedClusterClient;
      let callScopedClusterSuccess = false;
      let callScopedClusterError;
      try {
        await scopedClusterClient.asCurrentUser.index({
          index: params.callClusterAuthorizationIndex,
          refresh: 'wait_for',
          body: {
            param1: 'test',
          },
        });
        callScopedClusterSuccess = true;
      } catch (e) {
        callScopedClusterError = e;
      }
      // Saved objects client
      let savedObjectsClientSuccess = false;
      let savedObjectsClientError;
      try {
        await services.savedObjectsClient.get(
          params.savedObjectsClientType,
          params.savedObjectsClientId
        );
        savedObjectsClientSuccess = true;
      } catch (e) {
        savedObjectsClientError = e;
      }
      // Save the result
      await services.scopedClusterClient.asCurrentUser.index({
        index: params.index,
        refresh: 'wait_for',
        body: {
          state: {
            callClusterSuccess,
            callClusterError,
            callScopedClusterSuccess,
            callScopedClusterError,
            savedObjectsClientSuccess,
            savedObjectsClientError,
          },
          params,
          reference: params.reference,
          source: 'alert:test.authorization',
        },
      });
    },
  };
  return result;
}

function getValidationAlertType() {
  const paramsSchema = schema.object({
    param1: schema.string(),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  const result: AlertType<ParamsType, never, {}, {}, {}, 'default'> = {
    id: 'test.validation',
    name: 'Test: Validation',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    defaultActionGroupId: 'default',
    validate: {
      params: paramsSchema,
    },
    async executor() {},
  };
  return result;
}

function getPatternFiringAlertType() {
  const paramsSchema = schema.object({
    pattern: schema.recordOf(
      schema.string(),
      schema.arrayOf(schema.oneOf([schema.boolean(), schema.string()]))
    ),
    reference: schema.maybe(schema.string()),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends AlertTypeState {
    patternIndex?: number;
  }
  const result: AlertType<ParamsType, never, State, {}, {}, 'default'> = {
    id: 'test.patternFiring',
    name: 'Test: Firing on a Pattern',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor(alertExecutorOptions) {
      const { services, state, params } = alertExecutorOptions;
      const pattern = params.pattern;
      if (typeof pattern !== 'object') throw new Error('pattern is not an object');
      let maxPatternLength = 0;
      for (const [instanceId, instancePattern] of Object.entries(pattern)) {
        if (!Array.isArray(instancePattern)) {
          throw new Error(`pattern for instance ${instanceId} is not an array`);
        }
        maxPatternLength = Math.max(maxPatternLength, instancePattern.length);
      }

      if (params.reference) {
        await services.scopedClusterClient.asCurrentUser.index({
          index: ES_TEST_INDEX_NAME,
          refresh: 'wait_for',
          body: {
            reference: params.reference,
            source: 'alert:test.patternFiring',
            ...alertExecutorOptions,
          },
        });
      }

      // get the pattern index, return if past it
      const patternIndex = state.patternIndex ?? 0;
      if (patternIndex >= maxPatternLength) {
        return { patternIndex };
      }

      // fire if pattern says to
      for (const [instanceId, instancePattern] of Object.entries(pattern)) {
        const scheduleByPattern = instancePattern[patternIndex];
        if (scheduleByPattern === true) {
          services.alertInstanceFactory(instanceId).scheduleActions('default', {
            ...EscapableStrings,
            deep: DeepContextVariables,
          });
        } else if (typeof scheduleByPattern === 'string') {
          services
            .alertInstanceFactory(instanceId)
            .scheduleActionsWithSubGroup('default', scheduleByPattern);
        }
      }

      return {
        patternIndex: patternIndex + 1,
      };
    },
  };
  return result;
}

function getLongRunningPatternRuleType(cancelAlertsOnRuleTimeout: boolean = true) {
  const paramsSchema = schema.object({
    pattern: schema.arrayOf(schema.boolean()),
  });
  type ParamsType = TypeOf<typeof paramsSchema>;
  interface State extends AlertTypeState {
    patternIndex?: number;
  }
  const result: AlertType<ParamsType, never, State, {}, {}, 'default'> = {
    id: `test.patternLongRunning${
      cancelAlertsOnRuleTimeout === true ? '.cancelAlertsOnRuleTimeout' : ''
    }`,
    name: 'Test: Run Long on a Pattern',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    ruleTaskTimeout: '3s',
    cancelAlertsOnRuleTimeout,
    async executor(ruleExecutorOptions) {
      const { services, state, params } = ruleExecutorOptions;
      const pattern = params.pattern;
      if (!Array.isArray(pattern)) {
        throw new Error(`pattern is not an array`);
      }

      // await new Promise((resolve) => setTimeout(resolve, 5000));

      // get the pattern index, return if past it
      const patternIndex = state.patternIndex ?? 0;
      if (patternIndex >= pattern.length) {
        return { patternIndex };
      }

      // run long if pattern says to
      if (pattern[patternIndex] === true) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      services.alertInstanceFactory('alert').scheduleActions('default', {});

      return {
        patternIndex: patternIndex + 1,
      };
    },
  };
  return result;
}

export function defineAlertTypes(
  core: CoreSetup<FixtureStartDeps>,
  { alerting }: Pick<FixtureSetupDeps, 'alerting'>
) {
  const noopAlertType: AlertType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {},
  };
  const goldNoopAlertType: AlertType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.gold.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'gold',
    isExportable: true,
    async executor() {},
  };
  const onlyContextVariablesAlertType: AlertType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.onlyContextVariables',
    name: 'Test: Only Context Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    actionVariables: {
      context: [{ name: 'aContextVariable', description: 'this is a context variable' }],
    },
    async executor() {},
  };
  const onlyStateVariablesAlertType: AlertType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.onlyStateVariables',
    name: 'Test: Only State Variables',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    actionVariables: {
      state: [{ name: 'aStateVariable', description: 'this is a state variable' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {},
  };
  const throwAlertType: AlertType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.throw',
    name: 'Test: Throw',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {
      throw new Error('this alert is intended to fail');
    },
  };
  const longRunningAlertType: AlertType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.longRunning',
    name: 'Test: Long Running',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    },
  };
  const exampleAlwaysFiringAlertType: AlertType<{}, {}, {}, {}, {}, 'small' | 'medium' | 'large'> =
    {
      id: 'example.always-firing',
      name: 'Always firing',
      actionGroups: [
        { id: 'small', name: 'Small t-shirt' },
        { id: 'medium', name: 'Medium t-shirt' },
        { id: 'large', name: 'Large t-shirt' },
      ],
      defaultActionGroupId: 'small',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {},
      producer: 'alertsFixture',
    };

  alerting.registerType(getAlwaysFiringAlertType());
  alerting.registerType(getCumulativeFiringAlertType());
  alerting.registerType(getNeverFiringAlertType());
  alerting.registerType(getFailingAlertType());
  alerting.registerType(getValidationAlertType());
  alerting.registerType(getAuthorizationAlertType(core));
  alerting.registerType(noopAlertType);
  alerting.registerType(onlyContextVariablesAlertType);
  alerting.registerType(onlyStateVariablesAlertType);
  alerting.registerType(getPatternFiringAlertType());
  alerting.registerType(throwAlertType);
  alerting.registerType(longRunningAlertType);
  alerting.registerType(goldNoopAlertType);
  alerting.registerType(exampleAlwaysFiringAlertType);
  alerting.registerType(getLongRunningPatternRuleType());
  alerting.registerType(getLongRunningPatternRuleType(false));
}
