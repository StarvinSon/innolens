import { BsProgress, BsProgressBar } from '@lit-element-bootstrap/progress';
import { interpolateRdYlGn } from 'd3-scale-chromatic';
import {
  customElement, LitElement, TemplateResult,
  html, property, PropertyValues
} from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';

import { css, classes } from './availability-bar.scss';


const TAG_NAME = 'inno-availability-bar';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: AvailabilityBar;
  }
}

@customElement(TAG_NAME)
export class AvailabilityBar extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  private percentage: number = 0;

  protected update(changedProps: PropertyValues): void {
    if (!window.customElements.get('bs-progress')) window.customElements.define('bs-progress', BsProgress);
    if (!window.customElements.get('bs-progress-bar')) window.customElements.define('bs-progress-bar', BsProgressBar);

    super.update(changedProps);
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.availabilityBar}">
        <bs-progress class="${classes.progress}">
          <bs-progress-bar
            class="${classes.progressBar}"
            style="${styleMap({ backgroundColor: interpolateRdYlGn(this.percentage) })}"
            completed="${this.percentage * 100}"
            animated
          ></bs-progress-bar>
        </bs-progress>
        <div>
          <h4 class="${classes.percentageText}">${`${Math.round(this.percentage * 1000) / 10}%`}</h4>
        </div>
        <div>
          <h4 class="${classes.titleText}"><slot name="title"></slot></h4>
        </div>
      </div>
    `;
  }
}
