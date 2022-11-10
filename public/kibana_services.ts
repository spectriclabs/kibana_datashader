import type { CoreStart } from '@kbn/core/public';
import { DataShaderConfig } from '../config';

import type { MapsCustomRasterSourcePluginStart } from './types';

let coreStart: CoreStart;
let pluginsStart: MapsCustomRasterSourcePluginStart;
let config: DataShaderConfig;
export const getTimeFilter = () => pluginsStart.data.query.timefilter.timefilter;
export function setStartServices(core: CoreStart, plugins: MapsCustomRasterSourcePluginStart) {
  coreStart = core;
  pluginsStart = plugins;
}
export const setConfig = (settings:DataShaderConfig) =>{
  config = settings
}
export const getConfig = () => config
export const getIndexPatternService = () => pluginsStart.data.dataViews;
export const getToasts = () => coreStart.notifications.toasts;
export const getHttp = () => coreStart.http;
export const getIndexPatternSelectComponent = () =>
  pluginsStart.unifiedSearch.ui.IndexPatternSelect;