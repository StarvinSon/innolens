import { max } from 'd3-array';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import {
  line, area, Line, Area
} from 'd3-shape';
import {
  customElement, LitElement, TemplateResult,
  html, property, svg, PropertyValues
} from 'lit-element';
import { nothing } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map';

import '../theme';

import { css, classes } from './line-chart-2.scss';


const TAG_NAME = 'inno-line-chart-2';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: LineChart2;
  }
}

@customElement(TAG_NAME)
export class LineChart2 extends LitElement {
  public static readonly styles = css;


  @property({ attribute: false })
  public ys: ReadonlyArray<ReadonlyArray<number>> | null = null;

  @property({ attribute: false })
  public dashedStartIndex: number | null = null;

  @property({ attribute: false })
  public xLabels: ReadonlyArray<any> | null = null;

  @property({ attribute: false })
  public formatXLabel: ((label: any, i: number) => unknown) | null = null;

  @property({ attribute: false })
  public formatYLabel: ((label: number) => unknown) | null = null;

  @property({ attribute: false })
  public lineLabels: ReadonlyArray<string> | null = null;

  @property({ type: Boolean })
  public stacked = false;

  @property({ type: Boolean })
  public fill = false;

  @property({ type: Boolean, attribute: 'no-legend' })
  public noLegend = false;


