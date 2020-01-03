import '../login-dialog';

import {
  customElement, LitElement, html, TemplateResult, property, query
} from 'lit-element';

import { MemberGroup, MemberGroupsActions } from '../../state/member-groups';
import { connectContext } from '../utils/context-connector';

import { styleCss } from './app.scss';


const TAG_NAME = 'inno-app';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: App;
  }
}

@customElement(TAG_NAME)
export class App extends connectContext(LitElement) {
  public static readonly styles = styleCss;

  @property({ attribute: false })
  declare protected memberGroups: ReadonlyArray<MemberGroup>;

  @query('inno-login-dialog')
  declare protected loginDialogElement: import('../login-dialog').LoginDialog;

  public constructor() {
    super();
    this.memberGroups = [];
  }

  protected async _getUpdateComplete(): Promise<void> {
    await super._getUpdateComplete();
    await this.loginDialogElement.updateComplete;
  }

  public onContextStateChanged(): void {
    this.memberGroups = this.getConnectedContext()
      .resolve(MemberGroupsActions)
      .get();
  }

  protected render(): TemplateResult {
    const { context, memberGroups } = this;
    return html`
      <button @click="${this.onUpdateButtonClick}">Update</button>
      <pre>${JSON.stringify(memberGroups, undefined, 2)}</pre>
      <inno-login-dialog .context="${context}"></inno-login-dialog>
    `;
  }

  protected onUpdateButtonClick(): void {
    const context = this.connectedContext;
    if (context !== null) {
      context.resolve(MemberGroupsActions)
        .update();
    }
  }
}
