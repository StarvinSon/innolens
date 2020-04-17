import { format as formatDate } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

// eslint-disable-next-line import/no-duplicates
import '../line-chart';
import '../pie-chart';
import {
  MemberService, MemberCountHistory, MemberCountHistoryCategory, MemberCountHistoryRange
} from '../../services/member';
// eslint-disable-next-line import/no-duplicates
import { LineChartLineData } from '../line-chart';

import { css, classes } from './user-registered-page.scss';

const TAG_NAME = 'inno-user-registered-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserRegisteredPage;
  }
}

@customElement(TAG_NAME)
export class UserRegisteredPage extends LitElement {
  public static readonly styles = css;


  @property({ attribute: false })
  public memberService: MemberService | null = null;

  @property({ attribute: false })
  private _historyCategory: MemberCountHistoryCategory = 'department';

  @property({ attribute: false })
  private _historyRange: MemberCountHistoryRange = 'past12Months';

  @property({ attribute: false })
  private _countHistory: MemberCountHistory | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _pieChartData: import('../pie-chart').PieChartData | null = null;

  private _lineChartDataDeps: readonly [MemberCountHistory | null] = [null];

  private _pieChartDataDeps: readonly [MemberCountHistory | null] = [null];


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.memberService === null) return;

    this._countHistory = this.memberService.getCountHistory(
      this._historyCategory,
      this._historyRange
    );
    if (this._countHistory === null) {
      this.memberService.updateCountHistory(this._historyCategory, this._historyRange)
        .then(() => this.requestUpdate());
      return;
    }

    if (this._lineChartDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._lineChartData = null;
      } else {
        this._lineChartData = {
          /* eslint-disable @typescript-eslint/indent */
          lines: this._countHistory.categories.slice().reverse()
            .reduce<Array<LineChartLineData>>((lines, category) => {
              const line = {
                name: category,
                values: this._countHistory!.records.map(
                  (record, index) =>
                    record.counts[category]
                    + (lines.length ? lines[lines.length - 1].values[index] : 0)
                )
              };
              lines.push(line);
              return lines;
            }, []).reverse(),
          /* eslint-enable @typescript-eslint/indent */
          labels: this._countHistory.records.map((record) => record.time),
          formatLabel: (time) => formatDate(time, 'd/L')
        };
      }
      this._lineChartDataDeps = [this._countHistory];
    }

    if (this._pieChartDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._pieChartData = null;
      } else {
        this._pieChartData = {
          pies: this._countHistory.categories
            .map((category) => ({
              name: category,
              value: this._countHistory!.records[this._countHistory!.records.length - 1]
                .counts[category]
            }))
            .filter((pie) => pie.value > 0)
        };
      }
      this._pieChartDataDeps = [this._countHistory];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderTotal()}
        ${this._renderPieChart()}
        ${this._renderLineChart()}
      </div>
    `;
  }

  private _renderTotal(): TemplateResult {
    let total = 0;
    if (this._countHistory !== null) {
      const { counts } = this._countHistory.records[this._countHistory.records.length - 1];
      for (const category of this._countHistory.categories) {
        total += counts[category];
      }
    }

    return html`
      <div class="${classes.totalCard}">
        <div class="${classes.totalText}">Total Number of Users</div>
        <div class="${classes.totalNum}">${total}</div>
      </div>
    `;
  }

  private _renderPieChart(): TemplateResult {
    return html`
      <div class="${classes.chartCards} ${classes.pieCard}">
        <inno-pie-chart
          class="${classes.pieChart}"
          .data="${this._pieChartData}">
          <span slot="title">Composition of our users</span>
        </inno-pie-chart>
      </div>
    `;
  }

  private _renderLineChart(): TemplateResult {
    return html`
      <div class="${classes.chartCards} ${classes.lineCard}">
        <inno-line-chart
          class="${classes.lineChart}"
          .data="${this._lineChartData}">
          <span slot="title">Growth of our users</span>
        </inno-line-chart>
      </div>
    `;
  }
}
