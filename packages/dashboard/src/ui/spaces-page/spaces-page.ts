import { subDays, startOfDay } from 'date-fns';
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
import '../space-count-history-chart';
import {
  SpaceService, Space,
  SpaceCountHistoryGroupBy, SpaceCountHistoryCountType
} from '../../services/space';
import { toggleNullableArray } from '../../utils/array';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './spaces-page.scss';


const spaceCountHistoryPastDaysChoices: ReadonlyArray<number> = [
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

const spaceCountHistoryCountTypeChoices: ReadonlyArray<{
  readonly type: SpaceCountHistoryCountType;
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

const spaceCountHistoryGroupByChoices: ReadonlyArray<{
  readonly type: SpaceCountHistoryGroupBy | null;
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
  private _selectedCountType: SpaceCountHistoryCountType = 'stay';

  @property({ attribute: false })
  private _selectedGroupBy: SpaceCountHistoryGroupBy | null = null;


  @property({ attribute: false })
  private _selectedFromTime: Date | null = null;

  @property({ attribute: false })
  private _selectedToTime: Date | null = new Date();

  @property({ attribute: false })
  private _selectedTimeStepMs = 30 * 60 * 1000;


  private _spaceFetched = false;

  @property({ attribute: false })
  private _spaces: ReadonlyArray<Space> | null = null;


  private _onServiceInjected(): void {
    this.requestUpdate();
  }


  protected update(changedProps: PropertyValues): void {
    if (this.spaceService !== null) {
      if (this._selectedToTime !== null) {
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
      }

      if (!this._spaceFetched) {
        this.spaceService
          .fetchSpaces()
          .then((spaces) => {
            this._spaces = spaces;
          });
      }
      this._spaceFetched = true;

    }

    super.update(changedProps);
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
          items: spaceCountHistoryPastDaysChoices,
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
          items: spaceCountHistoryCountTypeChoices,
          selectItem: (item) => item.type === this._selectedCountType,
          formatItem: (item) => item.name,
          onClick: (item) => this._onCountTypeChipClick(item.type)
        })}

        ${this._renderChipOptions({
          title: 'Group By',
          items: spaceCountHistoryGroupByChoices,
          selectItem: (item) => item.type === this._selectedGroupBy,
          formatItem: (item) => item.name,
          onClick: (item) => this._onGroupByChipClick(item.type)
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
          <inno-space-count-history-chart
            class="${classes.lineChart}"
            .spaceService="${this.spaceService}"
            .fromTime="${this._selectedFromTime}"
            .toTime="${this._selectedToTime}"
            .timeStepMs="${this._selectedTimeStepMs}"
            .spaceIds="${this._selectedSpaceIds}"
            .countType="${this._selectedCountType}"
            .groupBy="${this._selectedGroupBy}"
          >
            <span slot="title">Space Member Count History</span>
          </inno-space-count-history-chart>
        </inno-chart-card>
      </div>
    `;
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

  private _onCountTypeChipClick(type: SpaceCountHistoryCountType): void {
    this._selectedCountType = type;
  }

  private _onGroupByChipClick(groupBy: SpaceCountHistoryGroupBy | null): void {
    this._selectedGroupBy = groupBy;
  }
}
