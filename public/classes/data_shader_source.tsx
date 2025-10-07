/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { FieldFormatter, MIN_ZOOM, MAX_ZOOM, FIELD_ORIGIN } from '@kbn/maps-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { v4 as uuid } from 'uuid';
import type {
  AbstractESSourceDescriptor,
  Attribution,
  DataRequestMeta,
  DynamicStylePropertyOptions,
  MapExtent,
  StyleMetaData,
  Timeslice,
  TooltipFeatureAction,
  VectorSourceRequestMeta,
} from '@kbn/maps-plugin/common/descriptor_types';

import type {
  BoundsRequestMeta,
  DataRequest,
  GeoJsonWithMeta,
  GetFeatureActionsArgs,
  IField,
  ImmutableSourceProperty,
  IRasterSource,
  ITooltipProperty,
  SourceEditorArgs,
  SourceStatus,
} from '@kbn/maps-plugin/public';

// import { AbstractSource } from '@kbn/maps-plugin/public/classes/sources/source';
// import { XYZTMSSource } from '@kbn/maps-plugin/public/classes/sources/xyz_tms_source';
// import { XYZTMSSource } from '../../../../x-pack/plugins/maps/public/classes/sources/xyz_tms_source';
import React from 'react';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { fromKueryExpression, luceneStringToDsl, Query, TimeRange, toElasticsearchQuery } from '@kbn/es-query';
// import { ESDocField } from '@kbn/maps-plugin/public/classes/fields/es_doc_field';
import { i18n } from '@kbn/i18n';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { OnSourceChangeArgs } from '@kbn/maps-plugin/public/classes/sources/source';
import _ from 'lodash';
import { RasterTileSource } from 'maplibre-gl';
import { GeoJsonProperties, Geometry, Position } from 'geojson';
import { RasterTileSourceData } from '@kbn/maps-plugin/public/classes/sources/raster_source';
import {
  DatashaderStyleEditor,
  DatashaderStylePropertiesDescriptor,
  DATASHADER_STYLES,
} from './ui/datashader_style';
import { getIndexPatterns, getIndexPatternService } from '../kibana_services';
import { AbstractField } from './fields/field';
import { DatashaderLegend } from './ui/datashader_legend';
const NUMBER_DATA_TYPES = ['number'];
export const CATEGORICAL_DATA_TYPES = ['string', 'ip', 'boolean'];
import { DATASHADER_BUCKET_SELECT } from './ui/datashader_legend';
import { IVectorStyle } from '@kbn/maps-plugin/public/classes/styles/vector/vector_style';
import { KibanaExecutionContext } from '@kbn/core/public';
import { IDynamicStyleProperty } from '@kbn/maps-plugin/public/classes/styles/vector/properties/dynamic_style_property';
import { SearchResponseWarning } from '@kbn/search-response-warnings';

const urlRe = /^(\w+):\/\/([^/?]*)(\/[^?]+)?\??(.+)?/;

function parseUrl(url: string) {
  const parts = url.match(urlRe);
  if (!parts) {
    throw new Error(`Unable to parse URL "${url}"`);
  }
  const paramParts = parts[4] ? parts[4].split('&') : [];
  const params: any = {};
  paramParts.forEach((p) => {
    const [key, value] = p.split('=');
    params[key] = decodeURIComponent(value);
  });
  return {
    protocol: parts[1],
    authority: parts[2],
    path: parts[3] || '/',
    params,
  };
}

export type DataShaderSourceDescriptor = AbstractESSourceDescriptor & {
  name: string;
  urlTemplate: string;
  indexTitle: string;
  timeFieldName: string;
  attributionText: string;
  attributionUrl: string;
  indexPatternId: string;
  geoField: string;
  geoType: string;
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
} & DatashaderStylePropertiesDescriptor;
export interface DatashaderSourceConfig {
  urlTemplate: string;
  indexTitle: string;
  indexPatternId: string;
  timeFieldName: string;
  geoField: string;
  geoType?: string;
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
}

