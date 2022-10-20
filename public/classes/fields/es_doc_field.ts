/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/public';
import { indexPatterns } from '@kbn/data-plugin/public';
import type {
  AggregationsExtendedStatsAggregation,
  AggregationsPercentilesAggregation,
  AggregationsTermsAggregation,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {FIELD_ORIGIN } from '@kbn/maps-plugin/common';


import {  AbstractField, TooltipProperty } from './field';
//import { IESSource } from '../sources/es_source';

import type {
  IField,
  ITooltipProperty,
} from '@kbn/maps-plugin/public';
import { IDataShaderSource } from '../data_shader_source';
//import { ESTooltipProperty } from '@kbn/maps-plugin/public/classes/tooltips/es_tooltip_property';
export class ESDocField extends AbstractField implements IField {
  private __source: IDataShaderSource;
  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IDataShaderSource;
    origin: FIELD_ORIGIN;
  }) {
    super({ fieldName, origin,source });
    this.__source = source
  }
  getSource(): IDataShaderSource {
    return this.__source
  }
  supportsFieldMetaFromEs(): boolean {
    return true;
  }

  supportsFieldMetaFromLocalData(): boolean {
    // Elasticsearch vector tile search API does not return meta tiles for documents
    return !this.getSource().isMvt();
  }

  canValueBeFormatted(): boolean {
    return true;
  }



  async _getIndexPatternField(): Promise<DataViewField | undefined> {
    const source = this.getSource()
    const indexPattern = await source.getIndexPattern();
    const indexPatternField = indexPattern.fields.getByName(this.getName());
    return indexPatternField && indexPatterns.isNestedField(indexPatternField)
      ? undefined
      : indexPatternField;
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
   // const source = this.getSource()
    //const indexPattern = await source.getIndexPattern();
    const tooltipProperty = new TooltipProperty(this.getName(), await this.getLabel(), value);
    return tooltipProperty
  }

  async getDataType(): Promise<string> {
    const indexPatternField = await this._getIndexPatternField();
    return indexPatternField ? indexPatternField.type : '';
  }

  async getLabel(): Promise<string> {
    const indexPatternField = await this._getIndexPatternField();
    return indexPatternField && indexPatternField.displayName
      ? indexPatternField.displayName
      : super.getLabel();
  }

  async getExtendedStatsFieldMetaRequest(): Promise<Record<
    string,
    { extended_stats: AggregationsExtendedStatsAggregation }
  > | null> {
    const indexPatternField = await this._getIndexPatternField();

    if (
      !indexPatternField ||
      (indexPatternField.type !== 'number' && indexPatternField.type !== 'date')
    ) {
      return null;
    }

    const metricAggConfig: AggregationsExtendedStatsAggregation = {};
    if (indexPatternField.scripted && indexPatternField.script) {
      metricAggConfig.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      metricAggConfig.field = this.getName();
    }
    return {
      [`${this.getName()}_range`]: {
        extended_stats: metricAggConfig,
      },
    };
  }

  async getPercentilesFieldMetaRequest(
    percentiles: number[]
  ): Promise<Record<string, { percentiles: AggregationsPercentilesAggregation }> | null> {
    const indexPatternField = await this._getIndexPatternField();

    if (!indexPatternField || indexPatternField.type !== 'number') {
      return null;
    }

    const metricAggConfig: AggregationsPercentilesAggregation = {
      percents: [0, ...percentiles],
    };
    if (indexPatternField.scripted && indexPatternField.script) {
      metricAggConfig.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      metricAggConfig.field = this.getName();
    }
    return {
      [`${this.getName()}_percentiles`]: {
        percentiles: metricAggConfig,
      },
    };
  }

  async getCategoricalFieldMetaRequest(
    size: number
  ): Promise<Record<string, { terms: AggregationsTermsAggregation }> | null> {
    const indexPatternField = await this._getIndexPatternField();
    if (!indexPatternField || size <= 0) {
      return null;
    }

    const topTerms: AggregationsTermsAggregation = { size };
    if (indexPatternField.scripted && indexPatternField.script) {
      topTerms.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      topTerms.field = this.getName();
    }
    return {
      [`${this.getName()}_terms`]: {
        terms: topTerms,
      },
    };
  }
}
