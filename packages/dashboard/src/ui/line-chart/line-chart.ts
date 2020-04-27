import { max } from 'd3-array';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import {
  line, area, Line, Area
} from 'd3-shape';
import {
  customElement, LitElement, TemplateResult,
  html, property, svg
} from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';

import '../theme';

import { css, classes } from './line-chart.scss';


export interface LineChartData<T> {
  readonly lines: ReadonlyArray<LineChartLineData>;
  readonly labels: ReadonlyArray<T>;
  readonly formatLabel?: (label: T) => string;
}

export interface LineChartLineData {
  readonly name: string;
  readonly values: ReadonlyArray<number>;
}


const TAG_NAME = 'inno-line-chart';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: LineChart;
  }
}

@customElement(TAG_NAME)
export class LineChart extends LitElement {
  public static readonly styles = css;


  @property({ attribute: false })
  public data: LineChartData<unknown> | null = null;

  @property({ attribute: false })
  public formatLabel: ((label: any) => unknown) | null = null;

  @property({ type: Boolean, attribute: 'no-legend' })
  public noLegend = false;

  @property({ attribute: false })
  public predictionData: LineChartData<unknown> | null = null;

  @property({ attribute: false })
  public labels: number = 5;

  @property({ type: Boolean })
  public showArea: boolean = false;

  @property({ type: Boolean })
  public showPercentage: boolean = false;


  private _renderDataCache: {
    readonly data: LineChartData<unknown> | null;
    readonly bridgeData: LineChartData<unknown> | null;
    readonly predictionData: LineChartData<unknown> | null;
    readonly iToX: ScaleLinear<number, number> | null;
    readonly vMax: number | null;
    readonly vToY: ScaleLinear<number, number> | null;
    readonly computePath: Line<number> | null;
    readonly computeArea: Area<number> | null;
    readonly computeBridgePath: Line<number> | null;
    readonly computeBridgeArea: Area<number> | null;
    readonly computePredictionPath: Line<number> | null;
    readonly computePredictionArea: Area<number> | null;
  } | null = null;

  private _getRenderData(): Exclude<LineChart['_renderDataCache'], null> {
    const { data, predictionData, showArea } = this;

    if (
      this._renderDataCache !== null &&
      this._renderDataCache.data === data &&
      this._renderDataCache.predictionData === predictionData
    ) {
          return this._renderDataCache;
    }

    let _data: LineChartData<unknown> | null = data;
    let _bridgeData: LineChartData<unknown> | null = null;
    let _predictionData: LineChartData<unknown> | null = predictionData;
    let iToX: ScaleLinear<number, number> | null = null;
    let vMax: number | null = null;
    let vToY: ScaleLinear<number, number> | null = null;
    let computePath: Line<number> | null = null;
    let computeArea: Area<number> | null = null;
    let computeBridgePath: Line<number> | null = null;
    let computeBridgeArea: Area<number> | null = null;
    let computePredictionPath: Line<number> | null = null;
    let computePredictionArea: Area<number> | null = null;
    if (data !== null && data.labels.length > 0) {
      iToX =
        predictionData !== null && predictionData.labels.length > 0
          ? scaleLinear()
            .domain([0, data.labels.length + predictionData.labels.length - 1])
            .range([0, 1])
          : scaleLinear()
            .domain([0, data.labels.length - 1])
            .range([0, 1]);

      vMax =
        predictionData !== null && predictionData.labels.length > 0
          ? max([...data.lines, ...predictionData.lines].flatMap((l) => l.values))!
          : max(data.lines.flatMap((l) => l.values))!;

      vToY = scaleLinear()
        .domain([0, vMax])
        .range([1, 0]);

      computePath = line<number>()
        .x((_, i) => iToX!(i))
        .y((v) => vToY!(v));

      if (showArea) {
        computeArea = area<number>()
          .x((_, i) => iToX!(i))
          .y0(() => 1)
          .y1((v) => vToY!(v));
      }

      if (predictionData !== null && predictionData.labels.length > 0) {
        const names = Array.from(
          new Set([...data.lines.map((l) => l.name), ...predictionData.lines.map((l) => l.name)])
        );

        _data = {
          lines: names.map((name) => {
            const dataLine = data.lines.find((l) => l.name === name);
            return dataLine === undefined
              ? {
                name,
                values: Array(data.labels.length).fill(0)
              }
              : dataLine;
          }),
          labels: data.labels,
          formatLabel: data.formatLabel
        };

        _predictionData = {
          lines: names.map((name) => {
            const predictionDataLine = predictionData.lines.find((l) => l.name === name);
            return predictionDataLine === undefined
              ? {
                name,
                values: Array(predictionData.labels.length).fill(0)
              }
              : predictionDataLine;
          }),
          labels: predictionData.labels,
          formatLabel: predictionData.formatLabel
        };

        _bridgeData = {
          lines: _data.lines.map((l, i) => ({
            name: l.name,
            values: [l.values[l.values.length - 1], _predictionData!.lines[i].values[0]]
          })),
          labels: [_data.labels[_data.labels.length - 1], _predictionData.labels[0]],
          formatLabel: data.formatLabel
        };

        computeBridgePath = line<number>()
          .x((_, i) => iToX!(i + data.labels.length - 1))
          .y((v) => vToY!(v));

        computePredictionPath = line<number>()
          .x((_, i) => iToX!(i + data.labels.length))
          .y((v) => vToY!(v));

        if (showArea) {
          computeBridgeArea = area<number>()
            .x((_, i) => iToX!(i + data.labels.length - 1))
            .y0(() => 1)
            .y1((v) => vToY!(v));

          computePredictionArea = area<number>()
            .x((_, i) => iToX!(i + data.labels.length))
            .y0(() => 1)
            .y1((v) => vToY!(v));
        }
      }
    }

    this._renderDataCache = {
      data: _data,
      bridgeData: _bridgeData,
      predictionData: _predictionData,
      iToX,
      vMax,
      vToY,
      computePath,
      computeArea,
      computeBridgePath,
      computeBridgeArea,
      computePredictionPath,
      computePredictionArea
    };
    return this._renderDataCache;
  }

