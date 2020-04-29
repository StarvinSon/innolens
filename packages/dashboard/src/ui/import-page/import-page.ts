import {
  customElement, LitElement, TemplateResult,
  html, property
} from 'lit-element';
import { nothing } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';

import '../button';
import '../datetime-input'; // eslint-disable-line import/no-duplicates
import { ExpendableInventoryService } from '../../services/expendable-inventory';
import { MachineService } from '../../services/machine';
import { MemberService } from '../../services/member';
import { ReusableInventoryService } from '../../services/reusable-inventory';
import { SpaceService } from '../../services/space';
import { injectableProperty } from '../../utils/property-injector';
import { DatetimeInput } from '../datetime-input'; // eslint-disable-line import/no-duplicates

import { css, classes } from './import-page.scss';


const formIds = [
  'god',
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

  @injectableProperty(ExpendableInventoryService)
  public expendableInventoryService: ExpendableInventoryService | null = null;


  @property({ attribute: false })
  private _selectedGodFiles: {
    readonly members: File | null;
    readonly spaces: File | null;
    readonly spaceAccessRecords: ReadonlyArray<readonly [string, File]>;
    readonly machineTypes: File | null;
    readonly machineInstances: ReadonlyArray<readonly [string, File]>;
    readonly machineAccessRecords: ReadonlyArray<readonly [string, string, File]>;
    readonly reusableInventoryTypes: File | null;
    readonly reusableInventoryInstances: ReadonlyArray<readonly [string, File]>;
    readonly reusableInventoryAccessRecords: ReadonlyArray<readonly [string, string, File]>;
    readonly expendableInventoryTypes: File | null;
    readonly expendableInventoryAccessRecords: ReadonlyArray<readonly [string, File]>;
  } = {
    members: null,
    spaces: null,
    spaceAccessRecords: [],
    machineTypes: null,
    machineInstances: [],
    machineAccessRecords: [],
    reusableInventoryTypes: null,
    reusableInventoryInstances: [],
    reusableInventoryAccessRecords: [],
    expendableInventoryTypes: null,
    expendableInventoryAccessRecords: []
  };


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
        ${this._renderGodForm()}
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

  private _renderGodForm(): TemplateResult {
    const state = this._getFormState('god');
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.card}">
        <h4 class="${classes.card_title}">God</h4>
        <form
          class="${classes.form} ${classes.card_form}"
          @submit="${this._onGodFormSubmit}">
          <label
            class="${classes.form_label}"
            for="file-input">
            Simulation Result Folder
          </label>
          <input
            class="${classes.form_fileInput}"
            id="folder-input"
            name="file"
            type="file"
            webkitDirectory
            required
            @change="${this._onGodFormFolderInputChange}">
          <div>
            <p>Members:</p>

            <p>Spaces:</p>
            <p>Space Access Records:<br>
              ${this._selectedGodFiles.spaceAccessRecords.map(([spaceId]) => html`
                - ${spaceId}<br>
              `)}
            </p>

            <p>Machine Types:</p>
            <p>Machine Instances:<br>
              ${this._selectedGodFiles.machineInstances.map(([typeId]) => html`
                - ${typeId}<br>
              `)}
            </p>
            <p>Machine Access Records:<br>
              ${this._selectedGodFiles.machineAccessRecords.map(([typeId, instanceId]) => html`
                - ${typeId} (${instanceId})<br>
              `)}
            </p>

            <p>Reusable Inventory Types:</p>
            <p>Reusable Inventory Instances:<br>
              ${this._selectedGodFiles.reusableInventoryInstances.map(([typeId]) => html`
                - ${typeId}<br>
              `)}
            </p>
            <p>Reusable Inventory Access Records:<br>
              ${this._selectedGodFiles.reusableInventoryAccessRecords.map(([typeId, instanceId]) => html`
                - ${typeId} (${instanceId})<br>
              `)}
            </p>

            <p>Expendable Inventory Types:</p>
            <p>Expendable Inventory Instances:<br>
              ${this._selectedGodFiles.expendableInventoryAccessRecords.map(([typeId]) => html`
                - ${typeId}<br>
              `)}
            </p>
          </div>
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

  private _onGodFormFolderInputChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files!);

    const godFiles: {
      members: File | null;
      spaces: File | null;
      spaceAccessRecords: Array<readonly [string, File]>;
      machineTypes: File | null;
      machineInstances: Array<readonly [string, File]>;
      machineAccessRecords: Array<readonly [string, string, File]>;
      reusableInventoryTypes: File | null;
      reusableInventoryInstances: Array<readonly [string, File]>;
      reusableInventoryAccessRecords: Array<readonly [string, string, File]>;
      expendableInventoryTypes: File | null;
      expendableInventoryQuantitySetRecords: Array<readonly [string, File]>;
      expendableInventoryAccessRecords: Array<readonly [string, File]>;
    } = {
      members: null,
      spaces: null,
      spaceAccessRecords: [],
      machineTypes: null,
      machineInstances: [],
      machineAccessRecords: [],
      reusableInventoryTypes: null,
      reusableInventoryInstances: [],
      reusableInventoryAccessRecords: [],
      expendableInventoryTypes: null,
      expendableInventoryQuantitySetRecords: [],
      expendableInventoryAccessRecords: []
    };

    let match: RegExpMatchArray | null;
    for (const file of files) {
      const path = file.webkitRelativePath.slice(file.webkitRelativePath.indexOf('/') + 1);

      if (path === 'members.csv') {
        godFiles.members = file;

      } else if (path === 'spaces.csv') {
        godFiles.spaces = file;
      } else if ((match = /^space_access_records\/([^/]+)\.csv$/.exec(path)) !== null) {
        godFiles.spaceAccessRecords.push([match[1], file]);

      } else if (path === 'machine_types.csv') {
        godFiles.machineTypes = file;
      } else if ((match = /^machine_instances\/([^/]+)\.csv$/.exec(path)) !== null) {
        godFiles.machineInstances.push([match[1], file]);
      } else if ((match = /^machine_access_records\/([^/]+)\/([^/]+)\.csv$/.exec(path)) !== null) {
        godFiles.machineAccessRecords.push([match[1], match[2], file]);

      } else if (path === 'reusable_inventory_types.csv') {
        godFiles.reusableInventoryTypes = file;
      } else if ((match = /^reusable_inventory_instances\/([^/]+)\.csv$/.exec(path)) !== null) {
        godFiles.reusableInventoryInstances.push([match[1], file]);
      } else if ((match = /^reusable_inventory_access_records\/([^/]+)\/([^/]+)\.csv$/.exec(path)) !== null) {
        godFiles.reusableInventoryAccessRecords.push([match[1], match[2], file]);

      } else if (path === 'expendable_inventory_types.csv') {
        godFiles.expendableInventoryTypes = file;
      } else if ((match = /^expendable_inventory_access_records\/([^/]+)\.csv$/.exec(path)) !== null) {
        godFiles.expendableInventoryAccessRecords.push([match[1], file]);
      }
    }

    this._selectedGodFiles = godFiles;
  }

  private _onGodFormSubmit(event: Event): void {
    event.preventDefault();

    const {
      memberService,
      spaceService,
      machineService,
      reusableInventoryService,
      expendableInventoryService
    } = this;

    if (
      memberService === null || spaceService === null || machineService === null
      || reusableInventoryService === null || expendableInventoryService === null
    ) {
      return;
    }
    const godFiles = this._selectedGodFiles;

    this._performFormTask('god', async () => {
      if (godFiles.members !== null) {
        await memberService.importMembers(godFiles.members);
      }

      if (godFiles.spaces !== null) {
        await spaceService.importSpaces(godFiles.spaces);
      }
      await Promise.all(godFiles.spaceAccessRecords.map(async ([spaceId, file]) => {
        await spaceService.importAccessRecords(spaceId, null, file);
      }));

      if (godFiles.machineTypes !== null) {
        await machineService.importTypes(godFiles.machineTypes);
      }
      await Promise.all(godFiles.machineInstances.map(async ([typeId, file]) => {
        await machineService.importInstances(typeId, file);
      }));
      await Promise.all(godFiles.machineAccessRecords.map(async ([typeId, instanceId, file]) => {
        await machineService.importInstanceAccessRecords({
          typeId,
          instanceId,
          deleteFromTime: null,
          file
        });
      }));

      if (godFiles.reusableInventoryTypes !== null) {
        await reusableInventoryService.importTypes(godFiles.reusableInventoryTypes);
      }
      await Promise.all(godFiles.reusableInventoryInstances.map(async ([typeId, file]) => {
        await reusableInventoryService.importInstances(typeId, file);
      }));
      // eslint-disable-next-line max-len
      await Promise.all(godFiles.reusableInventoryAccessRecords.map(async ([typeId, instanceId, file]) => {
        await reusableInventoryService
          .importInstanceAccessRecords({
            typeId,
            instanceId,
            deleteFromTime: null,
            file
          });
      }));

      if (godFiles.expendableInventoryTypes !== null) {
        await expendableInventoryService.importTypes(godFiles.expendableInventoryTypes);
      }
      await Promise.all(godFiles.expendableInventoryAccessRecords.map(async ([typeId, file]) => {
        await expendableInventoryService.importAccessRecords(typeId, null, file);
      }));
    });
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
      machineService.importInstanceAccessRecords({
        typeId,
        instanceId,
        deleteFromTime,
        file
      }));
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
      reusableInventoryService.importInstanceAccessRecords({
        typeId,
        instanceId,
        deleteFromTime,
        file
      }));
  }
}
