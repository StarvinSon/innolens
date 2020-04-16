import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import { css, classes } from './user-current-page.scss';

import '../button';

// import {
//   MemberService, MemberCountFilter, MemberCountHistory,
//   MemberCountHistoryCategory, MemberCountHistoryRange
// } from '../../services/member';


const TAG_NAME = 'inno-user-current-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserCurrentPage;
  }
}

@customElement(TAG_NAME)
export class UserCurrentPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">Current users</h4>
      </div>
    `;
  }
}
