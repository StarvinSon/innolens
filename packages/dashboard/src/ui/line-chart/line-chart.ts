import { max } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import {
  customElement, LitElement, TemplateResult,
  html, property, svg, PropertyValues, query
} from 'lit-element';

import '../theme';

import { css, classes } from './line-chart.scss';


export interface LineChartData {
  readonly lines: ReadonlyArray<LineChartLineData>;
  readonly labels: ReadonlyArray<string>;
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


  @property({ type: Number, attribute: 'chart-width' })
  public chartWidth = 480;

  @property({ type: Number, attribute: 'chart-height' })
  public chartHeight = 360;

  @property({ type: Number, attribute: 'chart-padding-left' })
  public chartPaddingLeft = 32;

  @property({ type: Number, attribute: 'chart-padding-bottom' })
  public chartPaddingBottom = 64;

  @property({ type: Number, attribute: 'chart-padding-right' })
  public chartPaddingRight = 32;

  @property({ type: Number, attribute: 'chart-padding-top' })
  public chartPaddingTop = 32;

  @property({ attribute: false })
  public data: LineChartData | null = null;


  @query('#legends')
  private readonly _legendsElem!: SVGGElement;


  protected render(): TemplateResult {
    const {
      chartWidth,
      chartHeight,
      chartPaddingLeft,
      chartPaddingBottom,
      chartPaddingRight,
      chartPaddingTop,
      data
    } = this;

    if (data === null) {
      return html`Empty`;
    }

    const chartContentWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
    const chartContentHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

    const vMax = max(data.lines.flatMap((l) => l.values))!;

    const iToX = scaleLinear()
      .domain([0, data.labels.length - 1])
      .range([0, chartContentWidth]);

    const vToY = scaleLinear()
      .domain([0, vMax])
      .range([chartContentHeight, 0]);

    const computePath = line<number>()
      .x((_, i) => iToX(i))
      .y((v) => vToY(v));

    return html`
      <svg
        class="${classes.chart}"
        viewBox="0 0 ${chartWidth} ${chartHeight}">
        <clipPath id="content-clip-path">
          <rect x="0" y="0" width="${chartContentWidth}" height="${chartContentHeight}"></rect>
        </clipPath>
        <g transform="translate(${chartPaddingLeft} ${chartPaddingTop})">
          <g clip-path="url(#content-clip-path)">
            ${vToY.ticks(5).map(vToY).map((y) => svg`
              <line
                class="${classes.chart_refLine}"
                x1="0" y1="${y}"
                x2="${chartContentWidth}" y2="${y}"></line>
            `)}
            ${data.lines.map((lineData, lineIdx) => svg`
              <path
                class="${classes.chart_line} ${classes[`chart_line_$${lineIdx}`]}"
                d="${computePath(lineData.values.slice())}"></path>
            `)}
          </g>
          <polyline
            class="${classes.chart_axis}"
            points="0,0 0,${chartContentHeight} ${chartContentWidth},${chartContentHeight}"></polyline>
          ${vToY.ticks(5).map((v) => svg`
            <text
              class="${classes.chart_tick} ${classes.chart_tick_$y}"
              x="-8" y="${vToY(v)}">${v}</text>
          `)}
          ${iToX.ticks(5).map((i) => svg`
            <text
              class="${classes.chart_tick} ${classes.chart_tick_$x}"
              x="${iToX(i)}" y="${chartContentHeight + 8}">${data.labels[i]}</text>
          `)}
          <g id="legends" transform="translate(0 ${chartContentHeight + 32})">
            ${data.lines.map((lineData, lineIdx) => svg`
              <g>
                <circle
                  class="${classes.chart_legendDot} ${classes[`chart_legendDot_$${lineIdx}`]}"
                  cx="5" cy="0" r="5"></circle>
                <text
                  class="${classes.chart_legendText}"
                  x="15" y="0">${lineData.name}</text>
              </g>
            `)}
          </g>
        </g>
      </svg>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    this._updateLegendsPosition();
  }

  private _updateLegendsPosition(): void {
    const {
      chartWidth,
      chartPaddingLeft,
      chartPaddingRight,
      data,
      _legendsElem: legendsElem
    } = this;

    if (data === null) return;

    const chartContentWidth = chartWidth - chartPaddingLeft - chartPaddingRight;

    const legendElems: ReadonlyArray<SVGGElement> = Array.from(legendsElem.children)
      .filter((elem): elem is SVGGElement => elem instanceof SVGGElement);

    const rowGap = 20;
    const columnGap = 10;
    const rows: Array<{
      width: number;
      legends: Array<{
        tx: number;
        ty: number;
        element: SVGGElement;
      }>
    }> = [];

    for (const legendElem of legendElems) {
      const bbox = legendElem.getBBox();
      if (
        rows.length === 0
        || rows[rows.length - 1].width + bbox.width + columnGap > chartContentWidth + columnGap
      ) {
        rows.push({
          width: 0,
          legends: []
        });
      }
      rows[rows.length - 1].legends.push({
        tx: rows[rows.length - 1].width,
        ty: (rows.length - 1) * rowGap + rowGap / 2,
        element: legendElem
      });
      rows[rows.length - 1].width += bbox.width + columnGap;
    }

    for (const row of rows) {
      const marginLeft = (chartContentWidth - row.width) / 2;
      for (const legend of row.legends) {
        legend.tx += marginLeft;
      }
    }

    for (const row of rows) {
      for (const legend of row.legends) {
        legend.element.setAttribute('transform', `translate(${legend.tx} ${legend.ty})`);
      }
    }
  }
}
