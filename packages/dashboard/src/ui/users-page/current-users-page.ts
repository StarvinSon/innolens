import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../button';

import { css, classes } from './current-users-page.scss';


const TAG_NAME = 'inno-current-users-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: CurrentUsersPage;
  }
}

@customElement(TAG_NAME)
export class CurrentUsersPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <p class="${classes.text}">Current users</p>
    `;
  }
}
