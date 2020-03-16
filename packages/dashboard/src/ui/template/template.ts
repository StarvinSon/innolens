import {
  LitElement, TemplateResult, html,
  customElement
} from 'lit-element';

import { css } from './template.scss';


const TAG_NAME = 'inno-template';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Template;
  }
}

@customElement(TAG_NAME)
export class Template extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html``;
  }
}
