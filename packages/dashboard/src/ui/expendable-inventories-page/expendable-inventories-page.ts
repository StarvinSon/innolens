import { subDays, startOfDay } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

import '../choice-chip';
import '../choice-chips';
import '../chart-card';
import '../expenable-inventory-access-history-chart'; // eslint-disable-line import/no-duplicates
import '../expenable-inventory-quantity-history-chart'; // eslint-disable-line import/no-duplicates
import {
  ExpendableInventoryService, ExpendableInventoryType
} from '../../services/expendable-inventory';
import { mergeArray } from '../../utils/immutable/array';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { ExpendableInventoryAccessHistoryChart } from '../expenable-inventory-access-history-chart'; // eslint-disable-line import/no-duplicates
import { ExpendableInventoryQuantityHistoryChart } from '../expenable-inventory-quantity-history-chart'; // eslint-disable-line import/no-duplicates

import { css, classes } from './expendable-inventories-page.scss';


const pastDaysChoices = [1, 2, 7, 30, 60, 120, 360];

const quantityHistoryGroupByChoices: ReadonlyArray<{
  readonly type: ExpendableInventoryQuantityHistoryChart['groupBy'],
  readonly name: string
}> = [
  {
    type: 'typeId',
    name: 'Type ID'
  }
];

const accessHistoryGroupByChoices: ReadonlyArray<{
  readonly type: ExpendableInventoryAccessHistoryChart['groupBy'],
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

const accessHistoryCountTypeChoices: ReadonlyArray<{
  readonly type: ExpendableInventoryAccessHistoryChart['countType'],
  readonly name: string
}> = [
  {
    type: 'total',
    name: 'Total'
  },
  {
    type: 'uniqueMember',
    name: 'Unique Member'
  }
];


const emptyArray: ReadonlyArray<never> = [];


const TAG_NAME = 'inno-expendable-inventories-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ExpendableInventoriesPage;
  }
}

