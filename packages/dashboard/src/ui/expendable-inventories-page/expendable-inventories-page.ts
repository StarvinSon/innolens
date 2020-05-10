import {
  subDays, startOfMinute, setMinutes,
  format as formatDate
} from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

import '../choice-chip';
import '../choice-chips';
import '../chart-card';
import '../line-chart-2';
import {
  ExpendableInventoryService, ExpendableInventoryType, ExpendableInventoryQuantityHistoryGroupBy,
  ExpendableInventoryQuantityHistoryCountType, ExpendableInventoryQuantityHistory,
  ExpendableInventoryQuantityForecast
} from '../../services/expendable-inventory';
import { toggleNullableArray } from '../../utils/array';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { getTime } from '../../utils/time';
import { stackYs } from '../line-chart-2/stack-ys';

import { css, classes } from './expendable-inventories-page.scss';


const pastDaysChoices = [1, 2, 3, 7, 14, 30, 60, 120, 360];

const groupByChoices: ReadonlyArray<{
  readonly type: ExpendableInventoryQuantityHistoryGroupBy,
  readonly name: string
}> = [
  {
    type: null,
    name: 'None'
  },
  {
    type: 'type',
    name: 'Type'
  },
  {
    type: 'member',
    name: 'Member'
  },
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
  readonly type: ExpendableInventoryQuantityHistoryCountType,
  readonly name: string
}> = [
  {
    type: 'quantity',
    name: 'Quantity'
  },
  {
    type: 'take',
    name: 'Take'
  },
  {
    type: 'uniqueTake',
    name: 'Unique Take'
  }
];

type ChartStyle = 'normal' | 'stacked';

