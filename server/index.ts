import {
    CoreSetup,
    PluginInitializerContext,
    Plugin,
    PluginConfigDescriptor,
  } from '@kbn/core/server';
import {mapConfigSchema} from '../config';
import type { DataShaderConfig, } from '../config';

export const config: PluginConfigDescriptor<DataShaderConfig> = {
    exposeToBrowser: {
      url: true,
      defaultGeospatialField: true,
      defaultEllipseMajor: true,
      defaultEllipseMinor: true,
      defaultEllipseTilt: true,
    },
    schema: mapConfigSchema,
  };
  

  export interface DataShaderPluginServerSetup {
    config: DataShaderConfig;

  }
  
export class DataShaderPlugin implements Plugin<DataShaderPluginServerSetup> {
    readonly _initializerContext: PluginInitializerContext<DataShaderConfig>;
  
    constructor(initializerContext: PluginInitializerContext<DataShaderConfig>) {
      this._initializerContext = initializerContext;
    }
  
    public setup(core: CoreSetup) {
      const mapConfig = this._initializerContext.config.get();
      return {
        config: mapConfig,
      };
    }
  
    public start() {}
  }
  
  export const plugin = (initializerContext: PluginInitializerContext) =>
    new DataShaderPlugin(initializerContext);
  