import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';

import meter from '../../images/gauge-meter.png';
import needle from '../../images/gauge-needle.png';

import { css, classes } from './gauge.scss';


const TAG_NAME = 'inno-gauge';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Gauge;
  }
}

@customElement(TAG_NAME)
export class Gauge extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  private percentage: number = 0;

  protected render(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.gauge}">
        <div class="${classes.meter}">
          <img src="${meter}" />
        </div>
        <div class="${classes.needle}">
          <img
            src="${needle}"
            style="${styleMap({
              '-webkit-transform': `rotate(${this.percentage * 270}deg)`,
              '-moz-transform': `rotate(${this.percentage * 270}deg)`,
              '-ms-transform': `rotate(${this.percentage * 270}deg)`,
              '-o-transform': `rotate(${this.percentage * 270}deg)`,
              transform: `rotate(${this.percentage * 270}deg)`
            })}"
          />
        </div>
        <div class="${classes.percentage}">
          <h4 class="${classes.percentageText}">${`${Math.round(this.percentage * 1000) / 10}%`}</h4>
        </div>
        <div class="${classes.title}">
          <h4 class="${classes.titleText}"><slot name="title"></slot></h4>
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
