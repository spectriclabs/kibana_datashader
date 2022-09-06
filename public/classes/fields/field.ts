/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsExtendedStatsAggregation,
  AggregationsPercentilesAggregation,
  AggregationsTermsAggregation,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Filter } from '@kbn/es-query';
import { TileMetaFeature } from '@kbn/maps-plugin//common/descriptor_types';

import { FIELD_ORIGIN, } from '@kbn/maps-plugin/common';
import { IField, ITooltipProperty, IVectorSource } from '@kbn/maps-plugin/public';
import _ from 'lodash';

export class TooltipProperty implements ITooltipProperty {
  private readonly _propertyKey: string;
  private readonly _rawValue: string | string[] | undefined;
  private readonly _propertyName: string;

  constructor(propertyKey: string, propertyName: string, rawValue: string | string[] | undefined) {
    this._propertyKey = propertyKey;
    this._propertyName = propertyName;
    this._rawValue = rawValue;
  }

  getPropertyKey(): string {
    return this._propertyKey;
  }

  getPropertyName(): string {
    return this._propertyName;
  }

  getHtmlDisplayValue(): string {
    return _.escape(Array.isArray(this._rawValue) ? this._rawValue.join() : this._rawValue);
  }

  getRawValue(): string | string[] | undefined {
    return this._rawValue;
  }

  isFilterable(): boolean {
    return false;
  }

  async getESFilters(): Promise<Filter[]> {
    return [];
  }
}


export class AbstractField implements IField {
  private readonly _fieldName: string;
  private readonly _origin: FIELD_ORIGIN;
  private _source: IVectorSource;

  constructor({ fieldName, origin,source }: { fieldName: string; origin: FIELD_ORIGIN; source: IVectorSource; }) {
    this._fieldName = fieldName;
    this._origin = origin;
    this._source = source;
  }
  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    const label = await this.getLabel();
    return new TooltipProperty(this.getName(), label, value);
  }

  supportsFieldMetaFromEs(): boolean {
    throw new Error('must implement AbstractField#supportsFieldMetaFromEs');
  }

  supportsFieldMetaFromLocalData(): boolean {
    throw new Error('must implement AbstractField#supportsFieldMetaFromLocalData');
  }

  getName(): string {
    return this._fieldName;
  }

  getMbFieldName(): string {
    return this.getName();
  }

  getRootName(): string {
    return this.getName();
  }

  canValueBeFormatted(): boolean {
    return false;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  isValid(): boolean {
    return !!this._fieldName;
  }

  async getDataType(): Promise<string> {
    return 'string';
  }

  async getLabel(): Promise<string> {
    return this._fieldName;
  }


  getOrigin(): FIELD_ORIGIN {
    return this._origin;
  }

  async getExtendedStatsFieldMetaRequest(): Promise<Record<
    string,
    { extended_stats: AggregationsExtendedStatsAggregation }
  > | null> {
    return null;
  }

  async getPercentilesFieldMetaRequest(
    percentiles: number[]
  ): Promise<Record<string, { percentiles: AggregationsPercentilesAggregation }> | null> {
    return null;
  }

  async getCategoricalFieldMetaRequest(
    size: number
  ): Promise<Record<string, { terms: AggregationsTermsAggregation }> | null> {
    return null;
  }

  isEqual(field: IField) {
    return this._origin === field.getOrigin() && this._fieldName === field.getName();
  }

  pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature) {
    return null;
  }

  isCount() {
    return false;
  }
}
