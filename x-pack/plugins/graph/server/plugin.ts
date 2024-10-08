/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { LicenseState } from './lib/license_state';
import { registerSearchRoute } from './routes/search';
import { registerExploreRoute } from './routes/explore';
import { registerSampleData } from './sample_data';
import { graphWorkspace } from './saved_objects';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { GraphStorage } from './content_management/graph_storage';

export class GraphPlugin implements Plugin {
  private licenseState: LicenseState | null = null;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    {
      licensing,
      home,
      features,
      contentManagement,
    }: {
      licensing: LicensingPluginSetup;
      home?: HomeServerPluginSetup;
      features?: FeaturesPluginSetup;
      contentManagement: ContentManagementServerSetup;
    }
  ) {
    const licenseState = new LicenseState();
    licenseState.start(licensing.license$);
    this.licenseState = licenseState;
    core.savedObjects.registerType(graphWorkspace);
    licensing.featureUsage.register('Graph', 'platinum');

    contentManagement.register({
      id: CONTENT_ID,
      storage: new GraphStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.initializerContext.logger.get(),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    if (home) {
      registerSampleData(home.sampleData, licenseState);
    }

    if (features) {
      features.registerKibanaFeature({
        id: 'graph',
        name: i18n.translate('xpack.graph.featureRegistry.graphFeatureName', {
          defaultMessage: 'Graph',
        }),
        order: 600,
        category: DEFAULT_APP_CATEGORIES.kibana,
        scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
        app: ['graph', 'kibana'],
        catalogue: ['graph'],
        minimumLicense: 'platinum',
        privileges: {
          all: {
            app: ['graph', 'kibana'],
            catalogue: ['graph'],
            savedObject: {
              all: ['graph-workspace'],
              read: ['index-pattern'],
            },
            ui: ['save', 'delete', 'show'],
          },
          read: {
            app: ['graph', 'kibana'],
            catalogue: ['graph'],
            savedObject: {
              all: [],
              read: ['index-pattern', 'graph-workspace'],
            },
            ui: ['show'],
          },
        },
      });
    }

    const router = core.http.createRouter();
    registerSearchRoute({ licenseState, router });
    registerExploreRoute({ licenseState, router });
  }

  public start(core: CoreStart, { licensing }: { licensing: LicensingPluginStart }) {
    this.licenseState!.setNotifyUsage(licensing.featureUsage.notifyUsage);
  }

  public stop() {
    if (this.licenseState) {
      this.licenseState.stop();
    }
  }
}