@customElement(TAG_NAME)
export class ExpendableInventoriesPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(ExpendableInventoryService)
  @observeProperty('_onDependencyInjected')
  public expendableInventoryService: ExpendableInventoryService | null;


  @property({ attribute: false })
  public interactable = false;


  @property({ attribute: false })
  private _selectedPastDays = 7;

  private _selectedFromTime: Date | null = null;

  private _selectedToTime: Date | null = null;

  private _selectedTimeStepMs: number = 30 * 60 * 1000;

  @property({ attribute: false })
  private _types: ReadonlyArray<ExpendableInventoryType> | null = null;

  @property({ attribute: false })
  private _selectedTypeIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _selectedQuantityHistoryGroupBy: ExpendableInventoryQuantityHistoryChart['groupBy'] | null = null;

  @property({ attribute: false })
  private _selectedAccessHistoryGroupBy: ExpendableInventoryAccessHistoryChart['groupBy'] | null = null;

  @property({ attribute: false })
  private _selectedAccessHistoryCountType: ExpendableInventoryAccessHistoryChart['countType'] = 'total';


  private _selectedTypeIdsDeps: readonly [ReadonlyArray<ExpendableInventoryType> | null] = [null];


  public constructor() {
    super();
    this._onExpendableInventoryServiceUpdated =
      this._onExpendableInventoryServiceUpdated.bind(this);
    this.expendableInventoryService = null;
  }


  private _onDependencyInjected(): void {
    if (this.expendableInventoryService !== null) {
      this.expendableInventoryService.addEventListener('types-updated', this._onExpendableInventoryServiceUpdated);
      this.expendableInventoryService.addEventListener('instances-updated', this._onExpendableInventoryServiceUpdated);
      this._updateProperties();
    }
  }

  private _onExpendableInventoryServiceUpdated(): void {
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
    if (this.expendableInventoryService === null) return;

    if (this._selectedToTime === null) {
      this._selectedToTime = new Date();
    }
    let fromTime = subDays(this._selectedToTime, this._selectedPastDays);
    fromTime = utcToZonedTime(fromTime, 'Asia/Hong_Kong');
    fromTime = startOfDay(fromTime);
    fromTime = zonedTimeToUtc(fromTime, 'Asia/Hong_Kong');
    if (
      this._selectedFromTime === null
      || this._selectedFromTime.getTime() !== fromTime.getTime()
    ) {
      this._selectedFromTime = fromTime;
    }

    this._types = this.expendableInventoryService.types;
    if (this._types === null) {
      this.expendableInventoryService.updateTypes();
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
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderOptions()}
        ${this._renderLineCharts()}
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
          title: 'Filter - Inventory Type',
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
          title: 'Quantity History - Group By',
          items: [
            {
              type: null,
              name: 'None'
            },
            ...quantityHistoryGroupByChoices
          ],
          selectItem: (choice) => this._selectedQuantityHistoryGroupBy === choice.type,
          formatItem: (choice) => choice.name,
          onClick: (choice) => this._onQuantityHistoryGroupByChipClick(choice.type)
        })}

        ${this._renderChipOptions({
          title: 'Access History - Group By',
          items: [
            {
              type: null,
              name: 'None'
            },
            ...accessHistoryGroupByChoices
          ],
          selectItem: (choice) => this._selectedAccessHistoryGroupBy === choice.type,
          formatItem: (choice) => choice.name,
          onClick: (choice) => this._onAccessHistoryGroupByChipClick(choice.type)
        })}

        ${this._renderChipOptions({
          title: 'Access History - Count Type',
          items: accessHistoryCountTypeChoices,
          selectItem: (choice) => choice.type === this._selectedAccessHistoryCountType,
          formatItem: (choice) => choice.name,
          onClick: (choice) => this._onAccessHistoryCountTypeChipClick(choice.type)
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

  private _renderLineCharts(): TemplateResult {
    return html`
      <div class="${classes.chartCards}">

        <inno-chart-card>
          <inno-expendable-inventory-quantity-history-chart
            class="${classes.lineChart}"
            .expendableInventoryService="${this.expendableInventoryService}"
            .fromTime="${this._selectedFromTime}"
            .toTime="${this._selectedToTime}"
            .timeStepMs="${this._selectedTimeStepMs}"
            .typeIds="${this._selectedTypeIds}"
            .groupBy="${this._selectedQuantityHistoryGroupBy}"
          ></inno-expendable-inventory-quantity-history-chart>
        </inno-chart-card>

        <inno-chart-card>
          <inno-expendable-inventory-access-history-chart
            class="${classes.lineChart}"
            .expendableInventoryService="${this.expendableInventoryService}"
            .fromTime="${this._selectedFromTime}"
            .toTime="${this._selectedToTime}"
            .timeStepMs="${this._selectedTimeStepMs}"
            .typeIds="${this._selectedTypeIds}"
            .groupBy="${this._selectedAccessHistoryGroupBy}"
            .countType="${this._selectedAccessHistoryCountType}"
          ></inno-expendable-inventory-access-history-chart>
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

  private _onQuantityHistoryGroupByChipClick(
    groupBy: ExpendableInventoryQuantityHistoryChart['groupBy']
  ): void {
    this._selectedQuantityHistoryGroupBy = groupBy;
  }

  private _onAccessHistoryGroupByChipClick(
    groupBy: ExpendableInventoryAccessHistoryChart['groupBy']
  ): void {
    this._selectedAccessHistoryGroupBy = groupBy;
  }

  private _onAccessHistoryCountTypeChipClick(
    type: ExpendableInventoryAccessHistoryChart['countType']
  ): void {
    this._selectedAccessHistoryCountType = type;
  }

  private _toggleArray<T>(array: ReadonlyArray<T>, item: T): ReadonlyArray<T> {
    const index = array.indexOf(item);
    if (index >= 0) {
      return [...array.slice(0, index), ...array.slice(index + 1)];
    }
    return [...array, item];
  }
}
