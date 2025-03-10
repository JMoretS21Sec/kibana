/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { mlServicesMock, mlAuthzMock as mockMlAuthzFactory } from '../../../machine_learning/mocks';
import { buildMlAuthz } from '../../../machine_learning/authz';
import {
  getEmptyFindResult,
  getRuleExecutionStatusSucceeded,
  getAlertMock,
  getPatchRequest,
  getFindResultWithSingleHit,
  nonRuleFindResult,
  typicalMlRulePayload,
  getEmptySavedObjectsResponse,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { patchRulesRoute } from './patch_rules_route';
import { getPatchRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/patch_rules_schema.mock';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';

jest.mock('../../../machine_learning/authz', () => mockMlAuthzFactory.create());

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('patch_rules - %s', (_, isRuleRegistryEnabled) => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let ml: ReturnType<typeof mlServicesMock.createSetupContract>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    ml = mlServicesMock.createSetupContract();

    clients.rulesClient.get.mockResolvedValue(
      getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())
    ); // existing rule
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled)); // existing rule
    clients.rulesClient.update.mockResolvedValue(
      getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())
    ); // successful update
    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse()); // successful transform
    clients.savedObjectsClient.create.mockResolvedValue({
      type: 'my-type',
      id: 'e0b86950-4e9f-11ea-bdbd-07b56aa159b3',
      attributes: getRuleExecutionStatusSucceeded(),
      references: [],
    }); // successful transform
    clients.ruleExecutionLogClient.getCurrentStatus.mockResolvedValue(
      getRuleExecutionStatusSucceeded()
    );

    patchRulesRoute(server.router, ml, isRuleRegistryEnabled);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getRulesClient = jest.fn();
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('returns error if requesting a non-rule', async () => {
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult(isRuleRegistryEnabled));
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: expect.stringContaining('not found'),
        status_code: 404,
      });
    });

    test('catches error if update throws error', async () => {
      clients.rulesClient.update.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('allows ML Params to be patched', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          type: 'machine_learning',
          rule_id: 'my-rule-id',
          anomaly_threshold: 4,
          machine_learning_job_id: 'some_job_id',
        },
      });
      await server.inject(request, context);

      expect(clients.rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              anomalyThreshold: 4,
              machineLearningJobId: ['some_job_id'],
            }),
          }),
        })
      );
    });

    it('rejects patching a rule to ML if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: typicalMlRulePayload(),
      });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });

    it('rejects patching an ML rule if mlAuthz fails', async () => {
      (buildMlAuthz as jest.Mock).mockReturnValueOnce({
        validateRuleType: jest
          .fn()
          .mockResolvedValue({ valid: false, message: 'mocked validation message' }),
      });
      const { type, ...payloadWithoutType } = typicalMlRulePayload();
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: payloadWithoutType,
      });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getPatchRulesSchemaMock(), rule_id: undefined },
      });
      const response = await server.inject(request, context);
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getPatchRulesSchemaMock(), type: 'query' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getPatchRulesSchemaMock(), type: 'unknown_type' },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'Invalid value "unknown_type" supplied to "type"'
      );
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { from: 'now-7m', interval: '5m', ...getPatchRulesSchemaMock() },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getPatchRulesSchemaMock(),
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('Failed to parse "from" on rule param');
    });
  });
});
