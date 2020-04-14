import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../user-theme';

import { css, classes } from './user-pages.scss';


const TAG_NAME = 'inno-user-pages';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserPages;
  }
}

@customElement(TAG_NAME)
export class UserPages extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">Registered users</h4>
      </div>
    `;
  }
}
