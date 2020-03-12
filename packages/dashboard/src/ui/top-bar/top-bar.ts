import {
  LitElement, TemplateResult, html,
  customElement
} from 'lit-element';

import { css, classes } from './top-bar.scss';


const TAG_NAME = 'inno-top-bar';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: TopBar;
  }
}

@customElement(TAG_NAME)
export class TopBar extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <h1 class="${classes.logo}">InnoLens</h1>
    `;
  }

}
