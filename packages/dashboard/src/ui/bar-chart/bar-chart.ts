import { max, range } from 'd3-array';
import { scaleLinear, scaleBand } from 'd3-scale';
import {
  customElement, LitElement, TemplateResult,
  html, property, svg
} from 'lit-element';

import { css, classes } from './bar-chart.scss';


export interface BarChartData {
  readonly bars: ReadonlyArray<BarChartBarData>;
}

export interface BarChartBarData {
  readonly name: string;
  readonly value: number;
}


const TAG_NAME = 'inno-bar-chart';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: BarChart;
  }
}

@customElement(TAG_NAME)
export class BarChart extends LitElement {
  public static readonly styles = css;


  @property({ type: Number, attribute: 'chart-width' })
  public chartWidth = 480;

  @property({ type: Number, attribute: 'chart-height' })
  public chartHeight = 360;

  @property({ type: Number, attribute: 'chart-padding-left' })
  public chartPaddingLeft = 32;

  @property({ type: Number, attribute: 'chart-padding-bottom' })
  public chartPaddingBottom = 32;

  @property({ type: Number, attribute: 'chart-padding-right' })
  public chartPaddingRight = 32;

  @property({ type: Number, attribute: 'chart-padding-top' })
  public chartPaddingTop = 32;

  @property({ attribute: false })
  public data: BarChartData | null = null;


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

    const vMax = max(data.bars, (b) => b.value)!;

    const vToY = scaleLinear()
      .domain([0, vMax])
      .range([chartContentHeight, 0]);

    const iToX = scaleBand<number>()
      .domain(range(data.bars.length))
      .range([0, chartContentWidth])
      .padding(0.2);

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
            ${data.bars.map((barData, barIdx) => svg`
              <rect
                class="${classes.chart_bar} ${classes[`chart_bar_$${barIdx}`]}"
                x="${iToX(barIdx)}" y="${vToY(barData.value)}"
                width="${iToX.bandwidth()}"
                height="${chartContentHeight - vToY(barData.value)}"></path>
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
          ${data.bars.map((barData, barIdx) => svg`
            <text
              class="${classes.chart_tick} ${classes.chart_tick_$x}"
              x="${iToX(barIdx)! + iToX.bandwidth() / 2}"
              y="${chartContentHeight + 8}">
              ${barData.name}
            </text>
          `)}
        </g>
      </svg>
    `;
  }
}