const defaultStyle = {
  [DATASHADER_STYLES.TIME_OVERLAP]: false,
  [DATASHADER_STYLES.TIME_OVERLAP_SIZE]: 'auto',
  [DATASHADER_STYLES.COLOR_RAMP_NAME]: 'bmy',
  [DATASHADER_STYLES.COLOR_KEY_NAME]: 'glasbey_light',
  [DATASHADER_STYLES.SPREAD]: 'auto',
  [DATASHADER_STYLES.SPAN_RANGE]: 'normal',
  [DATASHADER_STYLES.GRID_RESOLUTION]: 'finest',
  [DATASHADER_STYLES.MODE]: 'heat',
  [DATASHADER_STYLES.CATEGORY_FIELD]: '',
  [DATASHADER_STYLES.CATEGORY_FIELD_TYPE]: null,
  [DATASHADER_STYLES.CATEGORY_FIELD_PATTERN]: null,
  [DATASHADER_STYLES.SHOW_ELLIPSES]: false,
  [DATASHADER_STYLES.USE_HISTOGRAM]: undefined,
  [DATASHADER_STYLES.ELLIPSE_MAJOR_FIELD]: '',
  [DATASHADER_STYLES.ELLIPSE_MINOR_FIELD]: '',
  [DATASHADER_STYLES.ELLIPSE_TILT_FIELD]: '',
  [DATASHADER_STYLES.ELLIPSE_UNITS]: 'semi_majmin_nm',
  [DATASHADER_STYLES.ELLIPSE_SEARCH_DISTANCE]: 'normal',
  [DATASHADER_STYLES.ELLIPSE_THICKNESS]: 0,
  [DATASHADER_STYLES.MANUAL_RESOLUTION]: false,
} as DatashaderStylePropertiesDescriptor;
export interface IDataShaderSource extends IRasterSource {
  getIndexPattern(): Promise<DataView>;
  getStyleUrlParams(data: DatashaderStylePropertiesDescriptor): string;
  getMap(): any | undefined;
}

export class DataShaderSource implements IDataShaderSource {
  static type = 'DATA_SHADER';

  readonly _descriptor: DataShaderSourceDescriptor;
  _requestMeta: DataRequestMeta | undefined;
  indexPattern: any;
  _previousSource: any;

  map: any | undefined;
  static createDescriptor(settings: DatashaderSourceConfig): DataShaderSourceDescriptor {
    return {
      id: `DataShader-${uuid()}`,
      urlTemplate: settings.urlTemplate,
      indexTitle: settings.indexTitle,
      timeFieldName: settings.timeFieldName,
      type: DataShaderSource.type,
      name: "Datashader",
      indexPatternId: settings.indexPatternId,
      geoField: settings.geoField,
      geoType: settings.geoType,
      applyGlobalQuery: settings.applyGlobalQuery || true,
      applyGlobalTime: settings.applyGlobalTime || true,
      ...defaultStyle,
    } as DataShaderSourceDescriptor;
  }

  constructor(sourceDescriptor: DataShaderSourceDescriptor) {
    this._descriptor = sourceDescriptor;
  }

  async loadStylePropsMeta({ layerName, style, dynamicStyleProps, registerCancelCallback, sourceQuery, timeFilters, searchSessionId, inspectorAdapters, executionContext, }:
    {
      layerName: string;
      style: IVectorStyle;
      dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
      registerCancelCallback: (callback: () => void) => void;
      sourceQuery?: Query;
      timeFilters: TimeRange;
      searchSessionId?: string;
      inspectorAdapters: Adapters;
      executionContext: KibanaExecutionContext;
    }): Promise<{ styleMeta: StyleMetaData; warnings: SearchResponseWarning[]; }> {
    // I think this is intended to be where the requests to the backend are called to gather the dictionary or ranges instead of within the legend object.
    // I also do not see where to acquire the query and filter information outside of this
    
    this._requestMeta = {
      timeFilters: timeFilters,
      sourceQuery: sourceQuery,
    };
    const categoryField = this._descriptor.categoryField;
    const styleMap: { [key: string]: any } = {};
    const styleMeta: StyleMetaData = { categoryField: { min: 0, max: 1, avg: 0.5, std_deviation: 1 } };
    styleMap[categoryField] = styleMeta;
    return { styleMeta: styleMeta, warnings: [] };
  }

