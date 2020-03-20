import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../button';

import { css, classes } from './registered-users-page.scss';


const TAG_NAME = 'inno-registered-users-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: RegisteredUsersPage;
  }
}

@customElement(TAG_NAME)
export class RegisteredUsersPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <p class="${classes.text}">Registered users</p>
    `;
  }
}
