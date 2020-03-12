import {
  customElement, LitElement, TemplateResult,
  html, property, query
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import {
  OAuth2PasswordCredentialsUIAdapter, OAuth2Service, OAuth2PasswordCredentialsRequest,
  OAuth2PasswordCredentialsResponse
} from '../../services/oauth2';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './login-dialog.scss';


const TAG_NAME = 'inno-login-dialog';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: LoginDialog;
  }
}

@customElement(TAG_NAME)
export class LoginDialog extends LitElement {
  public static readonly styles = css;

  @injectableProperty(OAuth2Service)
  @observeProperty('updateServiceAdapter')
  public oauth2Service: OAuth2Service | null = null;

  @property({ attribute: false })
  private _open = false;

  @property({ attribute: false })
  private _username = '';

  @property({ attribute: false })
  private _password = '';

  @property({ attribute: false })
  private _errorMessage: string | null = null;

  @query(`.${classes.form}`)
  private readonly _formElement!: HTMLFormElement;


  @observeProperty('updateServiceAdapter')
  private readonly _passwordCredentialsUIAdpater: OAuth2PasswordCredentialsUIAdapter = {
    requestCredentials: async (req) => this.requestCredentials(req),
    close: () => {
      this._open = false;
    }
  };


  private _requestCrendentialPromise: {
    readonly promise: Promise<OAuth2PasswordCredentialsResponse>;
    readonly resolve: (val: OAuth2PasswordCredentialsResponse) => void;
  } | null = null;

  public async requestCredentials(
    req: OAuth2PasswordCredentialsRequest
  ): Promise<OAuth2PasswordCredentialsResponse> {
    this._open = true;
    this._username = req.username;
    this._password = req.password;
    if (this._requestCrendentialPromise === null) {
      let resolve!: (val: OAuth2PasswordCredentialsResponse) => void;
      const promise = new Promise<OAuth2PasswordCredentialsResponse>((rs) => {
        resolve = rs;
      });
      this._requestCrendentialPromise = {
        promise,
        resolve
      };
    }
    return this._requestCrendentialPromise.promise;
  }

  private _responseCredentials(credentials: OAuth2PasswordCredentialsResponse): void {
    if (this._requestCrendentialPromise !== null) {
      this._requestCrendentialPromise.resolve(credentials);
      this._requestCrendentialPromise = null;
    }
  }


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
    const {
      _open: open,
      _errorMessage: errorMessage
    } = this;

    return html`
      <div class="${classMap({ [classes.background]: true, [classes.background_$hide]: !open })}"></div>
      <div class="${classMap({ [classes.dialog]: true, [classes.dialog_$hide]: !open })}">
        <div class="${classes.dialog_content}">
          <form class="${classes.form}" @submit="${this.onFormSubmit}">
            <input class="${classes.form_input}" name="username" required placeholder="username">
            <input class="${classes.form_input}" name="password" type="password" required placeholder="password">
            <button class="${classes.form_submitButton}" type="submit">Log in</button>
          </form>
          <pre class="${classMap({ [classes.errorMessage]: true, [classes.errorMessage_$hide]: errorMessage === null })}">${errorMessage ?? ''}</pre>
        </div>
      </div>
    `;
  }

  protected onFormSubmit(event: Event): void {
    event.preventDefault();
    const { _formElement: formElement } = this;
    const username = (formElement.elements.namedItem('username') as HTMLInputElement).value;
    const password = (formElement.elements.namedItem('password') as HTMLInputElement).value;
    this._responseCredentials({
      type: 'ENTER',
      username,
      password
    });
  }
}