  getId() {
    return this._descriptor.id;
  }

  getMap() {
    return this.map;
  }

  async hasLegendDetails(): Promise<boolean> {
    return true;
  }

  supportsJoins() {
    return false
  }

  getInspectorRequestIds() {
    return []
  }

  renderLegendDetails(dataRequest: DataRequest): ReactElement<any> | null {
    if (!dataRequest) {
      return null;
    }
    return (
      <DatashaderLegend
        sourceDescriptorUrlTemplate={this._descriptor.urlTemplate}
        sourceDescriptorIndexTitle={this._descriptor.indexTitle}
        styleDescriptorCategoryField={this._descriptor.categoryField}
        style={this}
        sourceDataRequest={dataRequest}
      />
    );
  }

  isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean {
    this.map = mbSource.map;
    // TODO calculate if the layer needs to be removed and refreshed color changed or ellipses turned on
    if (!mbSource.tiles || mbSource.tiles[0] === '') {
      this._previousSource = sourceData.url;
      return true;
    }
    const unhashedParams = ['zoom', 'extent'];
    try {
      const pastURL = parseUrl(mbSource.tiles[0]);
      const pastParams = pastURL.params;
      pastParams.params = JSON.parse(pastParams.params);
      const newURL = parseUrl(sourceData.url);
      if (newURL.path !== pastURL.path) {
        return true; // the index pattern is different and we need to refresh.
      }
      const newParams = newURL.params;
      newParams.params = JSON.parse(newParams.params);
      unhashedParams.forEach((p) => {
        delete pastParams.params[p];
        delete newParams.params[p];
      });
      this._previousSource = sourceData.url;
      return JSON.stringify(pastParams) !== JSON.stringify(newParams);
    } catch (error) {
      if (mbSource.tiles && mbSource.tiles[0] === sourceData.url) {
        return false; // if we are still loading and are using a dataurl
      }
      return true; // url didn't parse correctly and needs to be refreshed
    }
  }

  cloneDescriptor(): DataShaderSourceDescriptor {
    return {
      ...this._descriptor,
    };
  }

  async supportsFitToBounds(): Promise<boolean> {
    return false;
  }

  async canSkipSourceUpdate(
    dataRequest: DataRequest,
    nextRequestMeta: DataRequestMeta
  ): Promise<boolean> {
    return false;
  }

