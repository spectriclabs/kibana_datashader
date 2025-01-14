/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { MapsCustomRasterSourcePluginSetup, MapsCustomRasterSourcePluginStart } from './types';
import { DataShaderSource } from './classes/data_shader_source';
import { customRasterLayerWizard } from './classes/custom_raster_layer_wizard';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { setStartServices, setConfig, setAccsServices } from './kibana_services';
import type { DataShaderConfig } from '../config';

export class MapsCustomRasterSourcePlugin
  implements
    Plugin<void, void, MapsCustomRasterSourcePluginSetup, MapsCustomRasterSourcePluginStart>
{
  readonly _initializerContext: PluginInitializerContext<DataShaderConfig>;
  constructor(initializerContext: PluginInitializerContext<DataShaderConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<MapsCustomRasterSourcePluginStart>,
    { maps: mapsSetup,accsPlugin }: MapsCustomRasterSourcePluginSetup
  ) {
    // Register the Custom raster layer wizard with the Maps application
    mapsSetup.registerSource({
      type: DataShaderSource.type,
      ConstructorFunction: DataShaderSource,
    });
    mapsSetup.registerLayerWizard(customRasterLayerWizard);

    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      //@ts-ignore Deprecated in but still required in older versions. remove when we no longer support 8.15
      navLinkStatus: "hidden",
      visibleIn: [],
      mount: ({ history }) => {
        (async () => {
          const [coreStart] = await core.getStartServices();
          // if it's a regular navigation, open a new map
          if (history.action === 'PUSH') {
            coreStart.application.navigateToApp('maps', { path: 'map' });
          } else {
            coreStart.application.navigateToApp('developerExamples');
          }
        })();
        return () => {};
      },
    });
    setAccsServices(accsPlugin);
  }

  public start(core: CoreStart, plugins: MapsCustomRasterSourcePluginStart): void {
    const mapConfig = this._initializerContext.config.get<DataShaderConfig>();
    setConfig(mapConfig);
    setStartServices(core, plugins);
  }
  public stop() {}
}
