import {
  customElement, LitElement, TemplateResult, html, property, query
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import { Context } from '../../context';
import { OAuth2PasswordCredentialsUIAdapter, OAuth2Actions } from '../../state/oauth2';
import { connectContext } from '../utils/context-connector';

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
export class LoginDialog extends connectContext(LitElement) {
  public static readonly styles = styleCss;

  @property({ attribute: false })
  declare protected open: boolean;

  @property({ attribute: false })
  declare protected errorMessage: string;

  @query(`.${styleClasses.form}`)
  declare protected formElement: HTMLFormElement;

  private readonly _passwordCredentialsUIAdpater: OAuth2PasswordCredentialsUIAdapter = {
    openAndGetCredentials: () => new Promise((resolve) => {
      this.open = true;
      this.addEventListener('credentials', (event) => {
        resolve({
          username: event.username,
          password: event.password
        });
      }, {
        once: true
      });
    }),
    showError: (msg) => {
      this.open = true;
      this.errorMessage = msg;
    },
    close: () => {
      this.open = false;
      this.errorMessage = '';
    }
  };

  public constructor() {
    super();
    this.open = false;
    this.errorMessage = '';
  }

  public onContextConnected(context: Context): void {
    super.onContextConnected(context);
    const actions = context.resolve(OAuth2Actions);
    if (actions.getPasswordCredentialsUIAdapter() === null) {
      actions.setPasswordCredentialsUIAdapter(this._passwordCredentialsUIAdpater);
    } else {
      console.warn('Password credentials UI adapter has already been installed');
    }
  }

  public onContextDisconnected(context: Context): void {
    super.onContextDisconnected(context);
    const actions = context.resolve(OAuth2Actions);
    if (actions.getPasswordCredentialsUIAdapter() === this._passwordCredentialsUIAdpater) {
      actions.setPasswordCredentialsUIAdapter(null);
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
          <pre class="${styleClasses.errorMessage}">${errorMessage}</pre>
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
