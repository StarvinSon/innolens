import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import '../button';
import { MemberCompositionService, MemberCompositionState } from '../../services/member-composition';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css } from './home-page.scss';


const TAG_NAME = 'inno-home-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: HomePage;
  }
}

@customElement(TAG_NAME)
export class HomePage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(MemberCompositionService)
  @observeProperty('_updateListeners')
  private _memberCompositionService: MemberCompositionService | null;

  @property({ attribute: false })
  private _memberComposition: MemberCompositionState = null;


  public constructor() {
    super();
    this._bindmemberComposition = this._bindmemberComposition.bind(this);
    this._memberCompositionService = null;
  }


  public connectedCallback(): void {
    super.connectedCallback();
    this._updateListeners();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._updateListeners();
  }


  private _updateListeners(): void {
    if (this.isConnected && this._memberCompositionService !== null) {
      if (this._memberCompositionService !== null) {
        this._memberCompositionService.addEventListener('changed', this._bindmemberComposition);
      }
      this._bindmemberComposition();
    } else if (this._memberCompositionService !== null) {
      this._memberCompositionService.removeEventListener('changed', this._bindmemberComposition);
    }
  }

  private _bindmemberComposition(): void {
    this._memberComposition = this._memberCompositionService?.memberComposition ?? null;
  }


  protected render(): TemplateResult {
    const { _memberComposition: memberComposition } = this;

    return html`
      <inno-button
        theme="raised"
        @click="${this._onUpdateButtonClick}">Update</inno-button>
      <pre>${JSON.stringify(memberComposition, undefined, 2)}</pre>
    `;
  }

  private _onUpdateButtonClick(): void {
    this._memberCompositionService?.update();
  }
}
