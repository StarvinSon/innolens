import {
  format as formatDate, addHours, getHours, startOfDay, getDay, subDays, startOfHour
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

// eslint-disable-next-line import/no-duplicates
import '../line-chart';
import { SpaceService, SpaceMemberCountHistory } from '../../services/space';
// eslint-disable-next-line import/no-duplicates
import { LineChartLineData } from '../line-chart';

import { css, classes } from './user-current-week-page.scss';


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

const TAG_NAME = 'inno-user-current-week-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserCurrentWeekPage;
  }
}

@customElement(TAG_NAME)
export class UserCurrentWeekPage extends LitElement {
  public static readonly styles = css;


  @property({ attribute: false })
  public spaceService: SpaceService | null = null;

  @property({ attribute: false })
  private _countHistory: SpaceMemberCountHistory | null = null;

  @property({ attribute: false })
  private _countPrediction: SpaceCountPrediction | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  private _lineChartDataDeps: readonly [SpaceMemberCountHistory | null] = [null];

  private _lineChartPredictionDataDeps: readonly [SpaceCountPrediction | null] = [null];

  private _dataFetched = false;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties().then();
    super.update(changedProps);
  }

  private async _updateProperties(): Promise<void> {
    if (this.spaceService === null) return;

    if (!this._dataFetched) {
      const current = new Date();
      this._countHistory = await this.spaceService!.fetchMemberCountHistory(
        subDays(startOfDay(current), getDay(current)),
        startOfHour(current),
        3600000,
        ['inno_wing'],
        'uniqueStay',
        'department'
      );
      // Hard coded predictions
      const time = startOfHour(new Date());
      this._countPrediction = {
        groups: [
          'Biomedical Engineering',
          'Civil Engineering',
          'Computer Science',
          'Electrical and Electronic Engineering',
          'Industrial and Manufacturing Systems Engineering',
          'Mechanical Engineering'
        ],
        records: [...Array(24 * (7 - getDay(time)) - getHours(time) + 1)].map((_, i) => ({
          startTime: addHours(time, i),
          endTime: addHours(time, i + 1),
          counts: {
            'Biomedical Engineering': Math.sin(i / 4 + Math.random()) / 2 + 4,
            'Civil Engineering': Math.cos(i / 4 + Math.random()) / 2 + 4,
            'Computer Science': Math.sin(i / 4 + Math.random()) / 2 + 4,
            'Electrical and Electronic Engineering': Math.cos(i / 4 + Math.random()) / 2 + 4,
            'Industrial and Manufacturing Systems Engineering': Math.sin(i / 4 + Math.random()) / 2 + 4,
            'Mechanical Engineering': Math.cos(i / 4 + Math.random()) / 2 + 4
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
          lines: this._countHistory.groups
            .slice()
            .sort()
            .reverse()
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
            }, [])
            .reverse(),
          /* eslint-enable @typescript-eslint/indent */
          labels: this._countHistory.records.map((record) => record.startTime),
          formatLabel: (time) => formatDate(time, 'L/d')
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
          lines: this._countPrediction.groups
            .slice()
            .sort()
            .reverse()
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
            }, [])
            .reverse(),
          /* eslint-enable @typescript-eslint/indent */
          labels: this._countPrediction.records.map((record) => record.startTime),
          formatLabel: (time) => formatDate(time, 'L/d')
        };
      }
      this._lineChartPredictionDataDeps = [this._countPrediction];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderLineChart()}
      </div>
    `;
  }

  private _renderLineChart(): TemplateResult {
    return html`
      <div class="${classes.chartCards}">
        <inno-line-chart
          class="${classes.lineChart}"
          .data="${this._lineChartData}"
          .predictionData="${this._lineChartPredictionData}"
          .labels="${7}"
          showArea>
          <span slot="title">No. of users this week</span>
        </inno-line-chart>
      </div>
    `;
  }
}
