import { format } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

import '../chart-card';
import '../choice-chips';
import '../choice-chip'; // eslint-disable-line import/no-duplicates
import '../line-chart'; // eslint-disable-line import/no-duplicates
import '../pie-chart'; // eslint-disable-line import/no-duplicates
import {
  MemberService, MemberCountHistoryRange, MemberCountHistoryCategory,
  MemberCountHistory
} from '../../services/member';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { ChoiceChip } from '../choice-chip'; // eslint-disable-line import/no-duplicates
import { LineChartData } from '../line-chart'; // eslint-disable-line import/no-duplicates
import { PieChartData } from '../pie-chart'; // eslint-disable-line import/no-duplicates

import { css, classes } from './members-page.scss';


const TAG_NAME = 'inno-members-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MembersPage;
  }
}

@customElement(TAG_NAME)
export class MembersPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(MemberService)
  @observeProperty('_onDependencyInjected')
  private _memberService: MemberService | null;


  @property({ attribute: false })
  private _historyCategory: MemberCountHistoryCategory = 'department';

  @property({ attribute: false })
  private _historyRange: MemberCountHistoryRange = 'past12Months';


  private _countHistoryCache: MemberCountHistory | null = null;

  private _countHistoryCacheUpdateState: {
    readonly type: 'idle';
  } | {
    readonly type: 'updating';
    readonly category: MemberCountHistoryCategory;
    readonly range: MemberCountHistoryRange;
    readonly promise: Promise<void>;
  } = {
    type: 'idle'
  };


  private _lineChartDataDeps: readonly [MemberCountHistory | null] = [null];

  private _lineChartDataCache: LineChartData<Date> | null = null;


  private _pieChartDataDeps: readonly [MemberCountHistory | null] = [null];

  private _pieChartDataCache: PieChartData | null = null;


  public constructor() {
    super();
    this._memberService = null;
  }

  private _onDependencyInjected(): void {
    this.requestUpdate();
  }

  private _getCountHistory(): MemberCountHistory | null {
    this._countHistoryCache = this._memberService
      ?.getCountHistory(this._historyCategory, this._historyRange) ?? null;

    if (
      this._countHistoryCache === null
      && this._memberService !== null
      && (
        this._countHistoryCacheUpdateState.type === 'idle'
        || this._countHistoryCacheUpdateState.category !== this._historyCategory
        || this._countHistoryCacheUpdateState.range !== this._historyRange
      )
    ) {
      const category = this._historyCategory;
      const range = this._historyRange;
      const membersService = this._memberService;
      const promise = Promise.resolve().then(async () => {
        await membersService.updateCountHistory(category, range);
        this.requestUpdate();
      });
      const updateState: MembersPage['_countHistoryCacheUpdateState'] = {
        type: 'updating',
        category,
        range,
        promise
      };
      this._countHistoryCacheUpdateState = updateState;
      promise.finally(() => {
        if (this._countHistoryCacheUpdateState === updateState) {
          this._countHistoryCacheUpdateState = {
            type: 'idle'
          };
        }
      });
    }
    return this._countHistoryCache;
  }

  private _getLineChartData(): LineChartData<Date> | null {
    const countHistory = this._getCountHistory();
    if (this._lineChartDataDeps[0] !== countHistory) {
      if (countHistory === null) {
        this._lineChartDataCache = null;
      } else {
        this._lineChartDataCache = {
          lines: countHistory.categories.map((category) => ({
            name: category,
            values: countHistory.records.map((record) => record.counts[category])
          })),
          labels: countHistory.records.map((record) => record.time),
          formatLabel: (time) => format(time, 'd/L')
        };
      }
      this._lineChartDataDeps = [countHistory];
    }
    return this._lineChartDataCache;
  }

  private _getPieChartData(): PieChartData | null {
    const countHistory = this._getCountHistory();
    if (this._pieChartDataDeps[0] !== countHistory) {
      if (countHistory === null) {
        this._pieChartDataCache = null;
      } else {
        this._pieChartDataCache = {
          pies: countHistory.categories
            .map((category) => ({
              name: category,
              value: countHistory.records[countHistory.records.length - 1].counts[category]
            }))
            .filter((pie) => pie.value > 0)
        };
      }
      this._pieChartDataDeps = [countHistory];
    }
    return this._pieChartDataCache;
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">

        <div class="${classes.options}">
          <div class="${classes.option}">
            <div class="${classes.option_label}">Category</div>
            <inno-choice-chips
              class="${classes.option_chips}"
              selectAttribute="data-category"
              .selectId="${this._historyCategory}"
              @click="${this._onCategoryChipClick}">
              <inno-choice-chip data-category="department">Department</inno-choice-chip>
              <inno-choice-chip data-category="typeOfStudy">Type of Study</inno-choice-chip>
              <inno-choice-chip data-category="studyProgramme">Study Programme</inno-choice-chip>
              <inno-choice-chip data-category="yearOfStudy">Year of Study</inno-choice-chip>
              <inno-choice-chip data-category="affiliatedStudentInterestGroup">Affiliated Student Interest Group</inno-choice-chip>
            </inno-choice-chips>
          </div>

          <div class="${classes.option}">
            <div class="${classes.option_label}">Range</div>
            <inno-choice-chips
              class="${classes.option_chips}"
              selectAttribute="data-range"
              .selectId="${this._historyRange}"
              @click="${this._onRangeChipClick}">
              <inno-choice-chip data-range="past7Days">Past 7 Days</inno-choice-chip>
              <inno-choice-chip data-range="past30Days">Past 30 Days</inno-choice-chip>
              <inno-choice-chip data-range="past6Months">Past 6 Months</inno-choice-chip>
              <inno-choice-chip data-range="past12Months">Past 12 Months</inno-choice-chip>
            </inno-choice-chips>
          </div>
        </div>

        <div class="${classes.chartCards}">
          <inno-chart-card>
            <inno-line-chart
              .data="${this._getLineChartData()}">
              <span slot="title">Member Count History</span>
            </inno-line-chart>
          </inno-chart-card>

          <inno-chart-card>
            <inno-pie-chart
              .data="${this._getPieChartData()}">
              <span slot="title">Current Member Composition</span>
            </inno-pie-chart>
          </inno-chart-card>
        </div>

      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    this._getCountHistory();
  }

  private _onCategoryChipClick(event: MouseEvent): void {
    const chip = event.target;
    if (!(chip instanceof ChoiceChip)) return;

    const category = chip.dataset.category as MemberCountHistoryCategory;
    this._historyCategory = category;
  }

  private _onRangeChipClick(event: MouseEvent): void {
    const chip = event.target;
    if (!(chip instanceof ChoiceChip)) return;

    const range = chip.dataset.range as MemberCountHistoryRange;
    this._historyRange = range;
  }
}
