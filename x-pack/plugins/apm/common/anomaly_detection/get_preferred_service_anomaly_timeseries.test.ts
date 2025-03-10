/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { ENVIRONMENT_ALL } from '../environment_filter_values';
import { Environment } from '../environment_rt';
import { ApmMlDetectorType } from './apm_ml_detectors';
import { getPreferredServiceAnomalyTimeseries } from './get_preferred_service_anomaly_timeseries';
import { ServiceAnomalyTimeseries } from './service_anomaly_timeseries';

const PROD = 'production' as Environment;
const DEV = 'development' as Environment;

function createMockAnomalyTimeseries({
  type,
  environment = PROD,
  version = 3,
}: {
  type: ApmMlDetectorType;
  environment?: Environment;
  version?: number;
}): ServiceAnomalyTimeseries {
  return {
    anomalies: [],
    bounds: [],
    environment,
    jobId: uuid(),
    type,
    serviceName: 'opbeans-java',
    transactionType: 'request',
    version,
  };
}

describe('getPreferredServiceAnomalyTimeseries', () => {
  describe('with a wide set of series', () => {
    const allAnomalyTimeseries = [
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: PROD,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: DEV,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txThroughput,
        environment: PROD,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txFailureRate,
        environment: PROD,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txFailureRate,
        environment: PROD,
        version: 2,
      }),
    ];

    describe('with one environment', () => {
      const environments = [PROD];

      describe('and all being selected', () => {
        const environment = ENVIRONMENT_ALL.value;
        it('returns the series for prod', () => {
          expect(
            getPreferredServiceAnomalyTimeseries({
              allAnomalyTimeseries,
              detectorType: ApmMlDetectorType.txLatency,
              environment,
              environments,
              fallbackToTransactions: false,
            })?.environment
          ).toBe(PROD);
        });
      });
    });

    describe('with multiple environments', () => {
      const environments = [PROD, DEV];

      describe('and all being selected', () => {
        const environment = ENVIRONMENT_ALL.value;

        it('returns no series', () => {
          expect(
            getPreferredServiceAnomalyTimeseries({
              allAnomalyTimeseries,
              detectorType: ApmMlDetectorType.txLatency,
              environment,
              environments,
              fallbackToTransactions: false,
            })
          ).toBeUndefined();

          expect(
            getPreferredServiceAnomalyTimeseries({
              allAnomalyTimeseries,
              detectorType: ApmMlDetectorType.txLatency,
              environment,
              environments,
              fallbackToTransactions: true,
            })
          ).toBeUndefined();
        });
      });

      describe('and production being selected', () => {
        const environment = PROD;

        it('returns the series for production', () => {
          const series = getPreferredServiceAnomalyTimeseries({
            allAnomalyTimeseries,
            detectorType: ApmMlDetectorType.txFailureRate,
            environment,
            environments,
            fallbackToTransactions: false,
          });

          expect(series).toBeDefined();

          expect(series?.environment).toBe(PROD);
        });
      });
    });
  });

  describe('with multiple versions', () => {
    const allAnomalyTimeseries = [
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: PROD,
        version: 3,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: PROD,
        version: 2,
      }),
    ];

    const environments = [PROD];
    const environment = ENVIRONMENT_ALL.value;

    it('selects the most recent version when transaction metrics are being used', () => {
      const series = getPreferredServiceAnomalyTimeseries({
        allAnomalyTimeseries,
        detectorType: ApmMlDetectorType.txLatency,
        environment,
        environments,
        fallbackToTransactions: false,
      });

      expect(series?.version).toBe(3);
    });

    it('selects the legacy version when transaction metrics are being used', () => {
      const series = getPreferredServiceAnomalyTimeseries({
        allAnomalyTimeseries,
        detectorType: ApmMlDetectorType.txLatency,
        environment,
        environments,
        fallbackToTransactions: true,
      });

      expect(series?.version).toBe(2);
    });
  });
});
