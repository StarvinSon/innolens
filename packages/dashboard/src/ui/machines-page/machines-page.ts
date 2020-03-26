import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../button';

import { css, classes } from './machines-page.scss';


const TAG_NAME = 'inno-machines-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MachinesPage;
  }
}

@customElement(TAG_NAME)
export class MachinesPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">All machines</h4>
      </div>
    `;
  }
}
