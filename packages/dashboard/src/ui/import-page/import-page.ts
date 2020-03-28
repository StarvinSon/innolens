import {
  customElement, LitElement, TemplateResult,
  html, property
} from 'lit-element';
import { nothing } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';

import '../button';

import { MemberService } from '../../services/member';
import { SpaceService } from '../../services/space';
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


  @injectableProperty(MemberService)
  public memberService: MemberService | null = null;

  @injectableProperty(SpaceService)
  public spaceService: SpaceService | null = null;


  @property({ attribute: false })
  private _membersFormState: {
    readonly type: 'idle' | 'processing' | 'successful';
  } | {
    readonly type: 'failed';
    readonly message: string;
  } = {
    type: 'idle'
  };

  @property({ attribute: false })
  private _spacesFormState: {
    readonly type: 'idle' | 'processing' | 'successful';
  } | {
    readonly type: 'failed';
    readonly message: string;
  } = {
    type: 'idle'
  };

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderMembersForm()}
        ${this._renderSpacesForm()}
      </div>
    `;
  }

  private _renderMembersForm(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
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
            [classes.card_message_$hide]: this._membersFormState.type === 'idle'
          })}">${
            this._membersFormState.type === 'successful'
              ? 'Successful!'
              : this._membersFormState.type === 'failed'
                ? this._membersFormState.message
                : this._membersFormState.type === 'processing'
                  ? 'Processing'
                  : nothing
          }</pre>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderSpacesForm(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Spaces Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onSpacesFormSubmit}">
          <label
            class="${classes.form_label}"
            for="file-input">
            Spaces CSV
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
            [classes.card_message_$hide]: this._spacesFormState.type === 'idle'
          })}">${
            this._spacesFormState.type === 'successful'
              ? 'Successful!'
              : this._spacesFormState.type === 'failed'
                ? this._spacesFormState.message
                : this._spacesFormState.type === 'processing'
                  ? 'Processing'
                  : nothing
          }</pre>
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

    const { memberService: membersService } = this;
    if (membersService === null) return;

    const formElem = event.target as HTMLFormElement;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;
    const file = fileInputElem.files![0];

    const state: ImportPage['_membersFormState'] = {
      type: 'processing'
    };
    this._membersFormState = state;
    Promise.resolve().then(async () => {
      let errMsg: string | null = null;
      try {
        await membersService.importMembers(file);
      } catch (err) {
        errMsg = String(err);
      }
      if (this._membersFormState === state) {
        if (errMsg === null) {
          this._membersFormState = {
            type: 'successful'
          };
        } else {
          this._membersFormState = {
            type: 'failed',
            message: errMsg
          };
        }
      }
    });
  }

  private _onSpacesFormSubmit(event: Event): void {
    event.preventDefault();

    const { spaceService } = this;
    if (spaceService === null) return;

    const formElem = event.target as HTMLFormElement;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;
    const file = fileInputElem.files![0];

    const state: ImportPage['_spacesFormState'] = {
      type: 'processing'
    };
    this._spacesFormState = state;
    Promise.resolve().then(async () => {
      let errMsg: string | null = null;
      try {
        await spaceService.importSpaces(file);
      } catch (err) {
        errMsg = String(err);
      }
      if (this._spacesFormState === state) {
        if (errMsg === null) {
          this._spacesFormState = {
            type: 'successful'
          };
        } else {
          this._spacesFormState = {
            type: 'failed',
            message: errMsg
          };
        }
      }
    });
  }
}