  protected render(): TemplateResult {
    return html`
      <h4 class="${classes.title}"><slot name="title"></slot></h4>
      ${this._renderMain()}
      ${this._renderLegends()}
    `;
  }

  private labelIndex(ticks: number): ReadonlyArray<number> {
    const array = [];
    for (let i = 0; i < ticks; i += 1) {
      const [, scale] = this._renderDataCache?.iToX!.domain();
      const num = Math.ceil((scale * i) / ticks);
      array.push(num);
    }

    return array;
  }

  private _renderMain(): TemplateResult {
    const {
      data,
      bridgeData,
      predictionData,
      iToX,
      vMax,
      vToY,
      computePath,
      computeArea,
      computeBridgePath,
      computeBridgeArea,
      computePredictionPath,
      computePredictionArea
    } = this._getRenderData();

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.main}">
        <div class="${classes.main_content}">
          <div class="${classes.main_chart}">
            <svg
              class="${classes.chartSvg}"
              viewBox="0 0 1 1"
              preserveAspectRatio="none">
              <clipPath id="content-clip-path">
                <rect x="0" y="0" width="1" height="1"></rect>
              </clipPath>
              <g clip-path="url(#content-clip-path)">
                ${vToY === null
                  ? []
                  : vToY.ticks(5).map(vToY).map((y) => svg`
                    <line
                      class="${classes.refLine}"
                      x1="0" y1="${y}"
                      x2="1" y2="${y}"></line>
                  `)}
                ${data === null || computePath === null
                  ? []
                  : data.lines.map((lineData, lineIdx) => svg`
                    <path
                      class="${classes.line} ${classes[`line_$${lineIdx}`]}"
                      d="${computePath(lineData.values.slice())}"></path>
                  `)}
                ${data === null || computeArea === null
                  ? []
                  : data.lines.map((lineData, lineIdx) => svg`
                    <path
                      class="${classes.area} ${classes[`area_$${lineIdx}`]}"
                      d="${computeArea(lineData.values.slice())}"></path>
                  `)}
                ${bridgeData === null || computeBridgePath === null
                  ? []
                  : bridgeData.lines.map((lineData, lineIdx) => svg`
                    <path
                      class="${classes.line} ${classes[`linePrediction_$${lineIdx}`]}"
                      d="${computeBridgePath(lineData.values.slice())}"></path>
                  `)}
                ${bridgeData === null || computeBridgeArea === null
                  ? []
                  : bridgeData.lines.map((lineData, lineIdx) => svg`
                    <path
                      class="${classes.area} ${classes[`areaPrediction_$${lineIdx}`]}"
                      d="${computeBridgeArea(lineData.values.slice())}"></path>
                  `)}
                ${predictionData === null || computePredictionPath === null
                  ? []
                  : predictionData.lines.map((lineData, lineIdx) => svg`
                    <path
                      class="${classes.line} ${classes[`linePrediction_$${lineIdx}`]}"
                      d="${computePredictionPath(lineData.values.slice())}"></path>
                  `)}
                ${predictionData === null || computePredictionArea === null
                  ? []
                  : predictionData.lines.map((lineData, lineIdx) => svg`
                    <path
                      class="${classes.area} ${classes[`areaPrediction_$${lineIdx}`]}"
                      d="${computePredictionArea(lineData.values.slice())}"></path>
                  `)}
              </g>
              <polyline
                class="${classes.axes}"
                points="0,0 0,1 1,1"></polyline>
              ${data === null || predictionData === null
                ? []
                : svg`
                  <line
                    class="${classes.divider}"
                    x1="${iToX!(data.labels.length)}" y1="0"
                    x2="${iToX!(data.labels.length)}" y2="1"/>
                `}
            </svg>
            <div class="${classes.chartOverlay}">
              <div class="${classes.ticks} ${classes.ticks_$y}">
                ${vToY === null || vMax === null
                  ? []
                  : vToY.ticks(5).map((v) => html`
                    <span
                      class="${classes.tick} ${classes.tick_$y}"
                      style="${styleMap({
                        top: `${vToY(v) * 100}%`
                      })}">
                      ${this.showPercentage ? `${Math.round(v * 100)}%` : v}
                    </span>
                  `)}
              </div>
              <div class="${classes.ticks} ${classes.ticks_$x}">
                ${data === null || iToX === null
                  ? []
                  : this.labelIndex(this.labels).map((i) => html`
                    <span
                      class="${classes.tick} ${classes.tick_$x}"
                      style="${styleMap({
                        left: `${iToX(i) * 100}%`
                      })}">
                      ${(data.formatLabel ?? this.formatLabel ?? String)(predictionData === null ? data.labels[i] : data.labels.concat(predictionData.labels)[i])}
                    </span>
                  `)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderLegends(): TemplateResult {
    const {
      data
    } = this._getRenderData();
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.legends}">
        <div class="${classes.legends_content}">
          ${this.noLegend || data === null
            ? []
            : data.lines.map((lineData, lineIdx) => html`
              <div class="${classes.legend}">
                <div class="${classes.legend_dot} ${classes[`legend_dot_$${lineIdx}`]}"></div>
                <span class="${classes.legend_text}">${lineData.name}</span>
              </div>
            `)}
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
