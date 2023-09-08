import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { SingleFieldSelect } from './single_field_select';
import { DataViewField } from '@kbn/data-plugin/public/data_views';
interface Props {
    indexPatternDefined: boolean;
    value: string;
    onChange: (fieldName: string | undefined,fieldType: string | undefined) => void;
    fields: DataViewField[];
};

interface State {};

export class DatashaderGeoFieldEditorField extends Component<Props, State> {
    render() {
        if (!this.props.indexPatternDefined) {
            return null;
          }
      
          return (
            <EuiFormRow
              label={i18n.translate('xpack.maps.source.esSearch.geofieldLabel', {
                defaultMessage: 'Geospatial field',
              })}
            >
              <SingleFieldSelect
                placeholder={i18n.translate('xpack.maps.source.esSearch.selectLabel', {
                  defaultMessage: 'Select geo field',
                })}
                value={this.props.value}
                onChange={(fieldName) => {
                    let dvField = this.props.fields.find(field => field.name === fieldName)
                    let fieldType = dvField?dvField.type:'';
                    this.props.onChange(fieldName,fieldType)
                  }
                }
                fields={this.props.fields}
              />
            </EuiFormRow>
          );
    };
}