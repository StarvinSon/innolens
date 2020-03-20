import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../button';

import { css, classes } from './all-machines-page.scss';


const TAG_NAME = 'inno-all-machines-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: AllMachinesPage;
  }
}

@customElement(TAG_NAME)
export class AllMachinesPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <p class="${classes.text}">All machines</p>
    `;
  }
}
