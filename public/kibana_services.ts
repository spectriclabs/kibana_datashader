import type { CoreStart } from '@kbn/core/public';
import { DataShaderConfig } from '../config';
import { accsPluginSetup } from '@kbn/accs_plugin/public/types';
import type { MapsCustomRasterSourcePluginStart } from './types';

let coreStart: CoreStart;
let pluginsStart: MapsCustomRasterSourcePluginStart;
let config: DataShaderConfig;
let accsPlugin:accsPluginSetup;
export const getTimeFilter = () => pluginsStart.data.query.timefilter.timefilter;
export function setStartServices(core: CoreStart, plugins: MapsCustomRasterSourcePluginStart) {
  coreStart = core;
  pluginsStart = plugins;
}
export const setConfig = (settings:DataShaderConfig) =>{
  config = settings
}

export const setAccsServices = (accs:accsPluginSetup) =>{
  accsPlugin = accs

}
export const getConfig = () => config
export const getIndexPatternService = () => pluginsStart.data.dataViews;
export const getToasts = () => coreStart.notifications.toasts;
export const getHttp = () => coreStart.http;
export const getIndexPatternSelectComponent = () =>
  pluginsStart.unifiedSearch.ui.IndexPatternSelect;

export const getIndexPatterns = (index:string)=> accsPlugin?.getIndexPatterns ? accsPlugin.getIndexPatterns(index): index