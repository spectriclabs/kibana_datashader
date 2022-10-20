
import React, { Component } from 'react';
import { EuiCallOut, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import { RenderWizardArguments } from '@kbn/maps-plugin/public';
import { LayerDescriptor, LAYER_TYPE } from '@kbn/maps-plugin/common';
import { DataShaderSource } from './data_shader_source';
import {getConfig} from '../kibana_services';
//import {  getIndexPatternService } from '@kbn/maps-plugin//kibana_services';
export type DatashaderSourceConfig = {
  urlTemplate: string;
  indexTitle: string;
  indexPatternId: string;
  timeFieldName: string;
  geoField: string;
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
}
export class CustomRasterEditor extends Component<RenderWizardArguments> {
  componentDidMount() {
    const config = getConfig()
    const customRasterLayerDescriptor: LayerDescriptor = {
      id: htmlIdGenerator()(),
      type: LAYER_TYPE.RASTER_TILE,
      sourceDescriptor: DataShaderSource.createDescriptor({
        urlTemplate:config.url,
      } as DatashaderSourceConfig),
      style: {
        type: 'RASTER',
      },
      alpha: 1,
    };
    this.props.previewLayers([customRasterLayerDescriptor]);
  }

  render() {
    return (
      <EuiPanel>
        <EuiCallOut title="Datashader">
          <p>
            Utility layer that visualized location data as a intensity map, or displays ellipses
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }
}
