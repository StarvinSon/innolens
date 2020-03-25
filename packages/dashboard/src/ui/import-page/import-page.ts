import {
  customElement, LitElement, TemplateResult,
  html, property
} from 'lit-element';
import { nothing } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';

import '../button';

import { MembersService } from '../../services/members';
import { injectableProperty } from '../../utils/property-injector';

import { css, classes } from './import-page.scss';


const TAG_NAME = 'inno-import-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ImportPage;
  }
}

@customElement(TAG_NAME)
export class ImportPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(MembersService)
  public membersService: MembersService | null = null;


  @property({ attribute: false })
  private _membersDataFormState: {
    readonly type: 'idle' | 'processing' | 'successful';
  } | {
    readonly type: 'failed';
    readonly message: string;
  } = {
    type: 'idle'
  };


  protected render(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.content}">

        <div class="${classes.card}">
          <h4 class="${classes.card_title}">Member Data</h4>
          <form
            class="${classes.form} ${classes.card_form}"
            @submit="${this._onMembersDataFormSubmit}">
            <label
              class="${classes.form_label}"
              for="file-input">
              Member CSV
            </label>
            <input
              class="${classes.form_fileInput}"
              id="file-input"
              name="file"
              type="file"
              accept=".csv"
              required>
            <input
              type="submit"
              hidden>
            <inno-button
              class="${classes.form_submitButton}"
              theme="raised"
              @click="${this._onSubmitButtonClick}">
              Import
            </inno-button>
          </form>
          <pre
            class="${classMap({
              [classes.card_message]: true,
              [classes.card_message_$hide]: this._membersDataFormState.type === 'idle'
            })}">${
              this._membersDataFormState.type === 'successful'
                ? 'Successful!'
                : this._membersDataFormState.type === 'failed'
                  ? this._membersDataFormState.message
                  : this._membersDataFormState.type === 'processing'
                    ? 'Processing'
                    : nothing
            }</pre>
        </div>

      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _onSubmitButtonClick(event: MouseEvent): void {
    let form: HTMLFormElement | undefined;
    for (
      let elem = event.target as Element | null;
      elem !== null;
      elem = elem.parentElement
    ) {
      if (elem instanceof HTMLFormElement) {
        form = elem;
        break;
      }
    }
    if (form === undefined) return;

    let submitInput: HTMLInputElement | undefined;
    for (let i = 0; i < form.elements.length; i += 1) {
      const input = form.elements[i];
      if (input instanceof HTMLInputElement && input.type === 'submit') {
        submitInput = input;
        break;
      }
    }
    if (submitInput === undefined) return;

    submitInput.click();
  }

  private _onMembersDataFormSubmit(event: Event): void {
    event.preventDefault();

    const { membersService } = this;
    if (membersService === null) return;

    const formElem = event.target as HTMLFormElement;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;
    const file = fileInputElem.files![0];

    const state: ImportPage['_membersDataFormState'] = {
      type: 'processing'
    };
    this._membersDataFormState = state;
    Promise.resolve().then(async () => {
      let errMsg: string | null = null;
      try {
        await membersService.importData(file);
        errMsg = 'Success';
      } catch (err) {
        errMsg = String(err);
      }
      if (this._membersDataFormState === state) {
        if (errMsg === null) {
          this._membersDataFormState = {
            type: 'failed',
            message: errMsg
          };
        } else {
          this._membersDataFormState = {
            type: 'successful'
          };
        }
      }
    });
  }
}
