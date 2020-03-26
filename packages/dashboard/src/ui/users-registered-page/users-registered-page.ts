import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../button';

import { css, classes } from './users-registered-page.scss';


const TAG_NAME = 'inno-users-registered-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UsersRegisteredPage;
  }
}

@customElement(TAG_NAME)
export class UsersRegisteredPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">Registered users</h4>
      </div>
    `;
  }
}
