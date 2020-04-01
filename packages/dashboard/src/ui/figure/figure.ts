import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import { css, classes } from './figure.scss';


const TAG_NAME = 'inno-figure';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Figure;
  }
}

@customElement(TAG_NAME)
export class Figure extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <div class="${classes.box}">
        <div class="${classes.box_content}">
          <h4 class="${classes.title}"><slot name="title"></slot></h4>
          <p class="${classes.value}"><slot name="value"></slot></p>
        </div>
      </div>
    `;
  }
}
