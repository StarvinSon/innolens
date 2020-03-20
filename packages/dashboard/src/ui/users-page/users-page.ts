import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import '../tab-bar';

import './current-users-page';
import './registered-users-page';
import { css } from './users-page.scss';


const TAG_NAME = 'inno-users-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UsersPage;
  }
}

type usersSubpage = 'registered' | 'current';

const tabs: Array<{ name: string; page: usersSubpage }> = [
  { name: 'Registered users', page: 'registered' },
  { name: 'Current users', page: 'current' }
];

@customElement(TAG_NAME)
export class UsersPage extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  private currentPage: usersSubpage = 'registered';

  protected render(): TemplateResult {
    return html`
      <inno-tab-bar
        page="${this.currentPage}"
        .tabs="${tabs}"
        @pageChange="${this._handlePageChange}"
      ></inno-tab-bar>

      ${this.content}
    `;
  }

  private _handlePageChange(event: CustomEvent): void {
    this.currentPage = event.detail.page;
  }

  private get content(): TemplateResult {
    switch (this.currentPage) {
      case 'current':
        return html`<inno-current-users-page></inno-current-users-page>`;
      case 'registered':
      default:
        return html`<inno-registered-users-page></inno-registered-users-page>`;
    }
  }
}
