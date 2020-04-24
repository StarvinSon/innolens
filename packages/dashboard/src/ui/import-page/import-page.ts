import {
  customElement, LitElement, TemplateResult,
  html, property
} from 'lit-element';
import { nothing } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';

import '../button';
import '../datetime-input'; // eslint-disable-line import/no-duplicates
import { MachineService } from '../../services/machine';
import { MemberService } from '../../services/member';
import { ReusableInventoryService } from '../../services/reusable-inventory';
import { SpaceService } from '../../services/space';
import { injectableProperty } from '../../utils/property-injector';
import { DatetimeInput } from '../datetime-input'; // eslint-disable-line import/no-duplicates

import { css, classes } from './import-page.scss';


const formIds = [
  'members',
  'spaces',
  'spaceAccessRecords',
  'machines',
  'machineInstances',
  'machineInstanceAccessRecords',
  'reusableInventories',
  'reusableInventoryInstances',
  'reusableInventoryInstanceAccessRecords'
] as const;

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

  @injectableProperty(MachineService)
  public machineService: MachineService | null = null;

  @injectableProperty(ReusableInventoryService)
  public reusableInventoryService: ReusableInventoryService | null = null;


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
        ${this._renderMachinesForm()}
        ${this._renderMachineInstancesForm()}
        ${this._renderMachineInstanceAccessRecordsForm()}
        ${this._renderReusableInventoriesForm()}
        ${this._renderReusableInventoryInstancesForm()}
        ${this._renderReusableInventoryInstanceAccessRecordsForm()}
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
            Space ID (Optional)
          </label>
          <input
            class="${classes.form_input}"
            id="space-id-input"
            name="space-id"
            type="text">

          <label
            class="${classes.form_label}"
            for="space-delete-from-time-input">
            Delete From Time (UTC) (Optional)
          </label>
          <inno-datetime-input
            id="space-delete-from-time-input">
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

  private _renderMachinesForm(): TemplateResult {
    const state = this._getFormState('machines');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Machines Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onMachinesFormSubmit}">
          <label
            class="${classes.form_label}"
            for="file-input">
            Machines CSV
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

  private _renderMachineInstancesForm(): TemplateResult {
    const state = this._getFormState('machineInstances');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Machine Instances Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onMachineInstanceFormSubmit}">

          <label
            class="${classes.form_label}"
            for="machine-type-id-input">
            Machine Type ID (Optional)
          </label>
          <input
            class="${classes.form_input}"
            id="machine-type-id-input"
            name="machine-type-id"
            type="text">

          <label
            class="${classes.form_label}"
            for="file-input">
            Machine Instance CSV
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

  private _renderMachineInstanceAccessRecordsForm(): TemplateResult {
    const state = this._getFormState('machineInstanceAccessRecords');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Machine Instance Access Records Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onMachineInstanceAccessRecordFormSubmit}">

          <label
            class="${classes.form_label}"
            for="machine-record-type-id-input">
            Machine Type ID
          </label>
          <input
            class="${classes.form_input}"
            id="machine-record-type-id-input"
            name="machine-record-type-id"
            type="text"
            required>

          <label
            class="${classes.form_label}"
            for="machine-record-instance-id-input">
            Machine Instance ID (Optional)
          </label>
          <input
            class="${classes.form_input}"
            id="machine-record-instance-id-input"
            name="machine-record-instance-id"
            type="text">

          <label
            class="${classes.form_label}"
            for="machine-delete-from-time-input">
            Delete From Time (UTC) (Optional)
          </label>
          <inno-datetime-input
            id="machine-delete-from-time-input">
            </inno-datetime-input>

          <label
            class="${classes.form_label}"
            for="file-input">
            Machine Instance Access Record CSV
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

  private _renderReusableInventoriesForm(): TemplateResult {
    const state = this._getFormState('reusableInventories');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Reusable Inventories Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onReusableInventoriesFormSubmit}">
          <label
            class="${classes.form_label}"
            for="file-input">
            Reusable Inventories CSV
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

  private _renderReusableInventoryInstancesForm(): TemplateResult {
    const state = this._getFormState('reusableInventoryInstances');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Reusable Inventory Instances Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onReusableInventoryInstanceFormSubmit}">

          <label
            class="${classes.form_label}"
            for="reusable-inventory-type-id-input">
            Reusable Inventory Type ID (Optional)
          </label>
          <input
            class="${classes.form_input}"
            id="reusable-inventory-type-id-input"
            name="reusable-inventory-type-id"
            type="text">

          <label
            class="${classes.form_label}"
            for="file-input">
            Reusable Inventory Instance CSV
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

  private _renderReusableInventoryInstanceAccessRecordsForm(): TemplateResult {
    const state = this._getFormState('reusableInventoryInstanceAccessRecords');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">Reusable Inventory Instance Access Records Data</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onReusableInventoryInstanceAccessRecordFormSubmit}">

          <label
            class="${classes.form_label}"
            for="reusable-inventory-record-type-id-input">
            Reusable Inventory Type ID
          </label>
          <input
            class="${classes.form_input}"
            id="reusable-inventory-record-type-id-input"
            name="reusable-inventory-record-type-id"
            type="text"
            required>

          <label
            class="${classes.form_label}"
            for="reusable-inventory-record-instance-id-input">
            Reusable Inventory Instance ID (Optional)
          </label>
          <input
            class="${classes.form_input}"
            id="reusable-inventory-record-instance-id-input"
            name="reusable-inventory-record-instance-id"
            type="text">

          <label
            class="${classes.form_label}"
            for="reusable-inventory-delete-from-time-input">
            Delete From Time (UTC) (Optional)
          </label>
          <inno-datetime-input
            id="reusable-inventory-delete-from-time-input">
            </inno-datetime-input>

          <label
            class="${classes.form_label}"
            for="file-input">
            Reusable Inventory Instance Access Record CSV
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
    const deleteFromTimeInputElem = formElem.querySelector<DatetimeInput>('#space-delete-from-time-input')!;
    const fileInputElem = formElem.querySelector<HTMLInputElement>('#file-input')!;

    const spaceId = spaceIdInputElem.value === '' ? fileInputElem.files![0].name.slice(0, -4) : spaceIdInputElem.value;
    const deleteFromTime = deleteFromTimeInputElem.selectedTime;
    const file = fileInputElem.files![0];

    this._performFormTask('spaceAccessRecords', async () =>
      spaceService.importAccessRecords(spaceId, deleteFromTime, file));
  }

  private _onMachinesFormSubmit(event: Event): void {
    event.preventDefault();

    const { machineService } = this;
    if (machineService === null) return;

    const formElem = event.target as HTMLFormElement;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;
    const file = fileInputElem.files![0];

    this._performFormTask('machines', async () => machineService.importTypes(file));
  }

  private _onMachineInstanceFormSubmit(event: Event): void {
    event.preventDefault();

    const { machineService } = this;
    if (machineService === null) return;

    const formElem = event.target as HTMLFormElement;
    const machineTypeIdInputElem = formElem.querySelector<HTMLInputElement>('#machine-type-id-input')!;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;

    const typeId = machineTypeIdInputElem.value === '' ? fileInputElem.files![0].name.slice(0, -4) : machineTypeIdInputElem.value;
    const file = fileInputElem.files![0];

    this._performFormTask('machineInstances', async () => machineService.importInstances(typeId, file));
  }

  private _onMachineInstanceAccessRecordFormSubmit(event: Event): void {
    event.preventDefault();

    const { machineService } = this;
    if (machineService === null) return;

    const formElem = event.target as HTMLFormElement;
    const machineTypeIdInputElem = formElem.querySelector<HTMLInputElement>('#machine-record-type-id-input')!;
    const machineInstanceIdInputElem = formElem.querySelector<HTMLInputElement>('#machine-record-instance-id-input')!;
    const deleteFromTimeInputElem = formElem.querySelector<DatetimeInput>('#machine-delete-from-time-input')!;
    const fileInputElem = formElem.querySelector<HTMLInputElement>('#file-input')!;

    const typeId = machineTypeIdInputElem.value;
    const instanceId = machineInstanceIdInputElem.value === '' ? fileInputElem.files![0].name.slice(0, -4) : machineInstanceIdInputElem.value;
    const deleteFromTime = deleteFromTimeInputElem.selectedTime;
    const file = fileInputElem.files![0];

    this._performFormTask('machineInstanceAccessRecords', async () =>
      machineService.importInstanceAccessRecords(typeId, instanceId, deleteFromTime, null, file));
  }

  private _onReusableInventoriesFormSubmit(event: Event): void {
    event.preventDefault();

    const { reusableInventoryService } = this;
    if (reusableInventoryService === null) return;

    const formElem = event.target as HTMLFormElement;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;
    const file = fileInputElem.files![0];

    this._performFormTask('reusableInventories', async () => reusableInventoryService.importTypes(file));
  }

  private _onReusableInventoryInstanceFormSubmit(event: Event): void {
    event.preventDefault();

    const { reusableInventoryService } = this;
    if (reusableInventoryService === null) return;

    const formElem = event.target as HTMLFormElement;
    const reusableInventoryTypeIdInputElem = formElem.querySelector<HTMLInputElement>('#reusable-inventory-type-id-input')!;
    const fileInputElem = formElem.elements.namedItem('file') as HTMLInputElement;

    const typeId = reusableInventoryTypeIdInputElem.value === '' ? fileInputElem.files![0].name.slice(0, -4) : reusableInventoryTypeIdInputElem.value;
    const file = fileInputElem.files![0];

    this._performFormTask('reusableInventoryInstances', async () => reusableInventoryService.importInstances(typeId, file));
  }

  private _onReusableInventoryInstanceAccessRecordFormSubmit(event: Event): void {
    event.preventDefault();

    const { reusableInventoryService } = this;
    if (reusableInventoryService === null) return;

    const formElem = event.target as HTMLFormElement;
    const reusableInventoryTypeIdInputElem = formElem.querySelector<HTMLInputElement>('#reusable-inventory-record-type-id-input')!;
    const reusableInventoryInstanceIdInputElem = formElem.querySelector<HTMLInputElement>('#reusable-inventory-record-instance-id-input')!;
    const deleteFromTimeInputElem = formElem.querySelector<DatetimeInput>('#reusable-inventory-delete-from-time-input')!;
    const fileInputElem = formElem.querySelector<HTMLInputElement>('#file-input')!;

    const typeId = reusableInventoryTypeIdInputElem.value;
    const instanceId = reusableInventoryInstanceIdInputElem.value === '' ? fileInputElem.files![0].name.slice(0, -4) : reusableInventoryInstanceIdInputElem.value;
    const deleteFromTime = deleteFromTimeInputElem.selectedTime;
    const file = fileInputElem.files![0];

    this._performFormTask('reusableInventoryInstanceAccessRecords', async () =>
      reusableInventoryService.importInstanceAccessRecords(
        typeId,
        instanceId,
        deleteFromTime,
        null,
        file
      ));
  }
}
