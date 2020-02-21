import '../login-dialog';

import {
  customElement, LitElement, html, TemplateResult, property, query
} from 'lit-element';

import { MemberCompositionService, MemberCompositionState } from '../../services/member-composition';
import { autoBind } from '../../utils/method-binder';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { PropertyInjectorElement } from '../utils/element-property-injector';

import { styleCss } from './app.scss';


const TAG_NAME = 'inno-app';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: App;
  }
}

@customElement(TAG_NAME)
export class App extends PropertyInjectorElement(LitElement) {
  public static readonly styles = styleCss;

  @injectableProperty(MemberCompositionService)
  @observeProperty('updateListeners')
  private memberCompositionService: MemberCompositionService | null = null;

  @property({ attribute: false })
  protected memberComposition: MemberCompositionState = null;

  @query('inno-login-dialog')
  protected readonly loginDialogElement!: import('../login-dialog').LoginDialog;

  protected async _getUpdateComplete(): Promise<void> {
    await super._getUpdateComplete();
    await this.loginDialogElement.updateComplete;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateListeners();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.updateListeners();
  }

  public updateListeners(): void {
    if (this.isConnected && this.memberCompositionService !== null) {
      this.memberCompositionService.addEventListener('changed', this.bindmemberComposition);
      this.bindmemberComposition();
    } else {
      this.memberCompositionService?.removeEventListener('changed', this.bindmemberComposition);
    }
  }

  @autoBind()
  protected bindmemberComposition(): void {
    this.memberComposition = this.memberCompositionService?.memberComposition ?? null;
  }

  protected render(): TemplateResult {
    const { memberComposition } = this;
    return html`
      <button @click="${this.onUpdateButtonClick}">Update</button>
      <pre>${JSON.stringify(memberComposition, undefined, 2)}</pre>
      ${this.inject(html`
        <inno-login-dialog></inno-login-dialog>
      `)}
    `;
  }

  protected onUpdateButtonClick(): void {
    this.memberCompositionService?.update();
  }
}
