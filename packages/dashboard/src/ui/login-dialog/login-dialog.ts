import {
  customElement, LitElement, TemplateResult,
  html, property, query, PropertyValues
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../button';
import '../elevation';
import '../theme';
import {
  OAuth2PasswordCredentialsUIAdapter, OAuth2Service, OAuth2PasswordCredentialsRequest,
  OAuth2PasswordCredentialsResponse
} from '../../services/oauth2';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { ElementAnimator } from '../element-animator';

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
  @observeProperty('_updateServiceAdapter')
  public oauth2Service: OAuth2Service | null = null;


  @observeProperty('_updateAnimator')
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

  @query(`.${classes.form} [name="username"]`)
  private readonly _usernameInputElement!: HTMLInputElement;

  @query(`.${classes.form} [name="password"]`)
  private readonly _passwordInputElement!: HTMLInputElement;

  @query(`.${classes.form} [type="submit"]`)
  private readonly _nativeSubmitButton!: HTMLButtonElement;


  @observeProperty('_updateAnimator')
  private readonly _animator = new ElementAnimator<'background' | 'dialog'>(
    (direction, key, elem) => {
      switch (direction) {
        case 'forwards': {
          switch (key) {
            case 'background': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  opacity: 0
                }, {
                  opacity: 1
                }],
                {
                  duration: 100,
                  fill: 'forwards'
                }
              ),
              document.timeline
            );
            case 'dialog': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  opacity: 0,
                  transform: 'scale(0)'
                }, {
                  opacity: 1,
                  transform: 'scale(1)'
                }],
                {
                  duration: 300,
                  fill: 'forwards',
                  easing: 'cubic-bezier(.68,1.6,.6,1)'
                }
              ),
              document.timeline
            );
            default: {
              throw new Error(`Unexpected key: ${key}`);
            }
          }
        }
        case 'backwards': {
          switch (key) {
            case 'background': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  opacity: 1
                }, {
                  opacity: 0
                }],
                {
                  duration: 100,
                  fill: 'forwards'
                }
              ),
              document.timeline
            );
            case 'dialog': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  opacity: 1,
                  transform: 'scale(1)'
                }, {
                  opacity: 0,
                  transform: 'scale(0)'
                }],
                {
                  duration: 200,
                  fill: 'forwards'
                }
              ),
              document.timeline
            );
            default: {
              throw new Error(`Unexpected key: ${key}`);
            }
          }
        }
        default: {
          throw new Error(`Unexpected direction: ${direction}`);
        }
      }
    }
  );

  private _lastInteractable = false;


  @observeProperty('_updateServiceAdapter')
  private readonly _passwordCredentialsUIAdpater: OAuth2PasswordCredentialsUIAdapter = {
    requestCredentials: async (req) => this.requestCredentials(req),
    close: () => {
      this._open = false;
    }
  };


  public constructor() {
    super();
    this._animator.addEventListener('request-update', () => this.requestUpdate());
  }


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
    this._errorMessage = req.errorMessage;
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
    this._updateServiceAdapter();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._updateServiceAdapter();
  }


  private _updateServiceAdapter(): void {
    if (this.oauth2Service === undefined || this._passwordCredentialsUIAdpater === undefined) {
      return;
    }

    if (this.isConnected) {
      if (this.oauth2Service !== null) {
        this.oauth2Service.passwordCredentialsUIAdapter = this._passwordCredentialsUIAdpater;
      }
    } else if (
      this.oauth2Service !== null
      && this.oauth2Service.passwordCredentialsUIAdapter === this._passwordCredentialsUIAdpater
    ) {
      this.oauth2Service.passwordCredentialsUIAdapter = null;
    }
  }


  private _updateAnimator(): void {
    if (this._open === undefined || this._animator === undefined) {
      return;
    }

    this._animator.direction = this._open ? 'forwards' : 'backwards';
  }


  protected render(): TemplateResult {
    const {
      _errorMessage: errorMessage,
      _animator: animator
    } = this;

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div
        class="${classes.background}"
        data-animator-control=${animator.control('background')}></div>
      <div
        class="${classMap({
          [classes.dialog]: true,
          [classes.dialog_$freeze]: !animator.interactable
        })}"
        data-animator-control=${animator.control('dialog')}>
        <div class="${classes.dialog_content}">
          <form
            class="${classes.form}"
            @submit="${this.onFormSubmit}">
            <input
              class="${classes.form_input}"
              name="username"
              required
              placeholder="username">
            <input
              class="${classes.form_input}"
              name="password"
              type="password"
              required
              placeholder="password">
            <div class="${classes.form_buttons}">
              <inno-button
                class="${classes.form_button}"
                @click="${this._onCancelButtonClick}">Cancel</inno-button>
              <button
                type="submit"
                hidden></button>
              <inno-button
                class="${classes.form_button}"
                theme="raised"
                @click="${this._onSubmitButtonClick}">Log in</inno-button>
            </div>
          </form>
          <pre
            class="${classMap({
              [classes.errorMessage]: true,
              [classes.errorMessage_$hide]: errorMessage === null
            })}">${errorMessage ?? ''}</pre>
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (this._animator.visible) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }

    if (this._lastInteractable !== this._animator.interactable) {
      this._lastInteractable = this._animator.interactable;
      if (this._lastInteractable) {
        this._usernameInputElement.focus();
      }
    }
  }

  protected onFormSubmit(event: Event): void {
    event.preventDefault();

    const username = this._usernameInputElement.value;
    const password = this._passwordInputElement.value;
    this._responseCredentials({
      type: 'ENTER',
      username,
      password
    });
  }

  private _onCancelButtonClick(): void {
    this._responseCredentials({
      type: 'CANCEL'
    });
  }

  private _onSubmitButtonClick(): void {
    this._nativeSubmitButton.click();
  }
}