  /**
   * return list of immutable source properties.
   * Immutable source properties are properties that can not be edited by the user.
   */
  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [];
  }

  getType(): string {
    return this._descriptor.type;
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.name;
  }

  getAttributionProvider(): (() => Promise<Attribution[]>) | null {
    return null;
  }

  isFieldAware(): boolean {
    return true;
  }

  isGeoGridPrecisionAware(): boolean {
    return true;
  }

  isQueryAware(): boolean {
    return true;
  }
  getGeoFieldName(): string {
    return this._descriptor.geoField || '';
  }

  getGeoField() {
    return this._descriptor.geoField;
  }

  getFieldNames(): string[] {
    return [];
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null {
    return (
      <DatashaderStyleEditor
        handlePropertyChange={(settings: Partial<DatashaderStylePropertiesDescriptor>): void => {
          // throw new Error('Function not implemented.');
          const args = Object.entries(settings).map(
            (v) => ({ propName: v[0], value: v[1] } as OnSourceChangeArgs)
          );
          // let args = Object.keys(settings).map(key=>({propName:key,value:settings[key] as any} as OnSourceChangeArgs))
          sourceEditorArgs.onChange(...args);
        }}
        layer={this}
        properties={this._descriptor}
      />
    );
  }

  getApplyGlobalQuery(): boolean {
    return this._descriptor.applyGlobalQuery;
  }

  getApplyGlobalTime(): boolean {
    return this._descriptor.applyGlobalTime;
  }

  getApplyForceRefresh(): boolean {
    return true;
  }

  isMvt() {
    return false;
  }

  isBoundsAware(): boolean {
    return false;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  async getFields(): Promise<IField[]> {
    return [];
  }

  async getLeftJoinFields(): Promise<IField[]> {
    return [];
  }

  getJoinsDisabledReason(): string | null {
    return null;
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    throw new Error('Should implement VectorSource#getGeoJson');
  }

  hasTooltipProperties() {
    return false;
  }

  // Allow source to filter and format feature properties before displaying to user
  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    return [];
  }

  showJoinEditor() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [];
  }

  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus {
    return { tooltipContent: null, areResultsTrimmed: false };
  }

  getSyncMeta(): object | null {
    return null;
  }

  async getTimesliceMaskFieldName(): Promise<string | null> {
    return null;
  }

  async addFeature(
    geometry: Geometry | Position[]
  ) {
    throw new Error('Should implement VectorSource#addFeature');
  }

  async deleteFeature(featureId: string): Promise<void> {
    throw new Error('Should implement VectorSource#deleteFeature');
  }

  async supportsFeatureEditing(): Promise<boolean> {
    return false;
  }
  async getDefaultFields(): Promise<Record<string, Record<string, string>>> {
    return {};
  }
  getFeatureActions(args: GetFeatureActionsArgs): TooltipFeatureAction[] {
    // Its not possible to filter by geometry for vector tile sources since there is no way to get original geometry
    return [];
  }

  async getCategoricalFields(): Promise<Array<{ field: DataViewField; format: FieldFormat }>> {
    try {
      const indexPattern = await this.getIndexPattern();
      const aggFields: Array<{ field: DataViewField; format: FieldFormat }> = [];

      CATEGORICAL_DATA_TYPES.forEach((dataType) => {
        indexPattern.fields.getByType(dataType).forEach((field: any) => {
          if (field.aggregatable) {
            aggFields.push({ field, format: indexPattern.getFormatterForField(field) });
          }
        });
      });

      NUMBER_DATA_TYPES.forEach((dataType) => {
        indexPattern.fields.getByType(dataType).forEach((field: any) => {
          aggFields.push({ field, format: indexPattern.getFormatterForField(field) });
        });
      });

      return aggFields;
    } catch (error) {
      return [];
    }
  }

  async getNumberFields(): Promise<Array<{ field: DataViewField; format: FieldFormat }>> {
    try {
      const indexPattern = await this.getIndexPattern();
      const numberFields: Array<{ field: DataViewField; format: FieldFormat }> = [];

      NUMBER_DATA_TYPES.forEach((dataType) => {
        indexPattern.fields.getByType(dataType).forEach((field: any) => {
          numberFields.push({ field, format: indexPattern.getFormatterForField(field) });
        });
      });
      return numberFields;
    } catch (error) {
      return [];
    }
  }
  getIndexPatternId(): string {
    return this._descriptor.indexPatternId;
  }

  getIndexPatternIds(): string[] {
    return [this._descriptor.indexPatternId];
  }
  async getIndexPattern(): Promise<DataView> {
    if (this.indexPattern) {
      return this.indexPattern;
    }

    try {
      this.indexPattern = await getIndexPatternService().get(this._descriptor.indexPatternId);
      return this.indexPattern;
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noIndexPatternErrorMessage', {
          defaultMessage: `Unable to find Index pattern for id: ${this._descriptor.indexPatternId}`,
          values: { indexPatternId: this._descriptor.indexPatternId },
        })
      );
    }
  }

  async getFieldFormatter(field: IField): Promise<FieldFormat | null> {
    let indexPattern;

    try {
      indexPattern = await this.getIndexPattern();
    } catch (error) {
      return null;
    }

    const fieldFromIndexPattern = indexPattern.fields.getByName(field.getRootName());

    if (!fieldFromIndexPattern) {
      return null;
    }

    return indexPattern.getFormatterForField(fieldFromIndexPattern);
  }

  getQueryableIndexPatternIds(): string[] {
    return [];
  }

  getGeoGridPrecision(zoom: number): number {
    return 0;
  }

  isESSource(): boolean {
    return true;
  }

  // Returns function used to format value
  async createFieldFormatter(field: IField): Promise<FieldFormatter | null> {
    return null;
  }

  async getValueSuggestions(field: IField, query: string): Promise<string[]> {
    return [];
  }

  async isTimeAware(): Promise<boolean> {
    return true;
  }

  isFilterByMapBounds(): boolean {
    return true;
  }

  getMinZoom(): number {
    return MIN_ZOOM;
  }

  getMaxZoom(): number {
    return MAX_ZOOM;
  }

  async getLicensedFeatures(): Promise<[]> {
    return [];
  }

  getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean {
    return false;
  }
  getStyleUrlParams(data: DatashaderStylePropertiesDescriptor) {
    let urlParams = '';
    // Check to see if the legend changed any params. (kinda a hacky way to do this but the layer descriptor cannot be changed unless editing)
    // eslint-disable-next-line @typescript-eslint/naming-convention
    let bucket_select = DATASHADER_BUCKET_SELECT[this._descriptor.id];
    if (!bucket_select) {
      bucket_select = [0, 100]; // use the full range if not specified
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [bucket_min, bucket_max] = bucket_select;
    // the current implementation of auto is too slow, so remove it
    const span = data.spanRange;
    // if (span === "auto") {
    //  span = "normal";
    // }

    urlParams = urlParams.concat(
      '&span=',
      span,
      '&bucket_min=',
      bucket_min,
      '&bucket_max=',
      bucket_max,
    );

    if (
      data.showEllipses &&
      data.ellipseMajorField &&
      data.ellipseMinorField &&
      data.ellipseTiltField
    ) {
      urlParams = urlParams.concat(
        '&ellipses=',
        data.showEllipses.toString(),
        '&ellipse_major=',
        data.ellipseMajorField,
        '&ellipse_minor=',
        data.ellipseMinorField,
        '&ellipse_tilt=',
        data.ellipseTiltField,
        '&ellipse_units=',
        data.ellipseUnits,
        '&ellipse_search=',
        data.ellipseSearchDistance,
        '&spread=',
        data.ellipseThickness.toString(),
        '&timeOverlap=',
        data.timeOverlap.toString(),
        '&timeOverlapSize=',
        data.timeOverlapSize
      );
    } else {
      urlParams = urlParams.concat(
        '&spread=',
        data.spread,
        '&resolution=',
        data.gridResolution,
        '&timeOverlap=',
        data.timeOverlap.toString(),
        '&timeOverlapSize=',
        data.timeOverlapSize
      );
    }

    if (data.mode === 'heat') {
      urlParams = urlParams.concat('&cmap=', data.colorRampName);
    } else if (
      data.mode === 'category' &&
      data.categoryField &&
      data.categoryFieldType &&
      data.colorKeyName
    ) {
      urlParams = urlParams.concat(
        '&category_field=',
        data.categoryField,
        '&category_type=',
        data.categoryFieldType,
        '&cmap=',
        data.colorKeyName
      );
      if (data.useHistogram === true) {
        urlParams = urlParams.concat('&category_histogram=true');
      } else if (data.useHistogram === false) {
        urlParams = urlParams.concat('&category_histogram=false');
      }

      if (data) {
        const pattern = data.categoryFieldPattern ? data.categoryFieldPattern : null;
        urlParams = urlParams.concat('&category_pattern=', pattern || 'null');
      }
    }

    return urlParams;
  }
  async getUrlTemplate(dataFilters: DataRequestMeta): Promise<string> {
    try {
      const data: DataRequestMeta & DataShaderSourceDescriptor = { ...dataFilters, ...this._descriptor };
      const urlCheck = new URL(this._descriptor.urlTemplate);
      if (urlCheck.origin === 'null') {
        return NOT_SETUP; // Must return a url to an image or it throws errors so we return a 256x256 blank data uri
      }
      const indexTitle: string = _.get(data, 'indexTitle', '');
      const geoField: string = _.get(data, 'geoField', '');
      const timeFieldName: string = _.get(data, 'timeFieldName', '');
      const dataUrl: string = _.get(data, 'urlTemplate', '');
      const applyGlobalQuery: boolean = _.get(data, 'applyGlobalQuery', true);
      const applyGlobalTime: boolean = _.get(data, 'applyGlobalTime', true);
      if (indexTitle.length === 0) {
        return NOT_SETUP;
      }

      if (geoField.length === 0) {
        return NOT_SETUP;
      }

      if (timeFieldName.length === 0) {
        return NOT_SETUP;
      }

      if (dataUrl.length === 0) {
        return NOT_SETUP;
      }

      let currentParams = '';
      const dataMeta = data;

      if (dataMeta) {
        const currentParamsObj: any = {};

        if (applyGlobalTime) {
          currentParamsObj.timeFilters = dataMeta.timeFilters;
        }
        //Timeslider is in use and should override the time filters
        if (dataMeta.timeslice) {
          currentParamsObj.timeFilters = { to: (new Date(dataMeta.timeslice.to)).toISOString(), from: (new Date(dataMeta.timeslice.from)).toISOString() };
        }
        currentParamsObj.filters = [];

        if (applyGlobalQuery) {
          const dataMetaFilters = dataMeta.filters || [];
          currentParamsObj.filters = [...dataMetaFilters];

          if (dataMeta.query && dataMeta.query.language === 'kuery') {
            const kueryNode = fromKueryExpression(dataMeta.query.query);
            const kueryDSL = toElasticsearchQuery(kueryNode);
            currentParamsObj.query = {
              language: 'dsl',
              query: kueryDSL,
            };
          } else if (dataMeta.query && dataMeta.query.language === 'lucene') {
            const luceneDSL = luceneStringToDsl(dataMeta.query.query);
            currentParamsObj.query = {
              language: 'dsl',
              query: luceneDSL,
            };
          } else {
            currentParamsObj.query = dataMeta.query;
          }
        }

        currentParamsObj.extent = dataMeta.extent; // .buffer has been expanded to align with tile boundaries
        currentParamsObj.zoom = dataMeta.zoom;

        if (data.sourceQuery) {
          if (data.sourceQuery.language === 'kuery') {
            const kueryNode = fromKueryExpression(data.sourceQuery.query);
            const kueryDSL = toElasticsearchQuery(kueryNode);
            currentParamsObj.filters.push({
              meta: {
                type: 'bool',
              },
              query: kueryDSL,
            });
          } else if (data.sourceQuery.language === 'lucene') {
            const luceneDSL = luceneStringToDsl(data.sourceQuery.query);
            currentParamsObj.filters.push({
              meta: {
                type: 'bool',
              },
              query: luceneDSL,
            });
          }
        }

        currentParams = currentParams.concat(
          'params=',
          encodeURIComponent(JSON.stringify(currentParamsObj)),
          '&timestamp_field=',
          timeFieldName,
          '&geopoint_field=',
          geoField,
          '&geofield_type=',
          data.geoType,
          this.getStyleUrlParams(data)
        );
      }
      const indexPattern = getIndexPatterns(indexTitle)
      const url = dataUrl.concat('/tms/', indexPattern, '/{z}/{x}/{y}.png?', currentParams);
      return url;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(error);
      return NOT_SETUP;
    }
  }
}

const NOT_SETUP =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAQAAAD2e2DtAAABu0lEQVR42u3SQREAAAzCsOHf9F6oIJXQS07TxQIABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAgAACwAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAAsAEAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAKg9kK0BATSHu+YAAAAASUVORK5CYII='; // empty image