  private _renderingYs: ReadonlyArray<ReadonlyArray<number>> | null = null;
  private _scaleI: ScaleLinear<number, number> | null = null;
  private _scaleY: ScaleLinear<number, number> | null = null;
  private _computeLinePath: Line<readonly [number, number]> | null = null;
  private _computeLineArea: Area<readonly [number, number, number]> | null = null;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.ys === null || this.ys.length === 0 || this.ys[0].length === 0) {
      this._renderingYs = null;
    } else if (this.stacked) {
      const rYs: Array<ReadonlyArray<number>> = this.ys.slice();
      for (let k = rYs.length - 2; k >= 0; k -= 1) {
        rYs[k] = rYs[k].map((yi, i) => yi + rYs[k + 1][i]);
      }
      this._renderingYs = rYs;
    } else {
      this._renderingYs = this.ys;
    }

    let yMax: number | undefined;
    if (this._renderingYs !== null) {
      yMax = max(this._renderingYs.flatMap((y) => y));
      if (yMax !== undefined && yMax < 0) yMax = 0;
    }

    if (this._renderingYs === null) {
      this._scaleI = null;
    } else {
      this._scaleI = scaleLinear()
        .domain([0, this._renderingYs[0].length])
        .range([0, 1]);
    }

    if (yMax === undefined) {
      this._scaleY = null;
    } else {
      this._scaleY = scaleLinear()
        .domain([0, yMax])
        .range([1, 0]);
    }

    if (this._scaleI === null || this._scaleY === null) {
      this._computeLinePath = null;
    } else {
      this._computeLinePath = line<readonly [number, number]>()
        .x(([i]) => this._scaleI!(i))
        .y(([, yi]) => this._scaleY!(yi));
    }

    if (this._scaleI === null || this._scaleY === null || !this.fill) {
      this._computeLineArea = null;
    } else {
      this._computeLineArea = area<readonly [number, number, number]>()
        .x(([i]) => this._scaleI!(i))
        .y1(([, yi]) => this._scaleY!(yi))
        .y0(([,, yj]) => this._scaleY!(yj));
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this._renderTitle()}
      ${this._renderContentAspectRatioBox()}
      ${this._renderSvg()}
      ${this._renderYLabels()}
      ${this._renderXLabels()}
      ${this._renderLegends()}
    `;
  }

  private _renderTitle(): TemplateResult {
    return html`
      <h4 class="${classes.title}"><slot name="title"></slot></h4>
    `;
  }

  private _renderContentAspectRatioBox(): TemplateResult {
    return html`
      <div class="${classes.contentAspectRatioBox}"></div>
    `;
  }

  private _renderSvg(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <svg
        class="${classes.svg}"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
      >
        <clipPath id="content-clip-path">
          <rect x="0" y="0" width="1" height="1"></rect>
        </clipPath>
        <g clip-path="url(#content-clip-path)">
          ${this._scaleY === null
            ? []
            : this._scaleY.ticks(5).map((yi) => svg`
              <line
                class="${classes.refLine}"
                x1="0" y1="${this._scaleY!(yi)}"
                x2="1" y2="${this._scaleY!(yi)}"
              ></line>
            `)}

          ${this._renderingYs === null || this._computeLineArea === null
            ? []
            : this._renderingYs.map((y, l, ys) => svg`
              <path
                class="${classes.area} ${classes[`area_$${l}`]}"
                d="${this._computeLineArea!(y
                  .slice(0, this.dashedStartIndex === null ? undefined : this.dashedStartIndex + 1)
                  .map((yi, i) => [
                    i,
                    yi,
                    l < ys.length - 1 ? ys[l + 1][i] : 0
                  ]))}"
              ></path>
            `)}

          ${this._renderingYs === null || this._computeLineArea === null || this.dashedStartIndex === null
            ? []
            : this._renderingYs.map((y, l, ys) => svg`
              <path
                class="${classes.area} ${classes.area_$dashed} ${classes[`area_$${l}`]}"
                d="${this._computeLineArea!(y
                  .slice(this.dashedStartIndex!)
                  .map((yi, i) => [
                    this.dashedStartIndex! + i,
                    yi,
                    l < ys.length - 1 ? ys[l + 1][this.dashedStartIndex! + i] : 0
                  ]))}"
              ></path>
            `)}

          ${this._renderingYs === null || this._computeLinePath === null
            ? []
            : this._renderingYs.map((y, l) => svg`
              <path
                class="${classes.line} ${classes[`line_$${l}`]}"
                d="${this._computeLinePath!(y
                  .slice(0, this.dashedStartIndex === null ? undefined : this.dashedStartIndex + 1)
                  .map((yi, i) => [i, yi]))}"
              ></path>
            `)}

          ${this._renderingYs === null || this._computeLinePath === null || this.dashedStartIndex === null
            ? []
            : this._renderingYs.map((y, l) => svg`
              <path
                class="${classes.line} ${classes.line_$dashed} ${classes[`line_$${l}`]}"
                d="${this._computeLinePath!(y
                  .slice(this.dashedStartIndex!)
                  .map((yi, i) => [this.dashedStartIndex! + i, yi]))}"
              ></path>
            `)}

          ${this.dashedStartIndex === null || this._scaleI === null
            ? nothing
            : svg`
              <line
                class="${classes.dashedDivider}"
                x1="${this._scaleI(this.dashedStartIndex)}" y1="0"
                x2="${this._scaleI(this.dashedStartIndex)}" y2="1"
              ></line>
            `}
        </g>
        <polyline
          class="${classes.axes}"
          points="0,0 0,1 1,1"
        ></polyline>
      </svg>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderYLabels(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      ${this._scaleY === null
        ? []
        : this._scaleY.ticks(5).map((yi) => html`
          <div class="${classes.yLabelBox}">
            <span
              class="${classes.yLabel}"
              style="${styleMap({
                top: `${this._scaleY!(yi) * 100}%`
              })}">
              ${this._formatYLabel(yi)}
            </span>
          </div>
        `)}
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _formatYLabel(yi: number): unknown {
    return this.formatYLabel === null ? yi : this.formatYLabel(yi);
  }

  private _renderXLabels(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      ${this._scaleI === null
        ? []
        : this._scaleI.ticks(5).map((i) => html`
          <div class="${classes.xLabelBox}">
            <span
              class="${classes.xLabel}"
              style="${styleMap({
                left: `${this._scaleI!(i) * 100}%`
              })}">
              ${this.xLabels === null ? i : this._formatXLabel(this.xLabels[i], i)}
            </span>
          </div>
        `)}
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _formatXLabel(xi: any, i: number): unknown {
    return this.formatXLabel === null ? xi : this.formatXLabel(xi, i);
  }

  private _renderLegends(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.legends}">
        <div class="${classes.legends_content}">
          ${this.noLegend || this.lineLabels === null
            ? []
            : this.lineLabels.map((label, l) => html`
              <div class="${classes.legend}">
                <div class="${classes.legend_dot} ${classes[`legend_dot_$${l}`]}"></div>
                <span class="${classes.legend_text}">${label}</span>
              </div>
            `)}
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
