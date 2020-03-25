import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../theme';

import { css } from './chart-card.scss';


const TAG_NAME = 'inno-chart-card';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ChartCard;
  }
}

@customElement(TAG_NAME)
export class ChartCard extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`<slot></slot>`;
  }
}