const chartStyleChoices: ReadonlyArray<{
  readonly type: ChartStyle;
  readonly name: string;
}> = [
  {
    type: 'normal',
    name: 'Normal'
  },
  {
    type: 'stacked',
    name: 'Stacked'
  }
];


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
  @observeProperty('_onServiceInjected')
  public expendableInventoryService: ExpendableInventoryService | null = null;


  @property({ attribute: false })
  public interactable = false;


  @property({ attribute: false })
  private _selectedPastDays = 7;

  @property({ attribute: false })
  private _selectedTypeIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _selectedGroupBy: ExpendableInventoryQuantityHistoryGroupBy = null;

  @property({ attribute: false })
  private _selectedCountType: ExpendableInventoryQuantityHistoryCountType = 'quantity';

  @property({ attribute: false })
  private _selectedChartStyle: ChartStyle = 'normal';


  @property({ attribute: false })
  private _fromTime: Date | null = null;

  @property({ attribute: false })
  private _toTime: Date | null = null;

  @property({ attribute: false })
  private readonly _timeStepMs: number = 1800000;


  private _typeFetched = false;

  @property({ attribute: false })
  private _types: ReadonlyArray<ExpendableInventoryType> | null = null;


  private _historyKey: string | null = null;

  @property({ attribute: false })
  private _history: ExpendableInventoryQuantityHistory | null = null;


  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: ExpendableInventoryQuantityForecast | null = null;


  private _chartPropsDeps: readonly [
    ExpendableInventoryQuantityHistory | null,
    ExpendableInventoryQuantityForecast | null,
    ChartStyle | null
  ] = [null, null, null];

  @property({ attribute: false })
  private _chartYs: ReadonlyArray<ReadonlyArray<number>> | null = null;

  @property({ attribute: false })
  private _chartDashedStartIndex: number | null = null;

  @property({ attribute: false })
  private _chartXLabels: ReadonlyArray<Date> | null = null;

  @property({ attribute: false })
  private _chartLineLabels: ReadonlyArray<string> | null = null;


  public constructor() {
    super();
    this._formatLineChartLabel = this._formatLineChartLabel.bind(this);
  }


  private _onServiceInjected(): void {
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

    if (this._toTime === null) {
      let toTime = getTime();
      toTime = utcToZonedTime(toTime, 'Asia/Hong_Kong');
      toTime = startOfMinute(toTime);
      toTime = setMinutes(toTime, Math.floor(toTime.getMinutes() / 30) * 30);
      toTime = zonedTimeToUtc(toTime, 'Asia/Hong_Kong');
      this._toTime = toTime;
    }

    if (this._toTime !== null) {
      const fromTime = subDays(this._toTime, this._selectedPastDays);
      if (
        this._fromTime === null
        || this._fromTime.getTime() !== fromTime.getTime()
      ) {
        this._fromTime = fromTime;
      }
    }

    if (!this._typeFetched) {
      this.expendableInventoryService
        .fetchTypes()
        .then((data) => {
          this._types = data;
        })
        .catch((err) => {
          console.error(err);
        });
      this._typeFetched = true;
    }

    const historyKey = JSON.stringify({
      fromTime: this._fromTime?.toISOString(),
      toTime: this._toTime?.toISOString(),
      timeStepMs: String(this._timeStepMs),
      spaceIds: this._selectedTypeIds,
      countType: this._selectedCountType,
      groupBy: this._selectedGroupBy
    });
    if (this._historyKey !== historyKey) {
      if (this._fromTime === null || this._toTime === null) {
        this._history = null;
      } else {
        this.expendableInventoryService
          .fetchQuantityHistory({
            fromTime: this._fromTime,
            toTime: this._toTime,
            timeStepMs: this._timeStepMs,
            filterTypeIds: this._selectedTypeIds,
            countType: this._selectedCountType,
            groupBy: this._selectedGroupBy
          })
          .then((data) => {
            if (this._historyKey === historyKey) {
              this._history = data;
            }
          })
          .catch((err) => {
            console.error(err);
            if (this._historyKey === historyKey) {
              this._history = null;
            }
          });
      }
      this._historyKey = historyKey;
    }

    const forecastKey = JSON.stringify({
      fromTime: this._toTime?.toISOString(),
      timeStepMs: String(this._timeStepMs),
      typeIds: this._selectedTypeIds,
      countType: this._selectedCountType,
      groupBy: this._selectedGroupBy
    });
    if (this._forecastKey !== forecastKey) {
      if (this._toTime === null) {
        this._forecast = null;
      } else {
        this.expendableInventoryService
          .fetchQuantityForecast({
            fromTime: this._toTime,
            timeStepMs: this._timeStepMs,
            filterTypeIds: this._selectedTypeIds,
            countType: this._selectedCountType,
            groupBy: this._selectedGroupBy
          })
          .then((data) => {
            if (this._forecastKey === forecastKey) {
              this._forecast = data;
            }
          })
          .catch((err) => {
            console.error(err);
            if (this._forecastKey === forecastKey) {
              this._forecast = null;
            }
          });
      }
      this._forecastKey = forecastKey;
    }

    if (
      this._chartPropsDeps[0] !== this._history
      || this._chartPropsDeps[1] !== this._forecast
      || this._chartPropsDeps[2] !== this._selectedChartStyle
    ) {
      if (this._history === null || this._forecast === null) {
        this._chartYs = null;
        this._chartDashedStartIndex = null;
        this._chartXLabels = null;
        this._chartLineLabels = null;
      } else {
        this._chartLineLabels = Array.from(new Set(
          this._history.groups.concat(this._forecast.groups)
        ));
        this._chartYs = this._chartLineLabels.map((group) => {
          const historyG = this._history!.groups.indexOf(group);
          const forecastG = this._forecast!.groups.indexOf(group);
          const historyGroupY = historyG >= 0
            ? this._history!.values[historyG]
            : this._history!.timeSpans.map(() => 0);
          const forecastGroupY = forecastG >= 0
            ? this._forecast!.values[forecastG]
            : this._forecast!.timeSpans.map(() => 0);
          return historyGroupY.concat(forecastGroupY);
        });
        if (this._selectedChartStyle === 'stacked') {
          this._chartYs = stackYs(this._chartYs);
        }
        this._chartDashedStartIndex = this._history.timeSpans.length - 1;
        this._chartXLabels = this._history.timeSpans.concat(this._forecast.timeSpans)
          .map(([, endTime]) => endTime);
      }
      this._chartPropsDeps = [this._history, this._forecast, this._selectedChartStyle];
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
          title: 'Past Days',
          items: pastDaysChoices,
          selectItem: (item) => item === this._selectedPastDays,
          formatItem: (item) => html`${item} Days`,
          onClick: (item) => this._onPastDaysChipClick(item)
        })}

        ${this._renderChipOptions({
          title: 'Inventory Type',
          items: [
            {
              typeId: null,
              typeName: 'All'
            },
            ...this._types ?? []
          ],
          selectItem: (item) => item.typeId === null
            ? this._selectedTypeIds !== null && this._selectedTypeIds.length === 0
            : this._selectedTypeIds !== null && this._selectedTypeIds.includes(item.typeId),
          formatItem: (item) => item.typeName,
          onClick: (item) => this._onTypeChipClick(item.typeId)
        })}

        ${this._renderChipOptions({
          title: 'Group By',
          items: groupByChoices,
          selectItem: (item) => this._selectedGroupBy === item.type,
          formatItem: (item) => item.name,
          onClick: (item) => this._onGroupByChipClick(item.type)
        })}

        ${this._renderChipOptions({
          title: 'Count Type',
          items: countTypeChoices,
          selectItem: (item) => item.type === this._selectedCountType,
          formatItem: (item) => item.name,
          onClick: (item) => this._onCountTypeChipClick(item.type)
        })}

        ${this._renderChipOptions({
          title: 'Chart Style',
          items: chartStyleChoices,
          selectItem: (item) => item.type === this._selectedChartStyle,
          formatItem: (item) => item.name,
          onClick: (item) => this._onChartStyleChipClick(item.type)
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
          <inno-line-chart-2
            class="${classes.lineChart}"
            .ys="${this._chartYs}"
            .dashedStartIndex="${this._chartDashedStartIndex}"
            .xLabels="${this._chartXLabels}"
            .lineLabels="${this._chartLineLabels}"
            .formatXLabel="${this._formatLineChartLabel}"
            .fill="${this._selectedChartStyle === 'stacked'}"
          >
            <span slot="title">Expendable Inventory Quantity History & Forecast</span>
          </inno-line-chart-2>
        </inno-chart-card>
      </div>
    `;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _formatLineChartLabel(time: Date, i: number): string {
    return formatDate(time, 'd/M');
  }


  private _onPastDaysChipClick(day: number): void {
    this._selectedPastDays = day;
  }

  private _onTypeChipClick(typeId: string | null): void {
    if (typeId === null) {
      this._selectedTypeIds = null;
    } else {
      this._selectedTypeIds = toggleNullableArray(this._selectedTypeIds, typeId);
    }
  }

  private _onGroupByChipClick(
    groupBy: ExpendableInventoryQuantityHistoryGroupBy
  ): void {
    this._selectedGroupBy = groupBy;
  }

  private _onCountTypeChipClick(
    type: ExpendableInventoryQuantityHistoryCountType
  ): void {
    this._selectedCountType = type;
  }

  private _onChartStyleChipClick(groupBy: ChartStyle): void {
    this._selectedChartStyle = groupBy;
  }
}
