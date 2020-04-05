import { format } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

import '../chart-card';
import '../choice-chips';
import '../choice-chip';
import '../figure';
import '../line-chart'; // eslint-disable-line import/no-duplicates
import '../pie-chart'; // eslint-disable-line import/no-duplicates
import {
  MemberService, MemberCountHistoryRange, MemberCountHistoryCategory,
  MemberCountHistory,
  MemberCountFilter
} from '../../services/member';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { LineChartData } from '../line-chart'; // eslint-disable-line import/no-duplicates
import { PieChartData } from '../pie-chart'; // eslint-disable-line import/no-duplicates

import { css, classes } from './members-groups-page.scss';


const TAG_NAME = 'inno-members-groups-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MembersGroupsPage;
  }
}

@customElement(TAG_NAME)
export class MembersGroupsPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(MemberService)
  @observeProperty('_onDependencyInjected')
  private _memberService: MemberService | null;


  @property({ attribute: false })
  public interactable = false;


  @property({ attribute: false })
  private _selectedDepartments: ReadonlyArray<string> = [];

  @property({ attribute: false })
  private _selectedTypesOfStudy: ReadonlyArray<string> = [];

  @property({ attribute: false })
  private _selectedStudyProgrammes: ReadonlyArray<string> = [];

  @property({ attribute: false })
  private _selectedYearsOfStudy: ReadonlyArray<string> = [];

  @property({ attribute: false })
  private _selectedAffiliatedStudentInterestGroup: ReadonlyArray<string> = [];


  @property({ attribute: false })
  private _historyCategory: MemberCountHistoryCategory = 'department';

  @property({ attribute: false })
  private _historyRange: MemberCountHistoryRange = 'past12Months';


  private _lineChartDataDeps: readonly [MemberCountHistory | null] = [null];

  private _lineChartDataCache: LineChartData<Date> | null = null;


  private _pieChartDataDeps: readonly [MemberCountHistory | null] = [null];

  private _pieChartDataCache: PieChartData | null = null;


  public constructor() {
    super();
    this._onMemberServiceStateUpdated = this._onMemberServiceStateUpdated.bind(this);
    this._memberService = null;
  }

  private _onDependencyInjected(): void {
    this.requestUpdate();
    this._memberService?.addEventListener('state-updated', this._onMemberServiceStateUpdated);
  }

  private _onMemberServiceStateUpdated(): void {
    this.requestUpdate();
  }

  private _getCount(): number | null {
    if (this._memberService === null) return null;
    return this._memberService.getCount(this._getCountFilter());
  }

  private _getCountFilter(): MemberCountFilter {
    const emptyToUndefined = <T>(items: ReadonlyArray<T>): ReadonlyArray<T> | undefined =>
      items.length === 0 ? undefined : items;
    return {
      department: emptyToUndefined(this._selectedDepartments),
      typeOfStudy: emptyToUndefined(this._selectedTypesOfStudy),
      studyProgramme: emptyToUndefined(this._selectedStudyProgrammes),
      yearOfStudy: emptyToUndefined(this._selectedYearsOfStudy),
      affiliatedStudentInterestGroup:
        emptyToUndefined(this._selectedAffiliatedStudentInterestGroup)
    };
  }

  private _getCountHistory(): MemberCountHistory | null {
    return this._memberService
      ?.getCountHistory(this._historyCategory, this._historyRange) ?? null;
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return super.shouldUpdate(changedProps) && this.interactable;
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderOptions()}
        ${this._renderStats()}
      </div>
    `;
  }

  private _renderOptions(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.options}">
        ${this._renderChipOptions({
          title: 'Department',
          items: this._memberService?.departments ?? [],
          selectItem: this._selectedDepartments,
          onClick: (d) => this._onDepartmentChipClick(d)
        })}
        ${this._renderChipOptions({
          title: 'Types Of Study',
          items: this._memberService?.typesOfStudy ?? [],
          selectItem: this._selectedTypesOfStudy,
          onClick: (t) => this._onTypeOfStudyChipClick(t)
        })}
        ${this._renderChipOptions({
          title: 'Study Programmes',
          items: this._memberService?.studyProgrammes ?? [],
          selectItem: this._selectedStudyProgrammes,
          onClick: (t) => this._onStudyProgrammeChipClick(t)
        })}
        ${this._renderChipOptions({
          title: 'Years Of Study',
          items: this._memberService?.yearsOfStudy ?? [],
          selectItem: this._selectedYearsOfStudy,
          onClick: (t) => this._onYearOfStudyChipClick(t)
        })}
        ${this._renderChipOptions({
          title: 'Affiliated Student Interest Group',
          items: this._memberService?.affiliatedStudentInterestGroups ?? [],
          selectItem: this._selectedAffiliatedStudentInterestGroup,
          onClick: (t) => this._onAffiliatedSTudentInterestGroupChipClick(t)
        })}
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderChipOptions(options: {
    readonly title: string,
    readonly items: ReadonlyArray<string>,
    readonly selectItem: ReadonlyArray<string>,
    readonly onClick: (item: string) => void
  }): TemplateResult {
    return html`
      <div class="${classes.option}">
        <div class="${classes.option_label}">${options.title}</div>
        <inno-choice-chips
          class="${classes.option_chips}"
          selectAttribute="data-id"
          .selectId="${options.selectItem}">
          ${options.items.map((item) => html`
            <inno-choice-chip
              data-id="${item}"
              @click="${() => options.onClick(item)}">
              ${item}
            </inno-choice-chip>
          `)}
        </inno-choice-chips>
      </div>
    `;
  }

  private _renderStats(): TemplateResult {
    return html`
      <div class="${classes.chartCards}">
        <inno-chart-card>
          <inno-figure>
            <span slot="title">Member Count</span>
            <span slot="value">${this._getCount()}</span>
          </inno-figure>
        </inno-chart-card>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (this._memberService !== null) {
      if (this._memberService.departments === null) {
        this._memberService.updateDepartments();
      }
      if (this._memberService.typesOfStudy === null) {
        this._memberService.updateTypesOfStudy();
      }
      if (this._memberService.studyProgrammes === null) {
        this._memberService.updateStudyProgrammes();
      }
      if (this._memberService.yearsOfStudy === null) {
        this._memberService.updateYearsOfStudy();
      }
      if (this._memberService.affiliatedStudentInterestGroups === null) {
        this._memberService.updateAffiliatedStudentInterestGroups();
      }
      if (this._getCount() === null) {
        this._memberService.updateCount(this._getCountFilter());
      }
      if (this._getCountHistory() === null) {
        this._memberService.updateCountHistory(this._historyCategory, this._historyRange);
      }
    }
  }

  private _onDepartmentChipClick(department: string): void {
    this._selectedDepartments = this._toggleArray(this._selectedDepartments, department);
  }

  private _onTypeOfStudyChipClick(type: string): void {
    this._selectedTypesOfStudy = this._toggleArray(this._selectedTypesOfStudy, type);
  }

  private _onStudyProgrammeChipClick(department: string): void {
    this._selectedStudyProgrammes = this._toggleArray(this._selectedStudyProgrammes, department);
  }

  private _onYearOfStudyChipClick(type: string): void {
    this._selectedYearsOfStudy = this._toggleArray(this._selectedYearsOfStudy, type);
  }

  private _onAffiliatedSTudentInterestGroupChipClick(group: string): void {
    this._selectedAffiliatedStudentInterestGroup =
      this._toggleArray(this._selectedAffiliatedStudentInterestGroup, group);
  }

  private _toggleArray<T>(arr: ReadonlyArray<T>, item: T): ReadonlyArray<T> {
    if (arr.includes(item)) {
      return arr.filter((d) => d !== item);
    }
    return [...arr, item];
  }
}
