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
import '../line-chart-2';
import {
  SpaceService, Space,
  SpaceMemberCountHistoryGroupBy, SpaceMemberCountHistoryCountType, SpaceMemberCountForecast,
  SpaceMemberCountHistory2
} from '../../services/space';
import { toggleNullableArray } from '../../utils/array';
import { generateKey } from '../../utils/key';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './spaces-page.scss';


const pastDaysChoices: ReadonlyArray<number> = [
  1,
  2,
  3,
  7,
  14,
  30,
  60,
  90,
  180,
  360
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

const groupByChoices: ReadonlyArray<{
  readonly type: SpaceMemberCountHistoryGroupBy | null;
  readonly name: string;
}> = [
  {
    type: null,
    name: 'None'
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
  },
  {
    type: 'space',
    name: 'Space'
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
  private _selectedCountType: SpaceMemberCountHistoryCountType = 'stay';

  @property({ attribute: false })
  private _selectedGroupBy: SpaceMemberCountHistoryGroupBy | null = null;

  @property({ attribute: false })
  private _selectedChartStyle: ChartStyle = 'normal';


  @property({ attribute: false })
  private _selectedFromTime: Date | null = null;

  @property({ attribute: false })
  private _selectedToTime: Date | null = null;

  @property({ attribute: false })
  private readonly _selectedTimeStepMs = 1800000;


  private _spaceFetched = false;

  @property({ attribute: false })
  private _spaces: ReadonlyArray<Space> | null = null;


  private _historyKey: string | null = null;

  @property({ attribute: false })
  private _history: SpaceMemberCountHistory2 | null = null;


  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: SpaceMemberCountForecast | null = null;


  private _chartPropsDeps: readonly [
    SpaceMemberCountHistory2 | null,
    SpaceMemberCountForecast | null
  ] = [null, null];

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

    if (this._selectedToTime === null) {
      let toTime = new Date();
      toTime = utcToZonedTime(toTime, 'Asia/Hong_Kong');
      toTime = startOfMinute(toTime);
      toTime = setMinutes(toTime, Math.floor(toTime.getMinutes() / 30) * 30);
      toTime = zonedTimeToUtc(toTime, 'Asia/Hong_Kong');
      this._selectedToTime = toTime;
    }

    if (this._selectedToTime !== null) {
      const fromTime = subDays(this._selectedToTime, this._selectedPastDays);
      if (
        this._selectedFromTime === null
        || this._selectedFromTime.getTime() !== fromTime.getTime()
      ) {
        this._selectedFromTime = fromTime;
      }
    }

    if (!this._spaceFetched) {
      this.spaceService
        .fetchSpaces()
        .then((spaces) => {
          this._spaces = spaces;
        });
      this._spaceFetched = true;
    }

    const historyKey = generateKey({
      fromTime: this._selectedFromTime?.toISOString(),
      toTime: this._selectedToTime?.toISOString(),
      timeStepMs: String(this._selectedTimeStepMs),
      spaceIds: this._selectedSpaceIds?.map(encodeURIComponent).join(',') ?? undefined,
      countType: this._selectedCountType,
      groupBy: this._selectedGroupBy ?? undefined
    });
    if (this._historyKey !== historyKey) {
      if (this._selectedFromTime === null || this._selectedToTime === null) {
        this._history = null;
      } else {
        this.spaceService
          .fetchMemberCountHistory2({
            fromTime: this._selectedFromTime,
            toTime: this._selectedToTime,
            timeStepMs: this._selectedTimeStepMs,
            filterSpaceIds: this._selectedSpaceIds,
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

    const forecastKey = generateKey({
      fromTime: this._selectedToTime?.toISOString(),
      timeStepMs: String(this._selectedTimeStepMs),
      spaceIds: this._selectedSpaceIds?.map(encodeURIComponent).join(','),
      countType: this._selectedCountType,
      groupBy: this._selectedGroupBy ?? undefined
    });
    if (this._forecastKey !== forecastKey) {
      if (this._selectedToTime === null) {
        this._forecast = null;
      } else {
        this.spaceService
          .fetchMemberCountForecast({
            fromTime: this._selectedToTime,
            timeStepMs: this._selectedTimeStepMs,
            filterSpaceIds: this._selectedSpaceIds,
            filterMemberIds: null,
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

    if (this._chartPropsDeps[0] !== this._history || this._chartPropsDeps[1] !== this._forecast) {
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
        this._chartDashedStartIndex = this._history.timeSpans.length - 1;
        this._chartXLabels = this._history.timeSpans.concat(this._forecast.timeSpans)
          .map(([, endTime]) => endTime);
      }
      this._chartPropsDeps = [this._history, this._forecast];
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
          selectItem: (space) => space.spaceId === null
            ? this._selectedSpaceIds === null
            : this._selectedSpaceIds !== null && this._selectedSpaceIds.includes(space.spaceId),
          formatItem: (item) => item.spaceName,
          onClick: (space) => this._onSpaceChipClick(space.spaceId)
        })}

        ${this._renderChipOptions({
          title: 'Count Type',
          items: countTypeChoices,
          selectItem: (item) => item.type === this._selectedCountType,
          formatItem: (item) => item.name,
          onClick: (item) => this._onCountTypeChipClick(item.type)
        })}

        ${this._renderChipOptions({
          title: 'Group By',
          items: groupByChoices,
          selectItem: (item) => item.type === this._selectedGroupBy,
          formatItem: (item) => item.name,
          onClick: (item) => this._onGroupByChipClick(item.type)
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
      <div class="${classes.chartCards}">
        <inno-chart-card>
          <inno-line-chart-2
            class="${classes.lineChart}"
            .ys="${this._chartYs}"
            .dashedStartIndex="${this._chartDashedStartIndex}"
            .xLabels="${this._chartXLabels}"
            .lineLabels="${this._chartLineLabels}"
            .formatXLabel="${this._formatLineChartLabel}"
            .stacked="${this._selectedChartStyle === 'stacked'}"
            .fill="${this._selectedChartStyle === 'stacked'}"
          >
            <span slot="title">Space Member Count History</span>
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

  private _onSpaceChipClick(spaceId: string | null): void {
    if (spaceId === null) {
      this._selectedSpaceIds = null;
    } else {
      this._selectedSpaceIds = toggleNullableArray(this._selectedSpaceIds, spaceId);
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
