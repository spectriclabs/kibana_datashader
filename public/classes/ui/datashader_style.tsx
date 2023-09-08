/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { ChangeEvent, Component, Fragment } from 'react';
import {
  EuiFormRow,
  EuiSuperSelect,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiHorizontalRule,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { indexPatterns } from '@kbn/data-plugin/public';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { DatashaderUrlEditorField } from './datashader_url_editor_field';
import { getIndexPatternService, getTimeFilter } from '../../kibana_services';
import { SingleFieldSelect } from './single_field_select';
import { DataShaderSourceDescriptor } from '../data_shader_source';

import { DataShaderSource } from '../data_shader_source';
import { DatashaderGeoIndexEditorField } from './datashader_geo_index_editor_field';
import { DatashaderGeoFieldEditorField } from './datashader_geo_field_editor_field';
import { ES_GEO_FIELD_TYPE } from './geo_index_pattern_select';
import { DEFAULT_MAX_RESULT_WINDOW, loadIndexDocCount } from './util/load_index_doc_count';

export const DEFAULT_DATASHADER_COLOR_RAMP_NAME = 'bmy';

export const DEFAULT_DATASHADER_COLOR_KEY_NAME = 'glasbey_light';

export const DATASHADER_COLOR_RAMP_LABEL = i18n.translate('xpack.maps.heatmap.colorRampLabel', {
  defaultMessage: 'Color range',
});

export const DATASHADER_COLOR_KEY_LABEL = i18n.translate('xpack.maps.heatmap.colorKeyLabel', {
  defaultMessage: 'Color key',
});

export enum DATASHADER_STYLES {
  TIME_OVERLAP = 'timeOverlap',
  TIME_OVERLAP_SIZE = 'timeOverlapSize',
  COLOR_RAMP_NAME = 'colorRampName',
  COLOR_KEY_NAME = 'colorKeyName',
  SPREAD = 'spread',
  SPAN_RANGE = 'spanRange',
  GRID_RESOLUTION = 'gridResolution',
  MODE = 'mode',
  CATEGORY_FIELD = 'categoryField',
  CATEGORY_FIELD_TYPE = 'categoryFieldType',
  CATEGORY_FIELD_PATTERN = 'categoryFieldPattern',
  SHOW_ELLIPSES = 'showEllipses',
  USE_HISTOGRAM = 'useHistogram',
  ELLIPSE_MAJOR_FIELD = 'ellipseMajorField',
  ELLIPSE_MINOR_FIELD = 'ellipseMinorField',
  ELLIPSE_TILT_FIELD = 'ellipseTiltField',
  ELLIPSE_UNITS = 'ellipseUnits',
  ELLIPSE_SEARCH_DISTANCE = 'ellipseSearchDistance',
  ELLIPSE_THICKNESS = 'ellipseThickness',
  MANUAL_RESOLUTION = 'manualResolution',
}

export interface DatashaderStylePropertiesDescriptor {
  [DATASHADER_STYLES.COLOR_RAMP_NAME]: string;
  [DATASHADER_STYLES.COLOR_KEY_NAME]: string;
  [DATASHADER_STYLES.SPREAD]: string;
  [DATASHADER_STYLES.SPAN_RANGE]: string;
  [DATASHADER_STYLES.GRID_RESOLUTION]: string;
  [DATASHADER_STYLES.MODE]: string;
  [DATASHADER_STYLES.CATEGORY_FIELD]: string;
  [DATASHADER_STYLES.CATEGORY_FIELD_TYPE]: string | null;
  [DATASHADER_STYLES.CATEGORY_FIELD_PATTERN]: string | null;
  [DATASHADER_STYLES.SHOW_ELLIPSES]: boolean;
  [DATASHADER_STYLES.TIME_OVERLAP]: boolean;
  [DATASHADER_STYLES.TIME_OVERLAP_SIZE]: string;
  [DATASHADER_STYLES.USE_HISTOGRAM]: boolean | undefined;
  [DATASHADER_STYLES.ELLIPSE_MAJOR_FIELD]: string;
  [DATASHADER_STYLES.ELLIPSE_MINOR_FIELD]: string;
  [DATASHADER_STYLES.ELLIPSE_TILT_FIELD]: string;
  [DATASHADER_STYLES.ELLIPSE_UNITS]: string;
  [DATASHADER_STYLES.ELLIPSE_SEARCH_DISTANCE]: string;
  [DATASHADER_STYLES.ELLIPSE_THICKNESS]: number;
  [DATASHADER_STYLES.MANUAL_RESOLUTION]: boolean;
}
function filterGeoField(field: DataViewField) {
  return [ES_GEO_FIELD_TYPE.GEO_POINT.valueOf(), ES_GEO_FIELD_TYPE.GEO_SHAPE.valueOf()].includes(
    field.type
  );
}
const colorRampColors = [
  'bmy',
  'fire',
  'colorwheel',
  'isolum',
  'gray',
  'bkr',
  'bgy',
  'dimgray',
  'bky',
  'bgyw',
  'coolwarm',
  'kbc',
  'kb',
  'gwv',
  'blues',
  'kg',
  'bjy',
  'bmw',
  'kr',
  'rainbow',
  'cwr',
  'kgy',
];

const colorRampOptions = colorRampColors.map((c) => ({ value: c, text: c, inputDisplay: c }));

const colorKeyColors = [
  'glasbey_light',
  'glasbey_bw',
  'glasbey',
  'glasbey_cool',
  'glasbey_warm',
  'glasbey_dark',
  'glasbey_category10',
  'glasbey_hv',
  'hv',
  'category10',
  'kibana5',
];

const colorKeyOptions = colorKeyColors.map((c) => ({ value: c, text: c, inputDisplay: c }));

const spanRangeOptions = [
  {
    value: 'auto',
    text: 'Automatic (slower)',
  },
  {
    value: 'flat',
    text: 'Flat',
  },
  {
    value: 'narrow',
    text: 'Narrow',
  },
  {
    value: 'normal',
    text: 'Normal',
  },
  {
    value: 'wide',
    text: 'Wide',
  },
];

const spreadRangeOptions = [
  {
    value: 'auto',
    text: 'Automatic',
  },
  {
    value: 'large',
    text: 'Large',
  },
  {
    value: 'medium',
    text: 'Medium',
  },
  {
    value: 'small',
    text: 'Small',
  },
];

const thicknessRangeOptions = [
  {
    value: 0,
    text: 'Thin',
  },
  {
    value: 1,
    text: 'Medium',
  },
  {
    value: 3,
    text: 'Thick',
  },
];

const gridResolutionOptions = [
  {
    value: 'coarse',
    text: 'Coarse',
  },
  {
    value: 'fine',
    text: 'Fine',
  },
  {
    value: 'finest',
    text: 'Finest',
  },
];

const pointModeOptions = [
  {
    value: 'heat',
    text: 'By Density',
  },
  {
    value: 'category',
    text: 'By Value',
  },
];

const ellipseModeOptions = [
  {
    value: 'heat',
    text: 'One Color',
  },
  {
    value: 'category',
    text: 'By Value',
  },
];

const ellipseUnitsOptions = [
  {
    value: 'semi_majmin_nm',
    text: 'Semi Major/Minor (nm)',
  },
  {
    value: 'semi_majmin_m',
    text: 'Semi Major/Minor (m)',
  },
  {
    value: 'majmin_nm',
    text: 'Major/Minor (nm)',
  },
  {
    value: 'majmin_m',
    text: 'Major/Minor (m)',
  },
];

const ellipseSearchDistance = [
  {
    value: 'narrow',
    text: 'Narrow (1 nm)',
  },
  {
    value: 'normal',
    text: 'Normal (10 nm)',
  },
  {
    value: 'wide',
    text: 'Wide (50 nm)',
  },
];

interface Props {
  handlePropertyChange: (settings: Partial<DataShaderSourceDescriptor>) => void;
  layer: DataShaderSource;
  properties: DataShaderSourceDescriptor;
}

interface State {
  categoryFields: Array<{ field: DataViewField; format: FieldFormat }>;
  numberFields: Array<{ field: DataViewField; format: FieldFormat }>;
  isLoadingIndexPattern: boolean;
  noGeoIndexPatternsExist: boolean;
  filterByMapBounds: boolean;
  showFilterByBoundsSwitch: boolean;
  datashaderUrl: string;
  canPreview: boolean;
  indexPattern: DataView | undefined;
  indexPatternId: string;
  indexTitle: string;
  timeFieldName: string;
  geoField: string;
  geoType:string;
  geoFields: DataViewField[];
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
}
function getInitialUrl(editor: DatashaderStyleEditor): string {
  if (editor.props && editor.props.properties && editor.props.properties.urlTemplate) {
    return editor.props.properties.urlTemplate;
  }

  return '';
}
export class DatashaderStyleEditor extends Component<Props, State> {
  _isMounted = false;

  state: State = {
    isLoadingIndexPattern: false,
    noGeoIndexPatternsExist: false,
    filterByMapBounds: true,
    showFilterByBoundsSwitch: true,
    // eslint-disable-next-line @kbn/eslint/no_this_in_property_initializers
    datashaderUrl: getInitialUrl(this),
    canPreview: false,
    applyGlobalQuery: false,
    applyGlobalTime: false,
    indexPattern: undefined,
    indexPatternId: '',
    indexTitle: '',
    timeFieldName: '',
    geoField: '',
    geoType:'',
    geoFields: [],
    categoryFields: [],
    numberFields: [],
  };
  urlIsValid: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = { ...this.state, ...props.properties }; // This doesn't seem like the best way but I was lasy and didn't want to make a initial state setter function for all the props
    if (this.state.indexPatternId) {
      this._loadIndexPattern();
    }
    this.checkurl(props.properties.urlTemplate);
    this.onColorRampChange = this.onColorRampChange.bind(this);
    this.onColorKeyChange = this.onColorKeyChange.bind(this);
    this.onSpreadChange = this.onSpreadChange.bind(this);
    this.onSpanChange = this.onSpanChange.bind(this);
    this.onThicknessChange = this.onThicknessChange.bind(this);
    this.onResolutionChange = this.onResolutionChange.bind(this);
    this.onModeChange = this.onModeChange.bind(this);
    this.onUseHistogramChanged = this.onUseHistogramChanged.bind(this);
    this.onCategoryFieldChange = this.onCategoryFieldChange.bind(this);
    this.onShowEllipsesChanged = this.onShowEllipsesChanged.bind(this);
    this.onEllipseMajorChange = this.onEllipseMajorChange.bind(this);
    this.onEllipseMinorChange = this.onEllipseMinorChange.bind(this);
    this.onEllipseTiltChange = this.onEllipseTiltChange.bind(this);
    this.onEllipseUnitsChange = this.onEllipseUnitsChange.bind(this);
    this.onEllipseSearchDistanceChange = this.onEllipseSearchDistanceChange.bind(this);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFields();
  }

  componentDidUpdate() {
    this._loadFields();
  }

  async _loadFields() {
    const categoryFields = await this.props.layer.getCategoricalFields();
    if (this._isMounted && !_.isEqual(categoryFields, this.state.categoryFields)) {
      this.setState({ categoryFields });
    }

    const numberFields = await this.props.layer.getNumberFields();

    if (this._isMounted && !_.isEqual(numberFields, this.state.numberFields)) {
      this.setState({ numberFields });
    }
  }

  onColorRampChange(selectedColorRampName: string) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.COLOR_RAMP_NAME]: selectedColorRampName });
  }

  onColorKeyChange(selectedColorKeyName: string) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.COLOR_KEY_NAME]: selectedColorKeyName });
  }

  onSpreadChange(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.SPREAD]: event.target.value });
  }

  onThicknessChange(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({
      [DATASHADER_STYLES.ELLIPSE_THICKNESS]: Number(event.target.value),
    });
  }

  onResolutionChange(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.GRID_RESOLUTION]: event.target.value });
  }

  onSpanChange(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.SPAN_RANGE]: event.target.value });
  }

  onModeChange(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.MODE]: event.target.value });
  }

  onCategoryFieldChange(fieldName?: string) {
    if (!fieldName) {
      return;
    }

    const fieldAndFormat = _.find(
      this.state.categoryFields,
      (o: { field: DataViewField; format: FieldFormat }) => o.field.name === fieldName
    );

    if (fieldAndFormat) {
      const { field, format } = fieldAndFormat;
      let updates = {
        [DATASHADER_STYLES.CATEGORY_FIELD]: field.name,
        [DATASHADER_STYLES.CATEGORY_FIELD_TYPE]: field.type,
        [DATASHADER_STYLES.CATEGORY_FIELD_PATTERN]: format.toJSON().params
          ? (format.toJSON().params?.pattern as string)
          : (format.getParamDefaults().pattern as string), // fieldMeta?.spec.format ? fieldMeta?.spec.format.params?.pattern : null;
      };

      let useHistogram: boolean = false;

      if (this.props.properties.useHistogram === undefined) {
        useHistogram = field.type === 'number';
      }

      updates = {
        ...updates,
        ...{ [DATASHADER_STYLES.USE_HISTOGRAM]: useHistogram },
      };

      // Make all the updates at once, lest they
      // be overridden by defaults if updated individually.
      this.props.handlePropertyChange(updates);
    }
  }

  onShowEllipsesChanged(event: EuiSwitchEvent) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.SHOW_ELLIPSES]: event.target.checked });
  }

  onUseTimeOverlapChanged(event: EuiSwitchEvent) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.TIME_OVERLAP]: event.target.checked });
  }

  onUseTimeOverlapSizeChanged(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.TIME_OVERLAP_SIZE]: event.target.value });
  }
  onUseHistogramChanged(event: EuiSwitchEvent) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.USE_HISTOGRAM]: event.target.checked });
  }

  onEllipseMajorChange(fieldName?: string) {
    if (fieldName) {
      this.props.handlePropertyChange({ [DATASHADER_STYLES.ELLIPSE_MAJOR_FIELD]: fieldName });
    }
  }

  onEllipseMinorChange(fieldName?: string) {
    if (fieldName) {
      this.props.handlePropertyChange({ [DATASHADER_STYLES.ELLIPSE_MINOR_FIELD]: fieldName });
    }
  }

  onEllipseTiltChange(fieldName?: string) {
    if (fieldName) {
      this.props.handlePropertyChange({ [DATASHADER_STYLES.ELLIPSE_TILT_FIELD]: fieldName });
    }
  }

  onEllipseUnitsChange(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({ [DATASHADER_STYLES.ELLIPSE_UNITS]: event?.target.value });
  }

  onEllipseSearchDistanceChange(event: ChangeEvent<HTMLSelectElement>) {
    this.props.handlePropertyChange({
      [DATASHADER_STYLES.ELLIPSE_SEARCH_DISTANCE]: event.target.value,
    });
  }
  checkurl(string: string) {
    let url;

    try {
      url = new URL(string);
    } catch (e) {
      this.urlIsValid = false;
      return false;
    }
    const valid = url.protocol === 'http:' || url.protocol === 'https:';
    if (!valid) {
      this.urlIsValid = false;
      return false;
    }
    this.urlIsValid = true;
    return true;
  }
  _onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value.trim();
    let canPreview = true;

    // determine if we can preview
    if (!this.state.indexPattern) {
      canPreview = false;
    }
    if (this.state.geoField && this.state.geoField.length === 0) {
      canPreview = false;
    }
    if (url.length === 0) {
      canPreview = false;
    }

    this.setState(
      { datashaderUrl: event.target.value.trim() },
      // We have no way to give params to the setState
      // callback so we pass a closure with the params
      // we want instead.
      () => this._debounceSourceConfigChange(canPreview)
    );
  };
  onUrlTemplateChange(event: ChangeEvent<HTMLInputElement>) {
    this.checkurl(event.target.value);

    this.props.handlePropertyChange({ urlTemplate: event.target.value });
  }
  _debounceSourceConfigChange = _.debounce((canPreview: boolean) => {
    if (canPreview) {
      this.props.handlePropertyChange({
        urlTemplate: this.state.datashaderUrl,
        indexTitle: this.state.indexTitle,
        timeFieldName: this.state.timeFieldName,
        indexPatternId: this.state.indexPatternId,
        geoField: this.state.geoField,
        applyGlobalQuery: this.state.applyGlobalQuery,
        applyGlobalTime: this.state.applyGlobalTime,
      } as Partial<DatashaderStylePropertiesDescriptor>);
    } else {
      // this.props.handlePropertyChange(null);
    }
  }, 2000);
  _renderStyleConfiguration() {
    const ellipsesSwitch = (
      <EuiFormRow label={'Render Mode'} display="columnCompressed">
        <EuiSwitch
          label={'Show ellipses'}
          checked={this.props.properties.showEllipses}
          onChange={this.onShowEllipsesChanged}
          compressed
        />
      </EuiFormRow>
    );

    const pointStyleConfiguration = (
      <Fragment>
        <EuiFormRow label="Dynamic Range" display="rowCompressed">
          <EuiSelect
            options={spanRangeOptions}
            value={this.props.properties.spanRange}
            onChange={this.onSpanChange}
          />
        </EuiFormRow>
        <EuiFormRow label="Point Size" display="rowCompressed">
          <EuiSelect
            options={spreadRangeOptions}
            value={this.props.properties.spread}
            onChange={this.onSpreadChange}
          />
        </EuiFormRow>
        <EuiFormRow label="Grid resolution" display="rowCompressed">
          <EuiSelect
            options={gridResolutionOptions}
            value={this.props.properties.gridResolution}
            onChange={this.onResolutionChange}
          />
        </EuiFormRow>
      </Fragment>
    );

    const ellipseStyleConfiguration = (
      <Fragment>
        <EuiFormRow label="Dynamic Range" display="rowCompressed">
          <EuiSelect
            options={spanRangeOptions}
            value={this.props.properties.spanRange}
            onChange={this.onSpanChange}
          />
        </EuiFormRow>
        <EuiFormRow label={'Ellipse Thickness'} display="rowCompressed">
          <EuiSelect
            options={thicknessRangeOptions}
            value={this.props.properties.ellipseThickness}
            onChange={this.onThicknessChange}
          />
        </EuiFormRow>
        <EuiFormRow label={'Ellipse Major'} display="columnCompressed">
          <SingleFieldSelect
            fields={this.state.numberFields.map((f) => f.field)}
            value={this.props.properties.ellipseMajorField}
            onChange={this.onEllipseMajorChange}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow label={'Ellipse Minor'} display="columnCompressed">
          <SingleFieldSelect
            fields={this.state.numberFields.map((f) => f.field)}
            value={this.props.properties.ellipseMinorField}
            onChange={this.onEllipseMinorChange}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow label={'Ellipse Tilt'} display="columnCompressed">
          <SingleFieldSelect
            fields={this.state.numberFields.map((f) => f.field)}
            value={this.props.properties.ellipseTiltField}
            onChange={this.onEllipseTiltChange}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow label={'Ellipse Units'} display="columnCompressed">
          <EuiSelect
            options={ellipseUnitsOptions}
            value={this.props.properties.ellipseUnits}
            onChange={this.onEllipseUnitsChange}
          />
        </EuiFormRow>
        <EuiFormRow label={'Ellipse Search Distance'} display="columnCompressed">
          <EuiSelect
            options={ellipseSearchDistance}
            value={this.props.properties.ellipseSearchDistance}
            onChange={this.onEllipseSearchDistanceChange}
          />
        </EuiFormRow>
      </Fragment>
    );

    if (!this.props.properties.showEllipses) {
      return (
        <Fragment>
          {ellipsesSwitch}
          {pointStyleConfiguration}
        </Fragment>
      );
    } else {
      return (
        <Fragment>
          {ellipsesSwitch}
          {ellipseStyleConfiguration}
        </Fragment>
      );
    }
  }

  _renderHeatColorStyleConfiguration() {
    return (
      <EuiFormRow label={DATASHADER_COLOR_RAMP_LABEL} display="rowCompressed">
        <EuiSuperSelect
          options={colorRampOptions}
          onChange={this.onColorRampChange}
          valueOfSelected={this.props.properties.colorRampName}
          hasDividers={true}
          compressed
        />
      </EuiFormRow>
    );
  }

  _renderCategoricalColorStyleConfiguration() {
    const isNumeric = this.props.properties.categoryFieldType === 'number';
    const useHistogram =
      this.props.properties.useHistogram !== undefined ? this.props.properties.useHistogram : false;
    let histogramChecked = isNumeric && useHistogram;

    let histogramSwitch = <Fragment />;
    let colorOptions;

    if (isNumeric) {
      // migrate legacy configurations
      if (this.props.properties.useHistogram === undefined) {
        this.props.handlePropertyChange({ [DATASHADER_STYLES.USE_HISTOGRAM]: true });
        histogramChecked = true;
      }

      colorOptions = _.concat(colorKeyOptions, colorRampOptions);

      histogramSwitch = (
        <Fragment>
          <EuiFormRow label={'Numeric Mode'} display="columnCompressed">
            <EuiSwitch
              label={'Histogram Numeric Values'}
              checked={histogramChecked}
              onChange={this.onUseHistogramChanged}
              disabled={!isNumeric}
              compressed
            />
          </EuiFormRow>
        </Fragment>
      );
    } else {
      colorOptions = colorKeyOptions;
    }

    return (
      <Fragment>
        <EuiFormRow label="Value" display="rowCompressed">
          <SingleFieldSelect
            fields={this.state.categoryFields.map((f) => f.field)}
            value={this.props.properties.categoryField}
            onChange={this.onCategoryFieldChange}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow label={DATASHADER_COLOR_KEY_LABEL} display="rowCompressed">
          <EuiSuperSelect
            options={colorOptions}
            onChange={this.onColorKeyChange}
            valueOfSelected={this.props.properties.colorKeyName}
            hasDividers={true}
            compressed
          />
        </EuiFormRow>
        {histogramSwitch}
      </Fragment>
    );
  }

  _renderColorStyleConfiguration() {
    let colorModeOptions;
    if (!this.props.properties.showEllipses) {
      colorModeOptions = pointModeOptions;
    } else {
      colorModeOptions = ellipseModeOptions;
    }

    const modeSwitch = (
      <EuiSelect
        options={colorModeOptions}
        value={this.props.properties.mode}
        onChange={this.onModeChange}
      />
    );

    if (this.props.properties.mode === 'heat') {
      return (
        <Fragment>
          <EuiFormRow label="Color" display="rowCompressed">
            {modeSwitch}
          </EuiFormRow>
          {this._renderHeatColorStyleConfiguration()}
        </Fragment>
      );
    } else {
      return (
        <Fragment>
          <EuiFormRow label="Color" display="rowCompressed">
            {modeSwitch}
          </EuiFormRow>
          {this._renderCategoricalColorStyleConfiguration()}
        </Fragment>
      );
    }
  }
  _loadIndexPattern = _.debounce(async () => {
    const indexPatternId = this.state.indexPatternId;

    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern: DataView;

    try {
      indexPattern = await getIndexPatternService().get(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (indexPattern === undefined) {
      return;
    }

    const indexPatternTitle = _.get(indexPattern, 'title', '');

    if (indexPatternTitle.length === 0) {
      return;
    }

    let indexHasSmallDocCount = false;

    try {
      const indexDocCount = await loadIndexDocCount(indexPatternTitle);
      indexHasSmallDocCount = indexDocCount <= DEFAULT_MAX_RESULT_WINDOW;
    } catch (error) {
      // retrieving index count is a nice to have and is not essential
      // do not interrupt user flow if unable to retrieve count
    }

    if (!this._isMounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== indexPatternId) {
      return;
    }

    // make default selection
    const geoFields = indexPattern.fields
      .filter((field) => !indexPatterns.isNestedField(field))
      .filter(filterGeoField);

    this.setState(
      {
        indexPattern,
        isLoadingIndexPattern: false,
        filterByMapBounds: !indexHasSmallDocCount, // Turn off filterByMapBounds when index contains a limited number of documents
        showFilterByBoundsSwitch: indexHasSmallDocCount,
        geoFields,
      },
      () => this._setIndexPatternGeoField(geoFields)
    );
  }, 300);
  _setIndexPatternGeoField = (geoFields: DataViewField[]) => {
    this.props.handlePropertyChange({
      urlTemplate: this.state.datashaderUrl,
      indexTitle: _.get(this.state.indexPattern, 'title', ''),
      timeFieldName: _.get(this.state.indexPattern, 'timeFieldName', ''),
      indexPatternId: _.get(this.state.indexPattern, 'id', ''),
      geoField: this.state.geoField,
    } as Partial<DataShaderSourceDescriptor>);

    if (this.state.geoField && this.state.geoField.length === 0) {
      // const defaultGeospatialField = this.props.settings.defaultGeospatialField;
      const defaultGeospatialField = 'geo_center';
     
      if (
        defaultGeospatialField &&
        _.find(this.state.geoFields, { name: defaultGeospatialField })
      ) {
        this.onGeoFieldSelect(defaultGeospatialField,"geo_point");
      } else {
        // if a geoField isn't already selected use the first in the list
        if (geoFields[0]) {
          this.onGeoFieldSelect(geoFields[0].name,geoFields[0].type);
        }
      }
    }
  };
  onGeoFieldSelect = (geoField: string | undefined,geoType: string|undefined) => {
    this.setState(
      {
        geoField: geoField || '',
        geoType: geoType || "geo_point"
      },
      () =>
        this.props.handlePropertyChange({
          urlTemplate: this.state.datashaderUrl,
          indexTitle: this.state.indexTitle.length
            ? this.state.indexTitle
            : _.get(this.state.indexPattern, 'title', ''),
          timeFieldName: _.get(this.state.indexPattern, 'timeFieldName', ''),
          indexPatternId: _.get(this.state.indexPattern, 'id', ''),
          geoField,
          geoType,
        } as Partial<DataShaderSourceDescriptor>)
    );
  };
  _onGeoIndexPatternSelect = (indexPattern: DataView) => {
    this.setState(
      {
        isLoadingIndexPattern: true,
        indexPatternId: _.get(indexPattern, 'id', ''),
        indexPattern: undefined,
        indexTitle: '',
        timeFieldName: '',
        geoField: '',
        geoFields: [],
      },
      this._loadIndexPattern
    );
  };
  _renderTimeOverlapSelection() {
    const geofield = this.state.geoFields.find((g) => g.spec.name === this.state.geoField);
    if (!geofield || geofield.type !== 'geo_shape') {
      return null;
    }
    const timeSpan = getTimeFilter().getAbsoluteTime();
    // Calculate the auto duration in minutes
    const start = new Date(timeSpan.from);
    const stop = new Date(timeSpan.to);
    const minutes = (stop.getTime() - start.getTime()) / 1000 / 60;
    let step = 1;
    while (minutes / step > 546) {
      step += 1;
    }
    const timeOverlapOptions = [
      {
        value: 'auto',
        text: `Auto (${step} Minutes)`,
      },
      {
        value: '1y',
        text: 'Year',
      },
      {
        value: '1M',
        text: 'Month',
      },
      {
        value: '1d',
        text: 'Day',
      },
      {
        value: '1h',
        text: 'Hour',
      },
      {
        value: '1m',
        text: 'Minute',
      },
    ];
    return (
      <div>
        <EuiFormRow label={'Use Time Overlap'} display="columnCompressed">
          <EuiSwitch
            label={'Time Overlap'}
            checked={this.props.properties.timeOverlap}
            onChange={(e) => this.onUseTimeOverlapChanged(e)}
            compressed
          />
        </EuiFormRow>

        {this.props.properties.timeOverlap ? (
          <Fragment>
            <EuiCallOut title={'Search Overload'} color="warning" iconType="help">
              <p>
                Using Time Overlap Size setting other than auto can cause Elasticsearch to break if
                the total search time ranges aren&apos;t reasonably small. Utilize specific settings
                only if you and your users know what they are doing.
              </p>
            </EuiCallOut>
            <EuiFormRow label={'Time Overlap Size'} display="columnCompressed">
              <EuiSelect
                options={timeOverlapOptions}
                value={this.props.properties.timeOverlapSize}
                onChange={(e) => this.onUseTimeOverlapSizeChanged(e)}
              />
            </EuiFormRow>
          </Fragment>
        ) : null}
      </div>
    );
  }
  render() {
    return (
      <Fragment>
        <DatashaderUrlEditorField
          valid={this.urlIsValid}
          value={this.state.datashaderUrl}
          onChange={this._onUrlChange}
        />
        <DatashaderGeoIndexEditorField
          value={_.get(this.state, 'indexPatternId', '')}
          onChange={this._onGeoIndexPatternSelect}
        />
        <DatashaderGeoFieldEditorField
          value={this.state.geoField}
          fields={this.state.geoFields}
          indexPatternDefined={this.state.indexPatternId !== undefined}
          onChange={(name: string | undefined,type:string|undefined) => this.onGeoFieldSelect(name,type)}
        />
        {this._renderTimeOverlapSelection()}
        {this._renderColorStyleConfiguration()}

        <EuiHorizontalRule margin="xs" />
        {this._renderStyleConfiguration()}
      </Fragment>
    );
  }
}
