import {
  CoreSetup,
  PluginInitializerContext,
  Plugin,
  PluginConfigDescriptor,
} from '@kbn/core/server';
import { mapConfigSchema } from '../common/config';
import type { DataShaderConfig } from '../common/config';
import { schema } from '@kbn/config-schema';

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
    const setVersion = (version:string) =>{
      const name = "acecard:plugin"+ this.constructor.name;
      const versionSettings:any = {}
      versionSettings[name] = {
        name,
        description: `Commit id and message for ${this.constructor.name} version readonly do not change`,
        category: ['acecard'],
        order: 1,
        type: 'string',
        value: version,
        readonly:false,
        requiresPageReload: false,
        schema: schema.string(),
      }
      core.uiSettings.register(versionSettings);
    }
    import("../common/version").then((version)=>{
      setVersion(version.version)
    }).catch(()=>{
      setVersion("UNKNOWN")
    })

    const mapConfig = this._initializerContext.config.get();
    return {
      config: mapConfig,
    };
  }

  public start() {}
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new DataShaderPlugin(initializerContext);
