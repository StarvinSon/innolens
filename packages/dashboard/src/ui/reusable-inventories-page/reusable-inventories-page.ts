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
  ReusableInventoryService, ReusableInventoryType, ReusableInventoryMemberCountHistoryGroupBy,
  ReusableInventoryInstance, ReusableInventoryMemberCountType,
  ReusableInventoryMemberCountHistory
} from '../../services/reusable-inventory';
import { mergeArray } from '../../utils/immutable/array';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './reusable-inventories-page.scss';


const pastDaysChoices = [1, 2, 7, 30, 60, 120, 360];

const groupByChoices: ReadonlyArray<{
  readonly type: ReusableInventoryMemberCountHistoryGroupBy,
  readonly name: string
}> = [
  {
    type: 'department',
    name: 'Department'
  },
  {
    type: 'typeOfStudy',
    name: 'Type of Study'
  },
  {
    type: 'studyProgramme',
    name: 'Study Programme'
  },
  {
    type: 'yearOfStudy',
    name: 'Year of Study'
  },
  {
    type: 'affiliatedStudentInterestGroup',
    name: 'Affiliated Student Interest Group'
  }
];

const countTypeChoices: ReadonlyArray<{
  readonly type: ReusableInventoryMemberCountType,
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


const TAG_NAME = 'inno-reusable-inventories-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ReusableInventoriesPage;
  }
}

@customElement(TAG_NAME)
export class ReusableInventoriesPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(ReusableInventoryService)
  @observeProperty('_onDependencyInjected')
  public reusableInventoryService: ReusableInventoryService | null;


  @property({ attribute: false })
  public interactable = false;


  @property({ attribute: false })
  private _types: ReadonlyArray<ReusableInventoryType> | null = null;

  @property({ attribute: false })
  private _selectedTypeIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _instances: ReadonlyArray<ReusableInventoryInstance> | null = null;

  @property({ attribute: false })
  private _selectedInstanceIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _selectedGroupBy: ReusableInventoryMemberCountHistoryGroupBy | null = null;

  @property({ attribute: false })
  private _selectedPastDays = 7;

  @property({ attribute: false })
  private _selectedCountType: ReusableInventoryMemberCountType = 'useCounts';

  @property({ attribute: false })
  private _countHistory: ReusableInventoryMemberCountHistory | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;


  private _selectedTypeIdsDeps: readonly [ReadonlyArray<ReusableInventoryType> | null] = [null];

  // eslint-disable-next-line max-len
  private _selectedInstanceIdsDeps: readonly [ReadonlyArray<ReusableInventoryInstance> | null] = [null];

  private _lineChartDataDeps: readonly [
    ReusableInventoryMemberCountHistory | null,
    ReusableInventoryMemberCountType | null
  ] = [null, null];


  public constructor() {
    super();
    this._onReusableInventoryServiceUpdated = this._onReusableInventoryServiceUpdated.bind(this);
    this.reusableInventoryService = null;
  }


  private _onDependencyInjected(): void {
    if (this.reusableInventoryService !== null) {
      this.reusableInventoryService.addEventListener('types-updated', this._onReusableInventoryServiceUpdated);
      this.reusableInventoryService.addEventListener('instances-updated', this._onReusableInventoryServiceUpdated);
      this.reusableInventoryService.addEventListener('member-count-history-updated', this._onReusableInventoryServiceUpdated);
      this._updateProperties();
    }
  }

  private _onReusableInventoryServiceUpdated(): void {
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
    if (this.reusableInventoryService === null) return;

    this._types = this.reusableInventoryService.types;
    if (this._types === null) {
      this.reusableInventoryService.updateTypes();
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
      this._instances = this.reusableInventoryService.getInstances(this._selectedTypeIds[0]);
      if (this._instances === null) {
        this.reusableInventoryService.updateInstances(this._selectedTypeIds[0]);
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
        this._selectedPastDays * 24,
        this._selectedTypeIds.length > 0 ? this._selectedTypeIds : undefined,
        this._selectedInstanceIds.length > 0 ? this._selectedInstanceIds : undefined,
        this._selectedGroupBy ?? undefined,
        this._selectedCountType ?? undefined
      ] as const;
      this._countHistory = this.reusableInventoryService.getMemberCountHistory(...opts);
      if (this._countHistory === null) {
        this.reusableInventoryService.updateMemberCountHistory(...opts);
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
              .map((record) => record.counts[group])
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
          title: 'Filter - Past Days',
          items: pastDaysChoices,
          selectItem: (days) => days === this._selectedPastDays,
          formatItem: (day) => html`${day} Days`,
          onClick: (day) => this._onPastDaysChipClick(day)
        })}

        ${this._renderChipOptions({
          title: 'Filter - Reusable Inventory Type',
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
          title: 'Filter - Reusable Inventory Instance',
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
          items: [
            {
              type: null,
              name: 'None'
            },
            ...groupByChoices
          ],
          selectItem: (choice) => this._selectedGroupBy === choice.type,
          formatItem: (choice) => choice.name,
          onClick: (choice) => this._onGroupByChipClick(choice.type)
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
            <span slot="title">Reusable Inventory Usage History</span>
          </inno-line-chart>
        </inno-chart-card>
      </div>
    `;
  }

  private _onPastDaysChipClick(day: number): void {
    this._selectedPastDays = day;
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

  private _onGroupByChipClick(groupBy: ReusableInventoryMemberCountHistoryGroupBy | null): void {
    this._selectedGroupBy = groupBy;
  }

  private _onCountTypeChipClick(type: ReusableInventoryMemberCountType): void {
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
