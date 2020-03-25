import { max } from 'd3-array';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { line, Line } from 'd3-shape';
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


  private _renderDataCache: {
    readonly data: LineChartData<unknown> | null;
    readonly iToX: ScaleLinear<number, number> | null;
    readonly vMax: number | null;
    readonly vToY: ScaleLinear<number, number> | null;
    readonly computePath: Line<number> | null;
  } | null = null;

  private _getRenderData(): Exclude<LineChart['_renderDataCache'], null> {
    const { data } = this;

    if (this._renderDataCache !== null && this._renderDataCache.data === data) {
      return this._renderDataCache;
    }

    let iToX: ScaleLinear<number, number> | null = null;
    let vMax: number | null = null;
    let vToY: ScaleLinear<number, number> | null = null;
    let computePath: Line<number> | null = null;
    if (data !== null && data.labels.length > 0) {
      iToX = scaleLinear()
        .domain([0, data.labels.length - 1])
        .range([0, 1]);

      vMax = max(data.lines.flatMap((l) => l.values))!;

      vToY = scaleLinear()
        .domain([0, vMax])
        .range([1, 0]);

      computePath = line<number>()
        .x((_, i) => iToX!(i))
        .y((v) => vToY!(v));
    }

    this._renderDataCache = {
      data,
      iToX,
      vMax,
      vToY,
      computePath
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

  private _renderMain(): TemplateResult {
    const {
      data,
      iToX,
      vMax,
      vToY,
      computePath
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
              </g>
              <polyline
                class="${classes.axes}"
                points="0,0 0,1 1,1"></polyline>
            </svg>
            <div class="${classes.chartOverlay}">
              <div class="${classes.ticks} ${classes.ticks_$y}">
                ${vToY === null || vMax === null
                  ? []
                  : vToY.ticks(5).map((v) => html`
                    <span
                      class="${classes.tick} ${classes.tick_$y}"
                      style="${styleMap({
                        top: `${(1 - (v / vMax)) * 100}%`
                      })}">
                      ${v}
                    </span>
                  `)}
              </div>
              <div class="${classes.ticks} ${classes.ticks_$x}">
                ${data === null || iToX === null
                  ? []
                  : iToX.ticks(5).map((i) => html`
                    <span
                      class="${classes.tick} ${classes.tick_$x}"
                      style="${styleMap({
                        left: `${(1 - (i / (data.labels.length - 1))) * 100}%`
                      })}">
                      ${(data.formatLabel ?? String)(data.labels[i])}
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
          ${data === null
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
