import { sum } from 'd3-array';
import {
  pie, arc, PieArcDatum,
  Arc
} from 'd3-shape';
import {
  customElement, LitElement, TemplateResult,
  html, property, svg
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { styleMap } from 'lit-html/directives/style-map';

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


  private _renderDataCache: {
    readonly data: PieChartData | null;
    readonly pieRadius: number;
    readonly arrowRadius: number;
    readonly jointRadius: number;
    readonly legendRadius: number;
    readonly angles: ReadonlyArray<PieArcDatum<PieChartPieData>> | null;
    readonly computeArc: Arc<any, PieArcDatum<PieChartPieData>> | null;
    readonly valueSum: number | null;
  } | null = null;

  private _getRenderData(): Exclude<PieChart['_renderDataCache'], null> {
    const { data } = this;

    if (this._renderDataCache !== null && this._renderDataCache.data === data) {
      return this._renderDataCache;
    }

    const pieRadius = 0.85;
    const arrowRadius = 0.9;
    const jointRadius = 0.95;
    const legendRadius = 1;

    let angles: Array<PieArcDatum<PieChartPieData>> | null = null;
    let computeArc: Arc<any, PieArcDatum<PieChartPieData>> | null = null;
    let valueSum: number | null = null;
    if (data !== null && data.pies.length > 0) {
      valueSum = sum(data.pies, (d) => d.value);
      if (valueSum <= 0) {
        valueSum = null;
      }

      if (valueSum !== null) {
        angles = pie<PieChartPieData>()
          .value((d) => d.value)
          // eslint-disable-next-line @typescript-eslint/func-call-spacing, no-spaced-func
          .sortValues(null)
          // eslint-disable-next-line no-unexpected-multiline
          (data.pies.slice());

        computeArc = arc<PieArcDatum<PieChartPieData>>()
          .innerRadius(0)
          .outerRadius(pieRadius);
      }
    }

    this._renderDataCache = {
      data,
      pieRadius,
      arrowRadius,
      jointRadius,
      legendRadius,
      angles,
      computeArc,
      valueSum
    };
    return this._renderDataCache;
  }

  protected render(): TemplateResult {
    return html`
      <h4 class="${classes.title}"><slot name="title"></slot></h4>
      <div class="${classes.main}">
        ${this._renderSide('left')}
        ${this._renderPies()}
        ${this._renderSide('right')}
        ${this._renderNotAvailableMessage()}
      </div>
    `;
  }

  private _renderPies(): TemplateResult {
    const {
      arrowRadius,
      jointRadius,
      legendRadius,
      angles,
      computeArc
    } = this._getRenderData();

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.pies}">
        <svg
          class="${classes.pies_svg}"
          viewBox="-1 -1 2 2"
          preserveAspectRatio="none">
          ${angles === null || computeArc === null
            ? null
            : angles.map((angle, i) => svg`
                <path
                  class="${classes.pie} ${classes[`pie_$${i}`]}"
                  d="${computeArc(angle)}"></path>
              `)}
          ${angles === null || computeArc === null
            ? null
            : angles.map((angle) => {
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
                    class="${classes.arrow}"
                    points="${points.map((p) => p.join(',')).join(' ')}"></polyline>
                `;
              })}
        </svg>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderSide(side: 'left' | 'right'): TemplateResult {
    const {
      jointRadius,
      angles,
      computeArc,
      valueSum
    } = this._getRenderData();

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.legends} ${classes[`legends_$${side}`]}">
        ${angles === null || computeArc === null || valueSum === null
          ? []
          : angles
            .map((angle) => {
              const centroid = computeArc.centroid(angle);
              const centroidRadius = Math.sqrt(centroid[0] ** 2 + centroid[1] ** 2);
              const centroidUnit = [centroid[0] / centroidRadius, centroid[1] / centroidRadius];

              if (
                (side === 'left' && centroidUnit[0] >= 0)
                || (side === 'right' && centroidUnit[0] < 0)
              ) return null;

              const startY = centroidUnit[1] * jointRadius;

              return html`
                <div
                  class="${classes.legend} ${classes[`legend_$${side}`]}"
                  style="${styleMap({
                    top: `${((startY + 1) * 100) / 2}%`
                  })}">
                  ${angle.data.name}<br>
                  ${((angle.data.value * 100) / valueSum).toFixed()}%
                </div>
              `;
            })
            .filter((result) => result !== null)}
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderNotAvailableMessage(): TemplateResult {
    const { angles } = this._getRenderData();

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div
        class="${classMap({
          [classes.notAvailableMessage]: true,
          [classes.notAvailableMessage_$hide]: angles !== null
        })}">
        Not Available
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
