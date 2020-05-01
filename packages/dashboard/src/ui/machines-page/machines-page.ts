import {
  format as formatDate, startOfMinute, setMinutes,
  subDays
} from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

import '../choice-chip';
import '../choice-chips';
import '../chart-card';
import '../figure';
import '../line-chart-2';
import {
  MachineService, MachineType, MachineInstance,
  MachineMemberCountHistory, MachineMemberCountHistoryGroupBy,
  MachineMemberCountHistoryCountType,
  MachineMemberCountForecast, MachineCorrelation
} from '../../services/machine';
import { toggleNullableArray } from '../../utils/array';
import { mergeArray } from '../../utils/immutable/array';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { stackYs } from '../line-chart-2/stack-ys';

import { css, classes } from './machines-page.scss';


const pastDaysChoices = [1, 2, 3, 7, 14, 30, 60, 120, 180, 360];

const groupByChoices: ReadonlyArray<{
  readonly type: MachineMemberCountHistoryGroupBy,
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
    type: 'instance',
    name: 'Instance'
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
  readonly type: MachineMemberCountHistoryCountType,
  readonly name: string
}> = [
  {
    type: 'acquire',
    name: 'Acquire'
  },
  {
    type: 'release',
    name: 'Release'
  },
  {
    type: 'use',
    name: 'Use'
  },
  {
    type: 'uniqueAcquire',
    name: 'Unique Acquire'
  },
  {
    type: 'uniqueRelease',
    name: 'Unique Release'
  },
  {
    type: 'uniqueUse',
    name: 'Unique Use'
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
  @observeProperty('_onServiceInjected')
  public machineService: MachineService | null;


  @property({ attribute: false })
  private _selectedPastDays = 7;

  @property({ attribute: false })
  private _selectedTypeIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _selectedCorrelationTypeId: string | null = null;

  @property({ attribute: false })
  private _selectedInstanceIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _selectedGroupBy: MachineMemberCountHistoryGroupBy | null = null;

  @property({ attribute: false })
  private _selectedCountType: MachineMemberCountHistoryCountType = 'use';

  @property({ attribute: false })
  private _selectedChartStyle: ChartStyle = 'normal';


  @property({ attribute: false })
  private _fromTime: Date | null = null;

  @property({ attribute: false })
  private _toTime: Date | null = null;

  @property({ attribute: false })
  private readonly _timeStepMs = 1800000;


  private _typeFetched = false;

  @property({ attribute: false })
  private _types: ReadonlyArray<MachineType> | null = null;


  private _instanceKey: string | null = null;

  @property({ attribute: false })
  private _instances: ReadonlyArray<MachineInstance> | null = null;


  private _historyKey: string | null = null;

  @property({ attribute: false })
  private _history: MachineMemberCountHistory | null = null;


  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: MachineMemberCountForecast | null = null;


  private _correlationKey: string | null = null;

  @property({ attribute: false })
  private _correlation: MachineCorrelation | null = null;


  private _chartPropsDeps: readonly [
    MachineMemberCountHistory | null,
    MachineMemberCountForecast | null,
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
    this.machineService = null;
  }

  private _onServiceInjected(): void {
    this.requestUpdate();
  }


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.machineService === null) return;

    if (this._toTime === null) {
      let toTime = new Date();
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
      this.machineService
        .fetchTypes()
        .then((types) => {
          this._types = types;
        })
        .catch((err) => {
          console.error(err);
          this._types = null;
        });
      this._typeFetched = true;
    }

    if (this._types === null || this._selectedTypeIds === null) {
      this._selectedTypeIds = null;
    } else {
      const typeIds = new Set(this._types.map((type) => type.typeId));
      const newSelectedTypeIds = this._selectedTypeIds.filter((id) => typeIds.has(id));
      if (newSelectedTypeIds.length === 0) {
        this._selectedTypeIds = null;
      } else {
        this._selectedTypeIds = mergeArray(this._selectedTypeIds, newSelectedTypeIds);
      }
    }

    const instanceKey = JSON.stringify({ typeId: this._selectedTypeIds });
    if (this._instanceKey !== instanceKey) {
      if (this._selectedTypeIds === null || this._selectedTypeIds.length !== 1) {
        this._instances = null;
      } else {
        this.machineService
          .fetchInstances(this._selectedTypeIds[0])
          .then((instances) => {
            if (this._instanceKey === instanceKey) {
              this._instances = instances;
            }
          })
          .catch((err) => {
            console.error(err);
            if (this._instanceKey === instanceKey) {
              this._instances = null;
            }
          });
      }
      this._instanceKey = instanceKey;
    }

    if (this._instances === null || this._selectedInstanceIds === null) {
      this._selectedInstanceIds = null;
    } else {
      const ids = new Set(this._instances.map((instance) => instance.instanceId));
      const newSelectedInstanceIds = this._selectedInstanceIds.filter((id) => ids.has(id));
      if (newSelectedInstanceIds.length === 0) {
        this._selectedInstanceIds = null;
      } else {
        this._selectedInstanceIds = mergeArray(this._selectedInstanceIds, newSelectedInstanceIds);
      }
    }

    const historyKey = JSON.stringify({
      fromTime: this._fromTime,
      toTime: this._toTime,
      timeStepMs: this._timeStepMs,
      filterTypeIds: this._selectedCorrelationTypeId === null
        ? this._selectedTypeIds
        : [...this._selectedTypeIds!, this._selectedCorrelationTypeId],
      filterInstanceIds: this._selectedInstanceIds,
      groupBy: this._selectedGroupBy,
      countType: this._selectedCountType
    });
    if (this._historyKey !== historyKey) {
      if (this._fromTime === null || this._toTime === null) {
        this._history = null;
      } else {
        this.machineService
          .fetchMemberCountHistory({
            fromTime: this._fromTime,
            toTime: this._toTime,
            timeStepMs: this._timeStepMs,
            filterTypeIds: this._selectedCorrelationTypeId === null
              ? this._selectedTypeIds
              : [...this._selectedTypeIds!, this._selectedCorrelationTypeId],
            filterInstanceIds: this._selectedInstanceIds,
            groupBy: this._selectedGroupBy,
            countType: this._selectedCountType
          })
          .then((history) => {
            if (this._historyKey === historyKey) {
              this._history = history;
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
      fromTime: this._toTime,
      filterTypeIds: this._selectedCorrelationTypeId === null
        ? this._selectedTypeIds
        : [...this._selectedTypeIds!, this._selectedCorrelationTypeId],
      filterInstanceIds: this._selectedInstanceIds,
      groupBy: this._selectedGroupBy,
      countType: this._selectedCountType
    });
    if (this._forecastKey !== forecastKey) {
      if (this._toTime === null) {
        this._forecast = null;
      } else {
        this.machineService
          .fetchMemberCountForecast({
            fromTime: this._toTime,
            filterTypeIds: this._selectedCorrelationTypeId === null
              ? this._selectedTypeIds
              : [...this._selectedTypeIds!, this._selectedCorrelationTypeId],
            filterInstanceIds: this._selectedInstanceIds,
            groupBy: this._selectedGroupBy,
            countType: this._selectedCountType
          })
          .then((forecast) => {
            if (this._forecastKey === forecastKey) {
              this._forecast = forecast;
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

    if (this._selectedCorrelationTypeId === null) {
      this._correlation = null;
    } else {
      const correlationKey = JSON.stringify({
        fromTime: subDays(this._toTime, 14),
        timeStepMs: 7200000,
        filterTypeIds: [this._selectedTypeIds![0], this._selectedCorrelationTypeId],
        countType: this._selectedCountType
      });
      if (this._correlationKey !== correlationKey) {
        this.machineService
          .fetchCorrelation({
            fromTime: subDays(this._toTime, 14),
            timeStepMs: 7200000,
            filterTypeIds: [this._selectedTypeIds![0], this._selectedCorrelationTypeId],
            countType: this._selectedCountType
          })
          .then((data) => {
            if (this._correlationKey === correlationKey) {
              this._correlation = data;
            }
          })
          .catch((err) => {
            console.error(err);
            if (this._correlationKey === correlationKey) {
              this._correlation = null;
            }
          });
      }
      this._correlationKey = correlationKey;
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
        const groups = Array.from(new Set(
          this._history.groups.concat(this._forecast.groups)
        ));
        this._chartYs = groups.map((group) => {
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
        this._chartLineLabels = groups;
      }
      this._chartPropsDeps = [this._history, this._forecast, this._selectedChartStyle];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.options}">
        ${this._renderOptions()}
      </div>
      <div class="${classes.charts}">
        ${this._renderLineChart()}
        ${this._renderCorrelation()}
      </div>
    `;
  }

  private _renderOptions(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      ${this._renderChipOptions({
        title: 'Past Days',
        items: pastDaysChoices,
        selectItem: (item) => item === this._selectedPastDays,
        formatItem: (item) => html`${item} Days`,
        onClick: (item) => this._onPastDaysChipClick(item)
      })}

      ${this._renderChipOptions({
        title: 'Type',
        items: this._types === null ? emptyArray : [
          {
            typeId: null,
            typeName: 'All'
          },
          ...this._types
        ],
        selectItem: (item) => item.typeId === null
          ? this._selectedTypeIds === null
          : this._selectedTypeIds !== null && this._selectedTypeIds.includes(item.typeId),
        formatItem: (item) => item.typeName,
        onClick: (item) => this._onTypeChipClick(item.typeId)
      })}

      ${this._renderChipOptions({
        title: 'Correlate with',
        items: [
          {
            typeId: null,
            typeName: 'None'
          },
          ...this._types ?? []
        ],
        selectItem: (item) => item.typeId === null
          ? this._selectedCorrelationTypeId === null
          : this._selectedCorrelationTypeId === item.typeId,
        disableItem: (item) => item.typeId !== null
          && (this._selectedTypeIds === null
          || this._selectedTypeIds.length > 1
          || this._selectedTypeIds.includes(item.typeId)),
        formatItem: (item) => item.typeName,
        onClick: (item) => this._onCorrelationChipClick(item.typeId)
      })}

      ${this._renderChipOptions({
        title: 'Instance',
        items: this._instances === null ? emptyArray : [
          {
            instanceId: null,
            instanceName: 'All'
          },
          ...this._instances
        ],
        selectItem: (item) => item.instanceId === null
          ? this._selectedInstanceIds === null
          // eslint-disable-next-line max-len
          : this._selectedInstanceIds !== null && this._selectedInstanceIds.includes(item.instanceId),
        formatItem: (item) => item.instanceName,
        onClick: (item) => this._onInstanceChipClick(item.instanceId)
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
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderChipOptions<T>(options: {
    readonly title: unknown,
    readonly items: ReadonlyArray<T>,
    readonly selectItem: (item: T) => boolean,
    readonly disableItem?: (item: T) => boolean,
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
              .disabled="${options.disableItem?.(item) ?? false}"
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
          <span slot="title">Reusable Inventory Member Count History & Forecast</span>
        </inno-line-chart-2>
      </inno-chart-card>
    `;
  }

  private _renderCorrelation(): TemplateResult {
    if (this._correlation === null) return html``;

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.correlation}">
        <inno-chart-card class="${classes.corrcoef}">
          <inno-figure>
            <span slot="title">Correlation Coefficient</span>
            <span slot="value">
              ${this._correlation.corrcoef === -2
                ? 'N/A'
                : Math.round(this._correlation.corrcoef * 100) / 100}
            </span>
          </inno-figure>
        </inno-chart-card>

        <div class="${classes.description}">
          <span>${this._getDescription()}</span>
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _getDescription(): TemplateResult {
    const { offset, corrcoef } = this._correlation!;

    const selectedTypes = this._types!.filter(
      (type) =>
        type.typeId === this._selectedTypeIds![0]
        || type.typeId === this._selectedCorrelationTypeId
    );

    if (corrcoef === -2) {
      return html`There are not enough usage data available to calculate the correlation coefficient.`;
    }

    let tendency;
    if (corrcoef < -0.7) {
      tendency = 'very unlikely';
    } else if (corrcoef < -0.3) {
      tendency = 'unlikely';
    } else if (corrcoef < 0.3) {
      return html`${selectedTypes[0].typeName} and ${selectedTypes[1].typeName} have no particular relationship between their usage data.`;
    } else if (corrcoef < 0.7) {
      tendency = 'likely';
    } else {
      tendency = 'very likely';
    }

    let action;
    if (this._selectedCountType === 'acquire' || this._selectedCountType === 'uniqueAcquire') {
      action = ['acquire', 'acquiring'];
    } else if (this._selectedCountType === 'release' || this._selectedCountType === 'uniqueRelease') {
      action = ['release', 'releasing'];
    } else {
      action = ['use', 'using'];
    }

    const hours = Math.abs(offset) * 2;
    let beforeOrAfter;
    if (offset < 0) {
      beforeOrAfter = `${hours - 1} to ${hours + 1} hours before`;
    } else if (offset === 0) {
      beforeOrAfter = 'less than 1 hour before or after';
    } else {
      beforeOrAfter = `${hours - 1} to ${hours + 1} hours after`;
    }

    return html`
      Users are ${tendency} to ${action[0]}
      <span class="${classes.highlight}">${selectedTypes[0].typeName}</span>
      in ${beforeOrAfter} ${action[1]}
      <span class="${classes.highlight}">${selectedTypes[1].typeName}</span>.
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
      this._selectedTypeIds = emptyArray;
    } else {
      this._selectedTypeIds = toggleNullableArray(this._selectedTypeIds, typeId);
    }

    if (this._selectedTypeIds === null || this._selectedTypeIds.length !== 1) {
      this._selectedCorrelationTypeId = null;
    }
  }

  private _onCorrelationChipClick(typeId: string | null): void {
    if (typeId === null) {
      this._selectedCorrelationTypeId = null;
    } else {
      this._selectedCorrelationTypeId = typeId;
      this._selectedGroupBy = 'type';
    }
  }

  private _onInstanceChipClick(instanceId: string | null): void {
    if (instanceId === null) {
      this._selectedInstanceIds = emptyArray;
    } else {
      this._selectedInstanceIds = toggleNullableArray(this._selectedInstanceIds, instanceId);
    }
  }

  private _onGroupByChipClick(groupBy: MachineMemberCountHistoryGroupBy | null): void {
    this._selectedGroupBy = groupBy;
  }

  private _onCountTypeChipClick(type: MachineMemberCountHistoryCountType): void {
    this._selectedCountType = type;
  }

  private _onChartStyleChipClick(groupBy: ChartStyle): void {
    this._selectedChartStyle = groupBy;
  }
}
