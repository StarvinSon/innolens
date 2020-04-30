import {
  format as formatDate, subDays, startOfHour
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

// eslint-disable-next-line import/no-duplicates
import '../line-chart';
import {
  SpaceService, SpaceMemberCountHistoryLegacy, SpaceMemberCountForecast
} from '../../services/space';
import { generateKey } from '../../utils/key';
// eslint-disable-next-line import/no-duplicates
import { LineChartLineData } from '../line-chart';

import { css, classes } from './user-current-week-page.scss';

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
  private _countHistory: SpaceMemberCountHistoryLegacy | null = null;

  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: SpaceMemberCountForecast | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  private _lineChartDataDeps: readonly [SpaceMemberCountHistoryLegacy | null] = [null];

  private _lineChartPredictionDataDeps: readonly [SpaceMemberCountForecast | null] = [null];

  private _dataFetched = false;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties().then();
    super.update(changedProps);
  }

  private async _updateProperties(): Promise<void> {
    if (this.spaceService === null) return;

    if (!this._dataFetched) {
      const current = new Date();
      this._countHistory = await this.spaceService!.fetchMemberCountHistoryLegacy(
        subDays(startOfHour(current), 7),
        startOfHour(current),
        1800000,
        ['inno_wing'],
        'department',
        'uniqueStay'
      );

      const forecastKey = generateKey({
        fromTime: startOfHour(current).toISOString(),
        timeStepMs: '1800000',
        spaceIds: 'inno_wing',
        countType: 'uniqueStay'
      });
      if (this._forecastKey !== forecastKey) {
        this._forecast = await this.spaceService!.fetchMemberCountForecast({
          fromTime: startOfHour(current),
          filterSpaceIds: ['inno_wing'],
          groupBy: 'department',
          countType: 'uniqueStay'
        });
      }

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

    if (this._lineChartPredictionDataDeps[0] !== this._forecast) {
      if (this._forecast === null) {
        this._lineChartPredictionData = null;
      } else {
        this._lineChartPredictionData = {
          lines: this._forecast.groups
            .slice()
            .sort()
            .reverse()
            .reduce((lines: Array<LineChartLineData>, group) => {
              const line = {
                name: group,
                values: this._forecast!.values[0].map(
                  (value, i) => value + (lines.length ? lines[lines.length - 1].values[i] : 0)
                )
              };
              lines.push(line);
              return lines;
            }, [])
            .reverse(),
          labels: this._forecast.timeSpans.map((timeSpan) => timeSpan[0]),
          formatLabel: (time) => formatDate(time, 'L/d')
        };
      }
      this._lineChartPredictionDataDeps = [this._forecast];
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
          .labels="${9}"
          showArea>
          <span slot="title">No. of users this week</span>
        </inno-line-chart>
      </div>
    `;
  }
}
