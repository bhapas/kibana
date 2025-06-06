/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import useObservable from 'react-use/lib/useObservable';

import type { Observable } from 'rxjs';
import { forkJoin, of, Subject } from 'rxjs';
import { switchMap, map } from 'rxjs';

import { useCallback, useMemo } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { useTimefilter } from '@kbn/ml-date-picker';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { AppStateSelectedCells, ExplorerJob } from '../explorer_utils';
import {
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
  loadAnnotationsTableData,
  loadFilteredTopInfluencers,
  loadTopInfluencers,
  loadOverallAnnotations,
} from '../explorer_utils';

import { useMlApi } from '../../contexts/kibana';
import type { MlResultsService } from '../../services/results_service';
import { mlResultsServiceProvider } from '../../services/results_service';
import type { AnomalyExplorerChartsService } from '../../services/anomaly_explorer_charts_service';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import type { MlApi } from '../../services/ml_api_service';
import type { ExplorerState } from '../explorer_data';

// Memoize the data fetching methods.
// wrapWithLastRefreshArg() wraps any given function and preprends a `lastRefresh` argument
// which will be considered by memoizeOne. This way we can add the `lastRefresh` argument as a
// caching parameter without having to change all the original functions which shouldn't care
// about this parameter. The generic type T retains and returns the type information of
// the original function.
const memoizeIsEqual = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);
const wrapWithLastRefreshArg = <T extends (...a: any[]) => any>(func: T, context: any = null) => {
  return function (lastRefresh: number, ...args: Parameters<T>): ReturnType<T> {
    return func.apply(context, args);
  };
};
const memoize = <T extends (...a: any[]) => any>(func: T, context?: any) => {
  return memoizeOne(wrapWithLastRefreshArg<T>(func, context) as any, memoizeIsEqual) as (
    lastRefresh: number,
    ...args: Parameters<T>
  ) => ReturnType<T>;
};

const memoizedLoadOverallAnnotations = memoize(loadOverallAnnotations);

const memoizedLoadAnnotationsTableData = memoize(loadAnnotationsTableData);

const memoizedLoadFilteredTopInfluencers = memoize(loadFilteredTopInfluencers);

const memoizedLoadTopInfluencers = memoize(loadTopInfluencers);

export interface LoadExplorerDataConfig {
  influencersFilterQuery: InfluencersFilterQuery;
  lastRefresh: number;
  noInfluencersConfigured: boolean;
  selectedCells: AppStateSelectedCells | undefined | null;
  selectedJobs: ExplorerJob[];
  viewBySwimlaneFieldName: string;
}

export const isLoadExplorerDataConfig = (arg: any): arg is LoadExplorerDataConfig => {
  return (
    arg !== undefined &&
    arg.selectedJobs !== undefined &&
    arg.selectedJobs !== null &&
    arg.viewBySwimlaneFieldName !== undefined
  );
};

/**
 * Fetches the data necessary for the Anomaly Explorer using observables.
 */
const loadExplorerDataProvider = (
  mlApi: MlApi,
  mlResultsService: MlResultsService,
  anomalyExplorerChartsService: AnomalyExplorerChartsService,
  timefilter: TimefilterContract
) => {
  return (config: LoadExplorerDataConfig): Observable<Partial<ExplorerState>> => {
    if (!isLoadExplorerDataConfig(config)) {
      return of({});
    }

    const {
      lastRefresh,
      influencersFilterQuery,
      noInfluencersConfigured,
      selectedCells,
      selectedJobs,
      viewBySwimlaneFieldName,
    } = config;

    const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneFieldName);
    const jobIds = getSelectionJobIds(selectedCells, selectedJobs);

    const bounds = timefilter.getBounds() as Required<TimeRangeBounds>;

    const timerange = getSelectionTimeRange(selectedCells, bounds);

    // First get the data where we have all necessary args at hand using forkJoin:
    // annotationsData, anomalyChartRecords, influencers, overallState
    return forkJoin({
      overallAnnotations: memoizedLoadOverallAnnotations(lastRefresh, mlApi, selectedJobs, bounds),
      annotationsData: memoizedLoadAnnotationsTableData(
        lastRefresh,
        mlApi,
        selectedCells,
        selectedJobs,
        bounds
      ),
      anomalyChartRecords: anomalyExplorerChartsService.loadDataForCharts$(
        jobIds,
        timerange.earliestMs,
        timerange.latestMs,
        selectionInfluencers,
        selectedCells,
        influencersFilterQuery
      ),
      influencers:
        selectionInfluencers.length === 0
          ? memoizedLoadTopInfluencers(
              lastRefresh,
              mlResultsService,
              jobIds,
              timerange.earliestMs,
              timerange.latestMs,
              [],
              noInfluencersConfigured,
              influencersFilterQuery
            )
          : Promise.resolve({}),
    }).pipe(
      switchMap(({ overallAnnotations, anomalyChartRecords, influencers, annotationsData }) =>
        forkJoin({
          filteredTopInfluencers:
            (selectionInfluencers.length > 0 || influencersFilterQuery !== undefined) &&
            anomalyChartRecords !== undefined &&
            anomalyChartRecords.length > 0
              ? memoizedLoadFilteredTopInfluencers(
                  lastRefresh,
                  mlResultsService,
                  jobIds,
                  timerange.earliestMs,
                  timerange.latestMs,
                  anomalyChartRecords,
                  selectionInfluencers,
                  noInfluencersConfigured,
                  influencersFilterQuery
                )
              : Promise.resolve(influencers),
        }).pipe(
          map(({ filteredTopInfluencers }) => {
            return {
              overallAnnotations,
              annotations: annotationsData,
              influencers: filteredTopInfluencers as any,
              loading: false,
              anomalyChartsDataLoading: false,
            };
          })
        )
      )
    );
  };
};

export const useExplorerData = (): [
  Partial<ExplorerState> | undefined,
  (d: LoadExplorerDataConfig) => void
] => {
  const timefilter = useTimefilter();
  const mlApi = useMlApi();
  const { anomalyExplorerChartsService } = useAnomalyExplorerContext();

  const loadExplorerData = useMemo(() => {
    const mlResultsService = mlResultsServiceProvider(mlApi);

    return loadExplorerDataProvider(
      mlApi,
      mlResultsService,
      anomalyExplorerChartsService,
      timefilter
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExplorerData$ = useMemo(() => new Subject<LoadExplorerDataConfig>(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const explorerData$ = useMemo(() => loadExplorerData$.pipe(switchMap(loadExplorerData)), []);
  const explorerData = useObservable(explorerData$);

  const update = useCallback((c: LoadExplorerDataConfig) => {
    loadExplorerData$.next(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [explorerData, update];
};
