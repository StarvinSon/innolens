import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../button';

import { css, classes } from './all-spaces-page.scss';


const TAG_NAME = 'inno-all-spaces-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: AllSpacesPage;
  }
}

@customElement(TAG_NAME)
export class AllSpacesPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <p class="${classes.text}">All spaces</p>
    `;
  }
}
