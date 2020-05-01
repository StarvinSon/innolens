import {
  subDays, format as formatDate, startOfMinute,
  setMinutes
} from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import {
  customElement, LitElement, TemplateResult,
  html,
  property,
  PropertyValues
} from 'lit-element';

import '../chart-card';
import '../choice-chips';
import '../choice-chip';
import '../figure';
import '../line-chart-2';
import {
  SpaceService, Space,
  SpaceMemberCountHistoryGroupBy, SpaceMemberCountHistoryCountType, SpaceMemberCountForecast,
  SpaceMemberCountHistory, SpaceCorrelation
} from '../../services/space';
import { toggleNullableArray } from '../../utils/array';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { stackYs } from '../line-chart-2/stack-ys';

import { css, classes } from './spaces-page.scss';


const pastDaysChoices = [1, 2, 3, 7, 14, 30, 60, 120, 180, 360];

const groupByChoices: ReadonlyArray<{
  readonly type: SpaceMemberCountHistoryGroupBy | null;
  readonly name: string;
}> = [
  {
    type: null,
    name: 'None'
  },
  {
    type: 'space',
    name: 'Space'
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
  readonly type: SpaceMemberCountHistoryCountType;
  readonly name: string;
}> = [
  {
    type: 'enter',
    name: 'Enter'
  },
  {
    type: 'exit',
    name: 'Exit'
  },
  {
    type: 'stay',
    name: 'Stay'
  },
  {
    type: 'uniqueEnter',
    name: 'Unique Enter'
  },
  {
    type: 'uniqueExit',
    name: 'Unique Exit'
  },
  {
    type: 'uniqueStay',
    name: 'Unique Stay'
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


const TAG_NAME = 'inno-spaces-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: SpacesPage;
  }
}

@customElement(TAG_NAME)
export class SpacesPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(SpaceService)
  @observeProperty('_onServiceInjected')
  public spaceService: SpaceService | null = null;


  @property({ attribute: false })
  private _selectedPastDays = 7;

  @property({ attribute: false })
  private _selectedSpaceIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  private _selectedCorrelationSpaceId: string | null = null;

  @property({ attribute: false })
  private _selectedGroupBy: SpaceMemberCountHistoryGroupBy | null = null;

  @property({ attribute: false })
  private _selectedCountType: SpaceMemberCountHistoryCountType = 'stay';

  @property({ attribute: false })
  private _selectedChartStyle: ChartStyle = 'normal';


  @property({ attribute: false })
  private _fromTime: Date | null = null;

  @property({ attribute: false })
  private _toTime: Date | null = null;

  @property({ attribute: false })
  private readonly _timeStepMs = 1800000;


  private _spaceFetched = false;

  @property({ attribute: false })
  private _spaces: ReadonlyArray<Space> | null = null;


  private _historyKey: string | null = null;

  @property({ attribute: false })
  private _history: SpaceMemberCountHistory | null = null;


  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: SpaceMemberCountForecast | null = null;


  private _correlationKey: string | null = null;

  @property({ attribute: false })
  private _correlation: SpaceCorrelation | null = null;


  private _chartPropsDeps: readonly [
    SpaceMemberCountHistory | null,
    SpaceMemberCountForecast | null,
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


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.spaceService === null) return;

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

    if (!this._spaceFetched) {
      this.spaceService
        .fetchSpaces()
        .then((spaces) => {
          this._spaces = spaces;
        })
        .catch((err) => {
          console.error(err);
          this._spaces = null;
        });
      this._spaceFetched = true;
    }

    const historyKey = JSON.stringify({
      fromTime: this._fromTime,
      toTime: this._toTime,
      timeStepMs: this._timeStepMs,
      filterSpaceIds: this._selectedCorrelationSpaceId === null
        ? this._selectedSpaceIds
        : [...this._selectedSpaceIds!, this._selectedCorrelationSpaceId],
      groupBy: this._selectedGroupBy,
      countType: this._selectedCountType
    });
    if (this._historyKey !== historyKey) {
      if (this._fromTime === null || this._toTime === null) {
        this._history = null;
      } else {
        this.spaceService
          .fetchMemberCountHistory({
            fromTime: this._fromTime,
            toTime: this._toTime,
            timeStepMs: this._timeStepMs,
            filterSpaceIds: this._selectedCorrelationSpaceId === null
              ? this._selectedSpaceIds
              : [...this._selectedSpaceIds!, this._selectedCorrelationSpaceId],
            groupBy: this._selectedGroupBy,
            countType: this._selectedCountType
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
      fromTime: this._toTime,
      filterSpaceIds: this._selectedCorrelationSpaceId === null
        ? this._selectedSpaceIds
        : [...this._selectedSpaceIds!, this._selectedCorrelationSpaceId],
      groupBy: this._selectedGroupBy,
      countType: this._selectedCountType
    });
    if (this._forecastKey !== forecastKey) {
      if (this._toTime === null) {
        this._forecast = null;
      } else {
        this.spaceService
          .fetchMemberCountForecast({
            fromTime: this._toTime,
            filterSpaceIds: this._selectedCorrelationSpaceId === null
              ? this._selectedSpaceIds
              : [...this._selectedSpaceIds!, this._selectedCorrelationSpaceId],
            groupBy: this._selectedGroupBy,
            countType: this._selectedCountType
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

    if (this._selectedCorrelationSpaceId === null) {
      this._correlation = null;
    } else {
      const correlationKey = JSON.stringify({
        fromTime: subDays(this._toTime, 14),
        timeStepMs: 7200000,
        filterSpaceIds: [this._selectedSpaceIds![0], this._selectedCorrelationSpaceId],
        countType: this._selectedCountType
      });
      if (this._correlationKey !== correlationKey) {
        this.spaceService
          .fetchCorrelation({
            fromTime: subDays(this._toTime, 14),
            timeStepMs: 7200000,
            filterSpaceIds: [this._selectedSpaceIds![0], this._selectedCorrelationSpaceId],
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
        title: 'Space',
        items: [
          {
            spaceId: null,
            spaceName: 'All'
          },
          ...this._spaces ?? []
        ],
        selectItem: (item) => item.spaceId === null
          ? this._selectedSpaceIds === null
          : this._selectedSpaceIds !== null && this._selectedSpaceIds.includes(item.spaceId),
        formatItem: (item) => item.spaceName,
        onClick: (item) => this._onSpaceChipClick(item.spaceId)
      })}

      ${this._renderChipOptions({
        title: 'Correlate with',
        items: [
          {
            spaceId: null,
            spaceName: 'None'
          },
          ...this._spaces ?? []
        ],
        selectItem: (item) => item.spaceId === null
          ? this._selectedCorrelationSpaceId === null
          : this._selectedCorrelationSpaceId === item.spaceId,
        disableItem: (item) => item.spaceId !== null
          && (this._selectedSpaceIds === null
          || this._selectedSpaceIds.length > 1
          || this._selectedSpaceIds.includes(item.spaceId)),
        formatItem: (item) => item.spaceName,
        onClick: (item) => this._onCorrelationChipClick(item.spaceId)
      })}

      ${this._renderChipOptions({
        title: 'Group By',
        items: groupByChoices,
        selectItem: (item) => item.type === this._selectedGroupBy,
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
              @click="${() => options.onClick(item)}">
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
          <span slot="title">Space Member Count History</span>
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

    const selectedSpaces = this._spaces!.filter(
      (space) =>
        space.spaceId === this._selectedSpaceIds![0]
        || space.spaceId === this._selectedCorrelationSpaceId
    );

    if (corrcoef === -2) {
      return html`There are not enough access records available to calculate the correlation coefficient.`;
    }

    let tendency;
    if (corrcoef < -0.7) {
      tendency = 'very unlikely';
    } else if (corrcoef < -0.3) {
      tendency = 'unlikely';
    } else if (corrcoef < 0.3) {
      return html`${selectedSpaces[0].spaceName} and ${selectedSpaces[1].spaceName} have no particular relationship between their access records.`;
    } else if (corrcoef < 0.7) {
      tendency = 'likely';
    } else {
      tendency = 'very likely';
    }

    let action;
    if (this._selectedCountType === 'enter' || this._selectedCountType === 'uniqueEnter') {
      action = ['enter', 'entering'];
    } else if (this._selectedCountType === 'exit' || this._selectedCountType === 'uniqueExit') {
      action = ['exit', 'exiting'];
    } else {
      action = ['stay in', 'staying in'];
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
      <span class="${classes.highlight}">${selectedSpaces[0].spaceName}</span>
      in ${beforeOrAfter} ${action[1]}
      <span class="${classes.highlight}">${selectedSpaces[1].spaceName}</span>.
    `;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _formatLineChartLabel(time: Date, i: number): string {
    return formatDate(time, 'd/M');
  }


  private _onPastDaysChipClick(day: number): void {
    this._selectedPastDays = day;
  }

  private _onSpaceChipClick(spaceId: string | null): void {
    if (spaceId === null) {
      this._selectedSpaceIds = null;
    } else {
      this._selectedSpaceIds = toggleNullableArray(this._selectedSpaceIds, spaceId);
    }

    if (this._selectedSpaceIds === null || this._selectedSpaceIds.length > 1) {
      this._selectedCorrelationSpaceId = null;
    }
  }

  private _onCorrelationChipClick(spaceId: string | null): void {
    if (spaceId === null) {
      this._selectedCorrelationSpaceId = null;
    } else {
      this._selectedCorrelationSpaceId = spaceId;
      this._selectedGroupBy = 'space';
    }
  }

  private _onCountTypeChipClick(type: SpaceMemberCountHistoryCountType): void {
    this._selectedCountType = type;
  }

  private _onGroupByChipClick(groupBy: SpaceMemberCountHistoryGroupBy | null): void {
    this._selectedGroupBy = groupBy;
  }

  private _onChartStyleChipClick(groupBy: ChartStyle): void {
    this._selectedChartStyle = groupBy;
  }
}
