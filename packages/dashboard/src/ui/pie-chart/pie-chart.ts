import { sum } from 'd3-array';
import { pie, arc, PieArcDatum } from 'd3-shape';
import {
  customElement, LitElement, TemplateResult,
  html, property, svg
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../theme';

import { css, classes } from './pie-chart.scss';


export interface PieChartData {
  readonly pies: ReadonlyArray<PieChartPieData>;
}

export interface PieChartPieData {
  readonly name: string;
  readonly value: number;
}


const TAG_NAME = 'inno-pie-chart';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: PieChart;
  }
}

@customElement(TAG_NAME)
export class PieChart extends LitElement {
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
  public data: PieChartData | null = null;


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

    const pieRadius = Math.min(chartContentWidth, chartContentHeight) / 2;
    const arrowRadius = pieRadius * 1.05;
    const jointRadius = arrowRadius * 1.05;
    const legendRadius = jointRadius * 1.05;

    const computeAngles = pie<PieChartPieData>()
      .value((d) => d.value)
      .sortValues(null);
    const angles = computeAngles(data.pies.slice());

    const computeArc = arc<PieArcDatum<PieChartPieData>>()
      .innerRadius(0)
      .outerRadius(pieRadius);

    const valueSum = sum(data.pies, (d) => d.value);

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <svg
        class="${classes.chart}"
        viewBox="0 0 ${chartWidth} ${chartHeight}">
        <g transform="translate(${chartPaddingLeft} ${chartPaddingTop})">
          <g transform="translate(${chartContentWidth / 2} ${chartContentHeight / 2})">
            ${angles.map((angle, i) => svg`
              <path
                class="${classes.chart_pie} ${classes[`chart_pie_$${i}`]}"
                d="${computeArc(angle)}"></path>
            `)}
            ${angles.map((angle) => {
              const centroid = computeArc.centroid(angle);
              const centroidRadius = Math.sqrt(centroid[0] ** 2 + centroid[1] ** 2);
              const centroidUnit = [centroid[0] / centroidRadius, centroid[1] / centroidRadius];

              const start = [
                (centroidUnit[0] < 0 ? -1 : 1) * legendRadius,
                centroidUnit[1] * jointRadius
              ];
              const joint = [
                centroidUnit[0] * jointRadius,
                start[1]
              ];
              const end = [
                centroidUnit[0] * arrowRadius,
                centroidUnit[1] * arrowRadius
              ];
              const points = [start, joint, end];

              return svg`
                <polyline
                  class="${classes.chart_arrow}"
                  points="${points.map((p) => p.join(',')).join(' ')}"></polyline>
                <g transform="translate(${start[0] + (start[0] < 0 ? -1 : 1) * 10} ${start[1]})">
                  <text
                    class="${classMap({
                      [classes.chart_legendText]: true,
                      [classes.chart_legendText_$alignRight]: start[0] < 0
                    })}"
                    x="0" y="-10">
                    ${angle.data.name}
                  </text>
                  <text
                    class="${classMap({
                      [classes.chart_legendPercentage]: true,
                      [classes.chart_legendPercentage_$alignRight]: start[0] < 0
                    })}"
                    x="0" y="10">
                    ${((angle.data.value * 100) / valueSum).toFixed()}%
                  </text>
                </g>
              `;
            })}
          </g>
        </g>
      </svg>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
