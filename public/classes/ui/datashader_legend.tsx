/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import fetch from 'node-fetch';
import _ from 'lodash';
// @ts-expect-error
import { ValidatedRange } from "./validated_range";
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import type { DataRequest } from '@kbn/maps-plugin/public';
import { DataShaderSourceDescriptor, IDataShaderSource } from '../data_shader_source';
import { EuiFlexGroup, EuiFlexItem,  EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';
export const DATASHADER_BUCKET_SELECT:any = {}
interface Props {
  sourceDataRequest?: DataRequest;
  sourceDescriptorUrlTemplate: string;
  sourceDescriptorIndexTitle: string;
  styleDescriptorCategoryField: string;
  style: IDataShaderSource;
}

interface State {
  bucketRange: any;
  legend: any;
  url: string;
}

const debounce = (func: (a: any) => void,timeout:number = 500) => {
    let timer: NodeJS.Timeout | number | null | undefined;
    return function (...args: any) {
      // @ts-expect-error
      const context = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        func.apply(context, args);
      }, timeout);
    };
  };

export class DatashaderLegend extends React.Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    legend: undefined,
    url: '',
    bucketRange:[0,1]
  }

  async _fetch(url: string) {
    return fetch(url);
  }

  componentDidUpdate() {
    this._loadLegendInfo();
  }

  componentDidMount() {
    this._isMounted = true;
    this._setStateFromGlobal();
    this._loadLegendInfo();
  }
  componentWillUnmount() {
    this._isMounted = false;
  }
  async _setStateFromGlobal(){
    const descriptor = this.props.style.cloneDescriptor() as DataShaderSourceDescriptor
    if(DATASHADER_BUCKET_SELECT[descriptor.id] && DATASHADER_BUCKET_SELECT[descriptor.id].toString() !== this.state.bucketRange.toString()){
        this.setState({bucketRange: DATASHADER_BUCKET_SELECT[descriptor.id]})
    }
  }
  async _loadLegendInfo() {
    let url = this.props.sourceDescriptorUrlTemplate;

    // only category maps have a legend, but in the future
    // TODO have a heat map legend that shows the colormap 
    if (!this.props.styleDescriptorCategoryField) {
      if (this._isMounted && this.state.legend !== null) {
        this.setState({ legend: null });
      }
      return;
    }

    // we need to have a sourceDataRequest
    if (!this.props.sourceDataRequest) {
      if (this.state.legend !== null) {
        this.setState({ legend: null });
      }
      return;
    }

    let data = {...this.props.sourceDataRequest?.getData(),...this.props.sourceDataRequest?.getMeta(),...this.props.style.cloneDescriptor()};
   
    if (!data) {
      return;
    }

    const geoField: string = _.get(data, 'geoField', '');
    const timeFieldName: string = _.get(data, 'timeFieldName', '');
    const applyGlobalQuery: boolean = _.get(data, 'applyGlobalQuery', true);
    const applyGlobalTime: boolean = _.get(data, 'applyGlobalTime', true);

    if (geoField.length === 0) {
      return;
    }

    if (timeFieldName.length === 0) {
      return;
    }
    
    let dataMeta = this.props.sourceDataRequest.getMeta();
    
    // if we don't have dataMeta we cannot request a legend
    if (!dataMeta) {
      if (this.state.legend !== null) {
          this.setState({ legend: null});
      }
      return;
    }

    const currentParamsObj: any = {};

    if (applyGlobalTime) {
      currentParamsObj.timeFilters = dataMeta.timeFilters;
    }

    currentParamsObj.filters = []
    
    if (applyGlobalQuery) {
      const dataMetaFilters = dataMeta.filters || [];
      currentParamsObj.filters = [...dataMetaFilters];
      
      if (dataMeta.query && dataMeta.query.language === "kuery") {
        const kueryNode = fromKueryExpression(dataMeta.query.query);
        const kueryDSL = toElasticsearchQuery(kueryNode);
        currentParamsObj.query = {
          language: "dsl",
          query: kueryDSL,
        };
      } else if (dataMeta.query && dataMeta.query.language === "lucene") {
        const luceneDSL = luceneStringToDsl(dataMeta.query.query);
        currentParamsObj.query = {
          language: "dsl",
          query: luceneDSL,
        };
      } else {
        currentParamsObj.query = dataMeta.query;
      }
    }
    
    currentParamsObj.extent = dataMeta.extent;
    currentParamsObj.zoom = dataMeta.zoom;
    

    let currentParams = "";
    currentParams = currentParams.concat(
      "params=", encodeURIComponent(JSON.stringify(currentParamsObj)),
      "&timestamp_field=", timeFieldName,
      "&geopoint_field=", geoField,
      this.props.style.getStyleUrlParams(data),
    );

    url = url.concat(
      "/",
      this.props.sourceDescriptorIndexTitle,
      "/",
      this.props.styleDescriptorCategoryField,
      "/legend.json?",
      currentParams
    );

    if (this.state.url !== url) {
      //Fetch the legend content
      const resp = await this._fetch(url);
      console.log(resp)
      if (resp.status >= 400) {
        if (this.state.legend !== null) {
          this.setState({ legend: null });
        }
        throw new Error(`Unable to access ${this.state.url}`);
      }
      const body = await resp.text();
      const legend = JSON.parse(body)
      this.setState({legend: legend, url: url});
    }
  }

  render() {
    const [min,max] = [0,1] //FIXME get the real min and max values for the buckets probably want to fetch from backend and not directly from ES
    const descriptor = this.props.style.cloneDescriptor() as DataShaderSourceDescriptor
    const showBucketFilter = !descriptor.showEllipses
    this._setStateFromGlobal()
    const bucketOnChange = debounce((v:[number, number])=>{
        DATASHADER_BUCKET_SELECT[descriptor.id] =v
        
        this.setState({bucketRange:v})
        var map = this.props.style.getMap()
        if(map){
            map.setBearing(0)//Trigger kibana maps to reload on slider change
        }
    },1000)
    const bucketFilter = (<ValidatedRange label="Selection Range" step={0.01} min={min} max={max} value={this.state.bucketRange} onChange={bucketOnChange}/>)

    if (this.state.legend === null) {
      return <div>{showBucketFilter? bucketFilter: null}</div>;
    }

    return (
        <div>
            {showBucketFilter? bucketFilter: null}
            {this.renderBreakedLegend({
            fieldLabel: this.props.styleDescriptorCategoryField,
            isLinesOnly: false,
            isPointsOnly: true,
            symbolId: undefined,
            legend: this.state.legend
            })}
        </div>
    )
  }

    renderBreakedLegend(
    { fieldLabel, isPointsOnly, isLinesOnly, symbolId, legend }:
    { fieldLabel: string, isPointsOnly: boolean, isLinesOnly: boolean, symbolId: string | undefined, legend: any }) {
    return (
      <div>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiToolTip position="top" title={"Datashader style"} content={fieldLabel}>
              <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
                <small>
                  <strong>{fieldLabel}</strong>
                </small>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction={'column'} gutterSize={'none'}>
          {this._renderColorbreaks({
            isPointsOnly,
            isLinesOnly,
            symbolId,
            legend
          })}
        </EuiFlexGroup>
      </div>
    );
  
        }
        _renderColorbreaks(
            { isLinesOnly, isPointsOnly, symbolId, legend }:
            { isLinesOnly: boolean, isPointsOnly: boolean, symbolId: string | undefined, legend: any }) {
            if (!legend || legend.length === 0) {
              return <EuiText size={'xs'}></EuiText>
            }
        
            let colorAndLabels = []
            for (let category of legend) {
                colorAndLabels.push({
                    label: category.key,
                    color: category.color,
                    count: category.count,
                });
            }
        
            return colorAndLabels.map((config, index) => {
              let label = (<div></div>);
              if (config.label && config.label.trim() !== "") {
                label = config.label;
              } else {
                label = (<em>empty</em>);
              }
        
              let count = "";
              if (config.count) {
                count = "(" + config.count + ")";
              }
        
              return (
                <EuiFlexItem key={index}>
                  <EuiFlexGroup direction={'row'} gutterSize={'none'}>
                    <EuiFlexItem>
                      <EuiText size={'xs'}>{label} {count}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" style={{stroke:config.color,fill:config.color}}><rect width="15" height="15" x=".5" y=".5" rx="4"></rect></svg>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            });
          }

        
}