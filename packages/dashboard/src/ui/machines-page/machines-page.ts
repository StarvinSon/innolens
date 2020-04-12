import { format as formatDate } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

import '../choice-chip';
import '../choice-chips';
import '../line-chart';
import '../chart-card';
import {
  MachineService, MachineType, MachineMemberCountHistoryGroupByValues,
  MachineInstance, MachineMemberCountRecord,
  machineMemberCountHistoryGroupByValues,
  MachineMemberCountRecordValues,
  MachineMemberCountHistory
} from '../../services/machine';
import { mergeArray } from '../../utils/immutable/array';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './machines-page.scss';


const pastDaysChoices = [1, 2, 7, 30, 60, 120, 360];


type CountType = {
  // eslint-disable-next-line max-len
  [K in keyof MachineMemberCountRecord]: MachineMemberCountRecord[K] extends MachineMemberCountRecordValues ? K : never
}[keyof MachineMemberCountRecord];

const countTypeChoices: ReadonlyArray<{
  readonly type: CountType,
  readonly name: string
}> = [
  {
    type: 'acquireCounts',
    name: 'Acquire'
  },
  {
    type: 'uniqueAcquireCounts',
    name: 'Unique Acquire'
  },
  {
    type: 'releaseCounts',
    name: 'Release'
  },
  {
    type: 'uniqueReleaseCounts',
    name: 'Unique Release'
  },
  {
    type: 'useCounts',
    name: 'Use'
  },
  {
    type: 'uniqueUseCounts',
    name: 'Unique Use'
  }
];


const emptyArray: ReadonlyArray<never> = [];


const TAG_NAME = 'inno-machines-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MachinesPage;
  }
}

