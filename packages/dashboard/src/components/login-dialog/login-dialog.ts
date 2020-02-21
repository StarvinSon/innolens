import {
  customElement, LitElement, TemplateResult,
  html, property, query
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import { OAuth2PasswordCredentialsUIAdapter, OAuth2Service } from '../../services/oauth2';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { styleCss, styleClasses } from './login-dialog.scss';


export class CredentialsEvent extends Event {
  public readonly username: string;
  public readonly password: string;

  public constructor(options: { username: string; password: string }) {
    super('credentials');
    this.username = options.username;
    this.password = options.password;
  }
}


const TAG_NAME = 'inno-login-dialog';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: LoginDialog;
  }
}

export interface LoginDialog {
  addEventListener(type: 'credentials', listener: (this: LoginDialog, ev: CredentialsEvent) => any, options?: boolean | AddEventListenerOptions): void;
  // eslint-disable-next-line max-len
  addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
}

@customElement(TAG_NAME)
export class LoginDialog extends LitElement {
  public static readonly styles = styleCss;

  @injectableProperty(OAuth2Service)
  @observeProperty('updateServiceAdapter')
  public oauth2Service: OAuth2Service | null = null;

  @property({ attribute: false })
  protected open: boolean = false;

  @property({ attribute: false })
  protected errorMessage: string | null = null;

  @query(`.${styleClasses.form}`)
  protected readonly formElement!: HTMLFormElement;

  @observeProperty('updateServiceAdapter')
  private readonly _passwordCredentialsUIAdpater: OAuth2PasswordCredentialsUIAdapter = {
    requestCredentials: (opts) => new Promise((resolve) => {
      this.open = true;
      this.errorMessage = opts.errorMessage;
      this.addEventListener('credentials', (event) => {
        resolve({
          type: 'ENTER',
          username: event.username,
          password: event.password
        });
      }, {
        once: true
      });
    }),
    close: () => {
      this.open = false;
    }
  };


  public connectedCallback(): void {
    super.connectedCallback();
    this.updateServiceAdapter();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.updateServiceAdapter();
  }

  protected updateServiceAdapter(): void {
    if (this.oauth2Service === undefined || this._passwordCredentialsUIAdpater === undefined) {
      return;
    }

    if (this.isConnected && this.oauth2Service !== null) {
      this.oauth2Service.passwordCredentialsUIAdapter = this._passwordCredentialsUIAdpater;
    } else if (
      this.oauth2Service?.passwordCredentialsUIAdapter
      === this._passwordCredentialsUIAdpater
    ) {
      this.oauth2Service.passwordCredentialsUIAdapter = null;
    }
  }

  protected render(): TemplateResult {
    const { open, errorMessage } = this;
    return html`
      <div class="${classMap({ [styleClasses.background]: true, [styleClasses.background_$hide]: !open })}"></div>
      <div class="${classMap({ [styleClasses.dialog]: true, [styleClasses.dialog_$hide]: !open })}">
        <div class="${styleClasses.dialog_content}">
          <form class="${styleClasses.form}" @submit="${this.onFormSubmit}">
            <input class="${styleClasses.form_input}" name="username" required placeholder="username">
            <input class="${styleClasses.form_input}" name="password" type="password" required placeholder="password">
            <button class="${styleClasses.form_submitButton}" type="submit">Log in</button>
          </form>
          <pre class="${classMap({ [styleClasses.errorMessage]: true, [styleClasses.errorMessage_$hide]: errorMessage === null })}">${errorMessage ?? ''}</pre>
        </div>
      </div>
    `;
  }

  protected onFormSubmit(event: Event): void {
    event.preventDefault();
    const { formElement } = this;
    const username = (formElement.elements.namedItem('username') as HTMLInputElement).value;
    const password = (formElement.elements.namedItem('password') as HTMLInputElement).value;
    this.dispatchEvent(new CredentialsEvent({ username, password }));
  }
}
