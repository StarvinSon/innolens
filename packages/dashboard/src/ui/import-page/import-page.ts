import {
  customElement, LitElement, TemplateResult,
  html, property
} from 'lit-element';
import { nothing } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';

import '../button';
import '../datetime-input'; // eslint-disable-line import/no-duplicates
import { MemberService } from '../../services/member';
import { SpaceService } from '../../services/space';
import { injectableProperty } from '../../utils/property-injector';
import { DatetimeInput } from '../datetime-input'; // eslint-disable-line import/no-duplicates

import { css, classes } from './import-page.scss';


const formIds = ['members', 'spaces', 'spaceAccessRecords'] as const;

type FormId = (typeof formIds)[number];

type FormState = {
  readonly type: 'idle' | 'processing' | 'successful';
} | {
  readonly type: 'failed';
  readonly message: string;
};

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
  private _formStates: Readonly<Record<FormId, {
    readonly type: 'idle' | 'processing' | 'successful';
  } | {
    readonly type: 'failed';
    readonly message: string;
  }>> = Object.fromEntries(formIds.map((id) => [id, { type: 'idle' }])) as any;

  private _getFormState(id: FormId): FormState {
    return this._formStates[id];
  }

  private _setFormState(id: FormId, state: FormState): void {
    this._formStates = {
      ...this._formStates,
      [id]: state
    };
  }

  private _performFormTask(formId: FormId, task: () => Promise<void>): void {
    if (this._getFormState(formId).type === 'processing') return;

    const myState: FormState = {
      type: 'processing'
    };
    this._setFormState(formId, myState);
    Promise.resolve().then(async () => {
      let errMsg: string | null = null;
      try {
        await task();
      } catch (err) {
        errMsg = String(err);
      }
      if (this._getFormState(formId) === myState) {
        if (errMsg === null) {
          this._setFormState(formId, {
            type: 'successful'
          });
        } else {
          this._setFormState(formId, {
            type: 'failed',
            message: errMsg
          });
        }
      }
    });
  }


  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderMembersForm()}
        ${this._renderSpacesForm()}
        ${this._renderSpaceAccessRecordsForm()}
      </div>
    `;
  }

  private _renderMembersForm(): TemplateResult {
    const state = this._getFormState('members');
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
            [classes.card_message_$hide]: state.type === 'idle'
          })}">${
            state.type === 'successful'
              ? 'Successful!'
              : state.type === 'failed'
                ? state.message
                : state.type === 'processing'
                  ? 'Processing'
                  : nothing
          }</pre>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderSpacesForm(): TemplateResult {
    const state = this._getFormState('spaces');
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
            [classes.card_message_$hide]: state.type === 'idle'
          })}">${
            state.type === 'successful'
              ? 'Successful!'
              : state.type === 'failed'
                ? state.message
                : state.type === 'processing'
                  ? 'Processing'
                  : nothing
          }</pre>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderSpaceAccessRecordsForm(): TemplateResult {
    const state = this._getFormState('spaceAccessRecords');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Space Access Records Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onSpaceAccessRecordFormSubmit}">

          <label
            class="${classes.form_label}"
            for="space-id-input">
            Space ID
          </label>
          <input
            class="${classes.form_input}"
            id="space-id-input"
            name="space-id"
            type="text"
            required>

          <label
            class="${classes.form_label}"
            for="delete-from-time-input">
            Delete From Time (UTC) (Optional)
          </label>
          <inno-datetime-input
            id="delete-from-time-input">
            </inno-datetime-input>

          <label
            class="${classes.form_label}"
            for="file-input">
            Space Access Record CSV
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
            [classes.card_message_$hide]: state.type === 'idle'
          })}">${
            state.type === 'successful'
              ? 'Successful!'
              : state.type === 'failed'
                ? state.message
                : state.type === 'processing'
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

    this._performFormTask('members', async () => membersService.importMembers(file));
  }

  private _onSpacesFormSubmit(event: Event): void {
    event.preventDefault();

    const { spaceService } = this;
    if (spaceService === null) return;

    const formElem = event.target as HTMLFormElement;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;
    const file = fileInputElem.files![0];

    this._performFormTask('spaces', async () => spaceService.importSpaces(file));
  }

  private _onSpaceAccessRecordFormSubmit(event: Event): void {
    event.preventDefault();

    const { spaceService } = this;
    if (spaceService === null) return;

    const formElem = event.target as HTMLFormElement;
    const spaceIdInputElem = formElem.querySelector<HTMLInputElement>('#space-id-input')!;
    const deleteFromTimeInputElem = formElem.querySelector<DatetimeInput>('#delete-from-time-input')!;
    const fileInputElem = formElem.querySelector<HTMLInputElement>('#file-input')!;

    const spaceId = spaceIdInputElem.value;
    const deleteFromTime = deleteFromTimeInputElem.selectedTime;
    const file = fileInputElem.files![0];

    this._performFormTask('spaceAccessRecords', async () =>
      spaceService.importAccessRecords(spaceId, deleteFromTime, file));
  }
}
