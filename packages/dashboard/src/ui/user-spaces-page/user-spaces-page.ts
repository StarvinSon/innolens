import {
  format as formatDate, startOfHour, subHours
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../gauge';
import {
  SpaceService, Space, SpaceMemberCountHistoryLegacy, SpaceMemberCountForecast
} from '../../services/space';
import { generateKey } from '../../utils/key';

import { css, classes } from './user-spaces-page.scss';

const TAG_NAME = 'inno-user-spaces-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserSpacesPage;
  }
}

@customElement(TAG_NAME)
export class UserSpacesPage extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  public spaceService: SpaceService | null = null;

  @property({ attribute: false })
  public spaces: ReadonlyArray<Space> | null = null;

  @property({ attribute: false })
  private _countHistory: ReadonlyArray<SpaceMemberCountHistoryLegacy> | null = null;

  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: ReadonlyArray<SpaceMemberCountForecast> | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _gaugeData: ReadonlyArray<{ name: string; value: number }> | null = null;

  private _lineChartDataDeps: readonly [
    ReadonlyArray<SpaceMemberCountHistoryLegacy> | null
  ] = [null];

  private _lineChartPredictionDataDeps: readonly [
    ReadonlyArray<SpaceMemberCountForecast> | null
  ] = [null];

  private _gaugeDataDeps: readonly [ReadonlyArray<SpaceMemberCountHistoryLegacy> | null] = [null];

  private _dataFetched = false;

  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.spaceService === null) return;

    if (!this._dataFetched && this.spaces !== null) {
      const current = new Date();
      const spaceCountPromises = this.spaces.map(
        async (space): Promise<SpaceMemberCountHistoryLegacy> =>
          this.spaceService!.fetchMemberCountHistoryLegacy(
            subHours(startOfHour(current), 20),
            startOfHour(current),
            1800000,
            [space.spaceId],
            null,
            'uniqueStay'
          )
      );
      Promise.all(spaceCountPromises).then((spaceData) => {
        this._countHistory = spaceData;
      });

      const forecastKey = generateKey({
        fromTime: startOfHour(current).toISOString(),
        timeStepMs: '1800000',
        spaceIds: this.spaces.map((space) => space.spaceId).map(encodeURIComponent).join(','),
        countType: 'uniqueStay'
      });
      if (this._forecastKey !== forecastKey) {
        const forecastPromises = this.spaces.map(
          async (space): Promise<SpaceMemberCountForecast> =>
            this.spaceService!.fetchMemberCountForecast({
              fromTime: startOfHour(current),
              filterSpaceIds: [space.spaceId],
              groupBy: null,
              countType: 'uniqueStay'
            })
        );
        Promise.all(forecastPromises)
          .then((forecastData) => {
            this._forecast = forecastData;
          })
          .catch((err) => {
            console.error(err);
            if (this._forecastKey === forecastKey) {
              this._forecast = null;
            }
          });

        this._forecastKey = forecastKey;
      }

      this._dataFetched = true;
    }

    if (this._lineChartDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._lineChartData = null;
      } else {
        this._lineChartData = {
          lines: this._countHistory.map((history, i) => ({
            name: this.spaces![i].spaceName,
            values: history.records.map(
              (record) => record.counts.total / this.spaces![i].spaceCapacity
            )
          })),
          labels: this._countHistory[0].records.map((record) => record.startTime),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartDataDeps = [this._countHistory];
    }

    if (this._lineChartPredictionDataDeps[0] !== this._forecast) {
      if (this._forecast === null) {
        this._lineChartPredictionData = null;
      } else {
        this._lineChartPredictionData = {
          lines: this._forecast.map((forecast, i) => ({
            name: this.spaces![i].spaceName,
            values: forecast.values[0].slice(0, 8).map(
              (value) => value / this.spaces![i].spaceCapacity
            )
          })),
          labels: this._forecast[0].timeSpans.slice(0, 8).map((timeSpan) => timeSpan[0]),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartPredictionDataDeps = [this._forecast];
    }

    if (this._gaugeDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._gaugeData = null;
      } else {
        this._gaugeData = this._countHistory.map((history, i) => {
          const { spaceName, spaceCapacity } = this.spaces![i];
          return {
            name: spaceName,
            value: history.records[history.records.length - 1].counts.total / spaceCapacity
          };
        });
      }
      this._gaugeDataDeps = [this._countHistory];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderLineChart()} ${this._renderGauges()}
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
          .labels="${12}"
          showPercentage
        >
          <span slot="title">Utilization rate of spaces</span>
        </inno-line-chart>
      </div>
    `;
  }

  private _renderGauges(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.gauges}">
        ${this._gaugeData === null
          ? html``
          : this._gaugeData.map(
              (data) => html`
                <inno-gauge class="${classes.gauge}" .percentage="${data.value}">
                  <span slot="title">${data.name}</span>
                </inno-gauge>
              `
            )}
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
