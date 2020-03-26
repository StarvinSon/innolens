import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../button';

import { css, classes } from './users-current-page.scss';


const TAG_NAME = 'inno-users-current-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UsersCurrentPage;
  }
}

@customElement(TAG_NAME)
export class UsersCurrentPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">Current users</h4>
      </div>
    `;
  }
}
