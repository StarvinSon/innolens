import { format as formatDate } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html,
  property,
  PropertyValues
} from 'lit-element';

import '../chart-card';
import '../choice-chips';
import '../choice-chip';
import '../line-chart'; // eslint-disable-line import/no-duplicates
import {
  SpaceService, Space, spaceMemberCountHistoryGroupByValues,
  SpaceMemberCountHistoryGroupByValues, SpaceMemberCountHistory
} from '../../services/space';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { LineChartData } from '../line-chart'; // eslint-disable-line import/no-duplicates

import { css, classes } from './spaces-page.scss';


const spaceMemberCountTypes = [
  'enterCounts',
  'uniqueEnterCounts',
  'exitCounts',
  'uniqueExitCounts',
  'stayCounts',
  'uniqueStayCounts'
] as const;

type SpaceMemberCountType = (typeof spaceMemberCountTypes)[number];


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
  @observeProperty('_onDependencyInjected')
  public spaceService: SpaceService | null = null;


  @property({ attribute: false })
  private _selectedSpace: Space | null = null;

  @property({ attribute: false })
  // eslint-disable-next-line max-len
  private _selectedGroupBy: SpaceMemberCountHistoryGroupByValues = spaceMemberCountHistoryGroupByValues[0];

  @property({ attribute: false })
  private _selectedPastDays = 7;

  @property({ attribute: false })
  private _selectedCountType: SpaceMemberCountType = spaceMemberCountTypes[0];


  private _lineChartDataDeps: readonly [
    SpaceMemberCountHistory | null,
    SpaceMemberCountType | null
  ] = [null, null];

  private _lineChartDataCache: LineChartData<Date> | null = null;


  public constructor() {
    super();
    this._onSpaceServiceUpdated = this._onSpaceServiceUpdated.bind(this);
  }

  private _onDependencyInjected(): void {
    this.requestUpdate();
    if (this.spaceService !== null) {
      this.spaceService.addEventListener('spaces-updated', this._onSpaceServiceUpdated);
      this.spaceService.addEventListener('space-member-count-history-updated', this._onSpaceServiceUpdated);
    }
  }

  private _onSpaceServiceUpdated(): void {
    this.requestUpdate();
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
          title: 'Space',
          items: this.spaceService?.spaces ?? [],
          selectItem: this._selectedSpace,
          formatItem: (item) => item.spaceName,
          onClick: (space) => this._onSpaceChipClick(space)
        })}
        ${this._renderChipOptions({
          title: 'Group By',
          items: spaceMemberCountHistoryGroupByValues,
          selectItem: this._selectedGroupBy,
          onClick: (groupBy) => this._onGroupByChipClick(groupBy)
        })}
        ${this._renderChipOptions({
          title: 'Past Days',
          items: [1, 2, 7, 30, 60, 120, 360],
          selectItem: this._selectedPastDays,
          formatItem: (day) => html`${day} Days`,
          onClick: (day) => this._onPastDaysChipClick(day)
        })}
        ${this._renderChipOptions({
          title: 'Count Type',
          items: spaceMemberCountTypes,
          selectItem: this._selectedCountType,
          onClick: (type) => this._onCountTypeChipClick(type)
        })}
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderChipOptions<T>(options: {
    readonly title: unknown,
    readonly items: ReadonlyArray<T>,
    readonly selectItem: T | ReadonlyArray<T> | null,
    readonly formatItem?: (item: T) => unknown,
    readonly onClick: (item: T) => void
  }): TemplateResult {
    let selectId: Array<string> | string | null;
    if (options.selectItem === null) {
      selectId = null;
    } else if (Array.isArray(options.selectItem)) {
      selectId = options.selectItem.map((item) => String(options.items.indexOf(item)));
    } else {
      selectId = String(options.items.indexOf(options.selectItem as T));
    }

    return html`
      <div class="${classes.option}">
        <div class="${classes.option_label}">${options.title}</div>
        <inno-choice-chips
          class="${classes.option_chips}"
          selectAttribute="data-id"
          .selectId="${selectId}">
          ${options.items.map((item, i) => html`
            <inno-choice-chip
              data-id="${i}"
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
          <inno-line-chart
            class="${classes.lineChart}"
            .data="${this._getLineChartData()}">
            <span slot="title">Space Member Count History</span>
          </inno-line-chart>
        </inno-chart-card>
      </div>
    `;
  }

  private _getLineChartData(): LineChartData<Date> | null {
    const history = this._getSpaceMemberCountHistory();

    if (
      this._lineChartDataDeps[0] !== history
      || this._lineChartDataDeps[1] !== this._selectedCountType
    ) {
      if (history === null) {
        this._lineChartDataCache = null;
      } else {
        this._lineChartDataCache = {
          lines: history.groups.map((group) => ({
            name: group,
            values: history.records.map((record) => record[this._selectedCountType][group])
          })),
          labels: history.records.map((record) => record.periodEndTime),
          formatLabel: (time) => formatDate(time, 'd/L')
        };
      }
      this._lineChartDataDeps = [history, this._selectedCountType];
    }
    return this._lineChartDataCache;
  }

  private _getSpaceMemberCountHistory(): SpaceMemberCountHistory | null {
    if (this.spaceService === null) return null;
    if (this._selectedSpace === null) return null;
    return this.spaceService.getSpaceMemberCountHistory(
      this._selectedSpace.spaceId,
      this._selectedGroupBy,
      this._selectedPastDays * 24
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (this.spaceService !== null) {
      if (this.spaceService.spaces === null) {
        this.spaceService.updateSpaces();
      }
      if (this._getSpaceMemberCountHistory() === null && this._selectedSpace !== null) {
        this.spaceService.updateSpaceMemberCountHistory(
          this._selectedSpace.spaceId,
          this._selectedGroupBy,
          this._selectedPastDays * 24
        );
      }
    }
  }

  private _onSpaceChipClick(space: Space): void {
    this._selectedSpace = space;
  }

  private _onGroupByChipClick(groupBy: SpaceMemberCountHistoryGroupByValues): void {
    this._selectedGroupBy = groupBy;
  }

  private _onPastDaysChipClick(day: number): void {
    this._selectedPastDays = day;
  }

  private _onCountTypeChipClick(type: SpaceMemberCountType): void {
    this._selectedCountType = type;
  }
}