@customElement(TAG_NAME)
export class MachinesPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(MachineService)
  @observeProperty('_onDependencyInjected')
  public machineService: MachineService | null;


  @property({ attribute: false })
  public interactable = false;


  @property({ attribute: false })
  private _types: ReadonlyArray<MachineType> | null = null;

  @property({ attribute: false })
  private _selectedTypeIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _instances: ReadonlyArray<MachineInstance> | null = null;

  @property({ attribute: false })
  private _selectedInstanceIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _selectedGroupBy: MachineMemberCountHistoryGroupByValues = 'all';

  @property({ attribute: false })
  private _selectedPastDays = 7;

  @property({ attribute: false })
  private _selectedCountType: CountType = 'useCounts';

  @property({ attribute: false })
  private _countHistory: MachineMemberCountHistory | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;


  private _selectedTypeIdsDeps: readonly [ReadonlyArray<MachineType> | null] = [null];

  private _selectedInstanceIdsDeps: readonly [ReadonlyArray<MachineInstance> | null] = [null];

  private _lineChartDataDeps: readonly [
    MachineMemberCountHistory | null,
    CountType | null
  ] = [null, null];


  public constructor() {
    super();
    this._onMachineServiceUpdated = this._onMachineServiceUpdated.bind(this);
    this.machineService = null;
  }


  private _onDependencyInjected(): void {
    if (this.machineService !== null) {
      this.machineService.addEventListener('types-updated', this._onMachineServiceUpdated);
      this.machineService.addEventListener('instances-updated', this._onMachineServiceUpdated);
      this.machineService.addEventListener('member-count-history-updated', this._onMachineServiceUpdated);
      this._updateProperties();
    }
  }

  private _onMachineServiceUpdated(): void {
    this.requestUpdate();
  }


  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return super.shouldUpdate(changedProps) && this.interactable;
  }

  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.machineService === null) return;

    this._types = this.machineService.types;
    if (this._types === null) {
      this.machineService.updateTypes();
    }

    if (this._selectedTypeIdsDeps[0] !== this._types) {
      if (this._types === null) {
        this._selectedTypeIds = null;
      } else {
        const ids = new Set(this._types.map((type) => type.typeId));
        this._selectedTypeIds = mergeArray(
          this._selectedTypeIds,
          this._selectedTypeIds === null
            ? emptyArray
            : this._selectedTypeIds.filter((id) => ids.has(id))
        );
      }
      this._selectedTypeIdsDeps = [this._types];
    }

    if (this._selectedTypeIds === null) {
      this._instances = null;
    } else if (this._selectedTypeIds.length !== 1) {
      this._instances = emptyArray;
    } else {
      this._instances = this.machineService.getInstances(this._selectedTypeIds[0]);
      if (this._instances === null) {
        this.machineService.updateInstances(this._selectedTypeIds[0]);
      }
    }

    if (this._selectedInstanceIdsDeps[0] !== this._instances) {
      if (this._instances === null) {
        this._selectedInstanceIds = null;
      } else {
        const ids = new Set(this._instances.map((instance) => instance.instanceId));
        this._selectedInstanceIds = mergeArray(
          this._selectedInstanceIds,
          this._selectedInstanceIds === null
            ? emptyArray
            : this._selectedInstanceIds.filter((id) => ids.has(id))
        );
      }
      this._selectedInstanceIdsDeps = [this._instances];
    }

    if (this._selectedTypeIds === null || this._selectedInstanceIds === null) {
      this._countHistory = null;
    } else {
      const opts = [
        this._selectedTypeIds.length > 0 ? this._selectedTypeIds : undefined,
        this._selectedInstanceIds.length > 0 ? this._selectedInstanceIds : undefined,
        this._selectedGroupBy,
        this._selectedPastDays * 24
      ] as const;
      this._countHistory = this.machineService.getMemberCountHistory(...opts);
      if (this._countHistory === null) {
        this.machineService.updateMemberCountHistory(...opts);
      }
    }

    if (
      this._lineChartDataDeps[0] !== this._countHistory
      || this._lineChartDataDeps[1] !== this._selectedCountType
    ) {
      if (this._countHistory === null) {
        this._lineChartData = null;
      } else {
        this._lineChartData = {
          lines: this._countHistory.groups.map((group) => ({
            name: group,
            values: this._countHistory!.records
              .map((record) => record[this._selectedCountType][group])
          })),
          labels: this._countHistory.records.map((record) => record.periodEndTime),
          formatLabel: (time) => formatDate(time, 'd/L')
        };
      }
      this._lineChartDataDeps = [this._countHistory, this._selectedCountType];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderOptions()}
        ${this._renderLineChart()}
      </div>
    `;
  }

  private _renderOptions(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.options}">

        ${this._renderChipOptions({
          title: 'Machine Type',
          items: this._types === null ? emptyArray : [
            {
              typeId: null,
              typeName: 'All'
            },
            ...this._types
          ],
          selectItem: (type) => type.typeId === null
            ? this._selectedTypeIds !== null && this._selectedTypeIds.length === 0
            : this._selectedTypeIds !== null && this._selectedTypeIds.includes(type.typeId),
          formatItem: (type) => type.typeName,
          onClick: (type) => this._onTypeChipClick(type.typeId)
        })}

        ${this._renderChipOptions({
          title: 'Machine Instance',
          items: this._instances === null ? emptyArray : [
            {
              instanceId: null,
              instanceName: 'All'
            },
            ...this._instances
          ],
          selectItem: (instance) => instance.instanceId === null
            ? this._selectedInstanceIds !== null && this._selectedInstanceIds.length === 0
            // eslint-disable-next-line max-len
            : this._selectedInstanceIds !== null && this._selectedInstanceIds.includes(instance.instanceId),
          formatItem: (instance) => instance.instanceName,
          onClick: (instance) => this._onInstanceChipClick(instance.instanceId)
        })}

        ${this._renderChipOptions({
          title: 'Group By',
          items: machineMemberCountHistoryGroupByValues,
          selectItem: (groupBy) => this._selectedGroupBy === groupBy,
          onClick: (groupBy) => this._onGroupByChipClick(groupBy)
        })}

        ${this._renderChipOptions({
          title: 'Past Days',
          items: pastDaysChoices,
          selectItem: (days) => days === this._selectedPastDays,
          formatItem: (day) => html`${day} Days`,
          onClick: (day) => this._onPastDaysChipClick(day)
        })}

        ${this._renderChipOptions({
          title: 'Count Type',
          items: countTypeChoices,
          selectItem: (choice) => choice.type === this._selectedCountType,
          formatItem: (choice) => choice.name,
          onClick: (choice) => this._onCountTypeChipClick(choice.type)
        })}

      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderChipOptions<T>(options: {
    readonly title: unknown,
    readonly items: ReadonlyArray<T>,
    readonly selectItem: (item: T) => boolean,
    readonly formatItem?: (item: T) => unknown,
    readonly onClick: (item: T) => void
  }): TemplateResult {
    return html`
      <div class="${classes.option}">
        <div class="${classes.option_label}">${options.title}</div>
        <inno-choice-chips
          class="${classes.option_chips}"
        >
          ${options.items.map((item) => html`
            <inno-choice-chip
              .selected="${options.selectItem(item)}"
              @click="${() => options.onClick(item)}"
            >
              ${options.formatItem === undefined ? item : options.formatItem(item)}
            </inno-choice-chip>
          `)}
        </inno-choice-chips>
      </div>
    `;
  }

  private _renderLineChart(): TemplateResult {
    return html`
      <div class="${classes.chartCards}">
        <inno-chart-card>
          <inno-line-chart
            class="${classes.lineChart}"
            .data="${this._lineChartData}">
            <span slot="title">Space Member Count History</span>
          </inno-line-chart>
        </inno-chart-card>
      </div>
    `;
  }

  private _onTypeChipClick(typeId: string | null): void {
    if (this._selectedTypeIds !== null) {
      if (typeId === null) {
        this._selectedTypeIds = emptyArray;
      } else {
        this._selectedTypeIds = this._toggleArray(this._selectedTypeIds, typeId);
      }
    }
  }

  private _onInstanceChipClick(instanceId: string | null): void {
    if (this._selectedInstanceIds !== null) {
      if (instanceId === null) {
        this._selectedInstanceIds = emptyArray;
      } else {
        this._selectedInstanceIds = this._toggleArray(this._selectedInstanceIds, instanceId);
      }
    }
  }

  private _onGroupByChipClick(groupBy: MachineMemberCountHistoryGroupByValues): void {
    this._selectedGroupBy = groupBy;
  }

  private _onPastDaysChipClick(day: number): void {
    this._selectedPastDays = day;
  }

  private _onCountTypeChipClick(type: CountType): void {
    this._selectedCountType = type;
  }

  private _toggleArray<T>(array: ReadonlyArray<T>, item: T): ReadonlyArray<T> {
    const index = array.indexOf(item);
    if (index >= 0) {
      return [...array.slice(0, index), ...array.slice(index + 1)];
    }
    return [...array, item];
  }
}
