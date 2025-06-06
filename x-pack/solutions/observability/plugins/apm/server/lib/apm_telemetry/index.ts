/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreSetup, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import {
  APM_TELEMETRY_SAVED_OBJECT_ID,
  APM_TELEMETRY_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import { getInternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';
import { collectDataTelemetry } from './collect_data_telemetry';
import type { APMUsage } from './types';
import { apmSchema } from './schema';
import { getTelemetryClient } from './telemetry_client';

export const APM_TELEMETRY_TASK_NAME = 'apm-telemetry-task';

export async function createApmTelemetry({
  core,
  getApmIndices,
  usageCollector,
  taskManager,
  logger,
  kibanaVersion,
  isProd,
}: {
  core: CoreSetup;
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
  usageCollector: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  kibanaVersion: string;
  isProd: boolean;
}) {
  taskManager.registerTaskDefinitions({
    [APM_TELEMETRY_TASK_NAME]: {
      title: 'Collect APM usage',
      createTaskRunner: () => {
        return {
          run: async () => {
            await collectAndStore();
          },
          cancel: async () => {},
        };
      },
    },
  });

  const telemetryClient = await getTelemetryClient({ core });
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);
  const apmIndices = await getApmIndices(savedObjectsClient);

  const collectAndStore = async () => {
    const dataTelemetry = await collectDataTelemetry({
      indices: apmIndices,
      telemetryClient,
      logger,
      savedObjectsClient,
      isProd,
    });

    await savedObjectsClient.create(
      APM_TELEMETRY_SAVED_OBJECT_TYPE,
      {
        ...dataTelemetry,
        kibanaVersion,
      },
      { id: APM_TELEMETRY_SAVED_OBJECT_TYPE, overwrite: true }
    );
  };

  const collector = usageCollector.makeUsageCollector<APMUsage | {}>({
    type: 'apm',
    schema: apmSchema,
    fetch: async () => {
      try {
        const { kibanaVersion: storedKibanaVersion, ...data } = (
          await savedObjectsClient.get(
            APM_TELEMETRY_SAVED_OBJECT_TYPE,
            APM_TELEMETRY_SAVED_OBJECT_ID
          )
        ).attributes as { kibanaVersion: string } & APMUsage;

        return data;
      } catch (err) {
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          // task has not run yet, so no saved object to return
          return {};
        }
        throw err;
      }
    },
    isReady: () => true,
  });

  usageCollector.registerCollector(collector);

  core
    .getStartServices()
    .then(async ([_coreStart, pluginsStart]) => {
      const { taskManager: taskManagerStart } = pluginsStart as {
        taskManager: TaskManagerStartContract;
      };

      await taskManagerStart.ensureScheduled({
        id: APM_TELEMETRY_TASK_NAME,
        taskType: APM_TELEMETRY_TASK_NAME,
        schedule: {
          interval: '720m',
        },
        scope: ['apm'],
        params: {},
        state: {},
      });

      try {
        const currentData = (
          await savedObjectsClient.get(
            APM_TELEMETRY_SAVED_OBJECT_TYPE,
            APM_TELEMETRY_SAVED_OBJECT_ID
          )
        ).attributes as { kibanaVersion?: string };

        if (currentData.kibanaVersion !== kibanaVersion) {
          logger.debug(
            `Stored telemetry is out of date. Task will run immediately. Stored: ${currentData.kibanaVersion}, expected: ${kibanaVersion}`
          );
          await taskManagerStart.runSoon(APM_TELEMETRY_TASK_NAME);
        }
      } catch (err) {
        if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
          logger.warn('Failed to fetch saved telemetry data.');
        }
      }
    })
    .catch(() => {});
}
