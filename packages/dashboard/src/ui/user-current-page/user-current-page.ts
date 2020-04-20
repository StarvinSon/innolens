import {
  format as formatDate, addHours, endOfHour, getHours, startOfDay, startOfHour
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

// eslint-disable-next-line import/no-duplicates
import '../line-chart';
import '../pie-chart';
import { SpaceService, SpaceCountHistory } from '../../services/space';
// eslint-disable-next-line import/no-duplicates
import { LineChartLineData } from '../line-chart';

import { css, classes } from './user-current-page.scss';

interface SpaceCountPrediction {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<SpaceCountPredictionRecord>;
}

interface SpaceCountPredictionRecord {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly counts: SpaceCountPredictionRecordValues;
}

interface SpaceCountPredictionRecordValues {
  readonly [group: string]: number;
}

const TAG_NAME = 'inno-user-current-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserCurrentPage;
  }
}

@customElement(TAG_NAME)
export class UserCurrentPage extends LitElement {
  public static readonly styles = css;


  @property({ attribute: false })
  public spaceService: SpaceService | null = null;

  @property({ attribute: false })
  private _countHistory: SpaceCountHistory | null = null;

  @property({ attribute: false })
  private _countPrediction: SpaceCountPrediction | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _pieChartData: import('../pie-chart').PieChartData | null = null;

  private _lineChartDataDeps: readonly [SpaceCountHistory | null] = [null];

  private _lineChartPredictionDataDeps: readonly [SpaceCountPrediction | null] = [null];

  private _pieChartDataDeps: readonly [SpaceCountHistory | null] = [null];

  private _dataFetched = false;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties().then();
    super.update(changedProps);
  }

  private async _updateProperties(): Promise<void> {
    if (this.spaceService === null) return;

    if (!this._dataFetched) {
      const current = new Date();
      this._countHistory = await this.spaceService!.fetchCountHistory(
        startOfDay(current),
        endOfHour(current),
        3600000,
        ['inno_wing'],
        'uniqueStay',
        'department'
      );
      // Hard coded predictions
      const time = addHours(startOfHour(new Date()), 1);
      this._countPrediction = {
        groups: ['Electrical and Electronic Engineering', 'Mechanical Engineering', 'Computer Science'],
        records: [...Array(25 - getHours(time))].map((_, i) => ({
          startTime: addHours(time, i),
          endTime: addHours(time, i + 1),
          counts: {
            'Electrical and Electronic Engineering': Math.cos(i / 4) / 2 + 4,
            'Mechanical Engineering': Math.sin(i / 4 + 0.25) / 2 + 4,
            'Computer Science': Math.sin(i / 4 + 0.75) / 2 + 4
          }
        }))
      };

      this._dataFetched = true;
    }

    if (this._lineChartDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._lineChartData = null;
      } else {
        this._lineChartData = {
          /* eslint-disable @typescript-eslint/indent */
          lines: this._countHistory.groups.slice().reverse()
            .reduce<Array<LineChartLineData>>((lines, group) => {
              const line = {
                name: group,
                values: this._countHistory!.records.map(
                  (record, index) =>
                    record.counts[group]
                    + (lines.length ? lines[lines.length - 1].values[index] : 0)
                )
              };
              lines.push(line);
              return lines;
            }, []).reverse(),
          /* eslint-enable @typescript-eslint/indent */
          labels: this._countHistory.records.map((record) => record.startTime),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartDataDeps = [this._countHistory];
    }

    if (this._lineChartPredictionDataDeps[0] !== this._countPrediction) {
      if (this._countPrediction === null) {
        this._lineChartPredictionData = null;
      } else {
        this._lineChartPredictionData = {
          /* eslint-disable @typescript-eslint/indent */
          lines: this._countPrediction.groups.slice().reverse()
            .reduce<Array<LineChartLineData>>((lines, group) => {
              const line = {
                name: group,
                values: this._countPrediction!.records.map(
                  (record, index) =>
                    record.counts[group]
                    + (lines.length ? lines[lines.length - 1].values[index] : 0)
                )
              };
              lines.push(line);
              return lines;
            }, []).reverse(),
          /* eslint-enable @typescript-eslint/indent */
          labels: this._countPrediction.records.map((record) => record.startTime),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartPredictionDataDeps = [this._countPrediction];
    }

    if (this._pieChartDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._pieChartData = null;
      } else {
        const latestRecord = this._countHistory!.records[this._countHistory!.records.length - 1];

        this._pieChartData = {
          pies: this._countHistory.groups
            .map((group) => ({
              name: group,
              value: latestRecord.counts[group]
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
        ${this._renderLineChart()}
        ${this._renderTotal()}
        ${this._renderPieChart()}
      </div>
    `;
  }

  private _renderLineChart(): TemplateResult {
    return html`
      <div class="${classes.chartCards} ${classes.lineCard}">
        <inno-line-chart
          class="${classes.lineChart}"
          .data="${this._lineChartData}"
          .predictionData="${this._lineChartPredictionData}"
          .labels="${8}"
          showArea>
          <span slot="title">No. of users today</span>
        </inno-line-chart>
      </div>
    `;
  }

  private _renderTotal(): TemplateResult {
    let total = 0;
    if (this._countHistory !== null) {
      const { counts } = this._countHistory.records[this._countHistory.records.length - 1];
      for (const group of this._countHistory.groups) {
        total += counts[group];
      }
    }

    return html`
      <div class="${classes.totalCard}">
        <div class="${classes.totalText}">No. of users inside</div>
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
          <span slot="title">Composition of users inside</span>
        </inno-pie-chart>
      </div>
    `;
  }
}
