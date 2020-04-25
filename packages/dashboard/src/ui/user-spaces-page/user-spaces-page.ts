import {
  format as formatDate, startOfDay, addHours, startOfHour, getHours
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../gauge';
import {
  SpaceService, Space, SpaceMemberCountHistory
} from '../../services/space';

import { css, classes } from './user-spaces-page.scss';

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
  private _countHistory: ReadonlyArray<SpaceMemberCountHistory> | null = null;

  @property({ attribute: false })
  private _countPrediction: ReadonlyArray<SpaceCountPrediction> | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _gaugeData: ReadonlyArray<{ name: string; value: number }> | null = null;

  private _lineChartDataDeps: readonly [ReadonlyArray<SpaceMemberCountHistory> | null] = [null];

  private _lineChartPredictionDataDeps: readonly [
    ReadonlyArray<SpaceCountPrediction> | null
  ] = [null];

  private _gaugeDataDeps: readonly [ReadonlyArray<SpaceMemberCountHistory> | null] = [null];

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
        async (space): Promise<SpaceMemberCountHistory> =>
          this.spaceService!.fetchMemberCountHistory(
            startOfDay(current),
            startOfHour(current),
            3600000,
            [space.spaceId],
            'uniqueStay',
            null
          )
      );
      Promise.all(spaceCountPromises).then((spaceData) => {
        this._countHistory = spaceData;
      });

      // Hard coded predictions
      const time = startOfHour(new Date());
      this._countPrediction = this.spaces.map(() => ({
        groups: ['total'],
        records: [...Array(25 - getHours(time))].map((_, i) => ({
          startTime: addHours(time, i),
          endTime: addHours(time, i + 1),
          counts: { total: Math.cos(i / 4 + Math.random()) / 2 + 4 }
        }))
      }));

      this._dataFetched = true;
    }

    if (this._lineChartDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._lineChartData = null;
      } else {
        this._lineChartData = {
          lines: this._countHistory.map((history, i) => {
            const { spaceName, spaceCapacity } = this.spaces![i];
            return {
              name: spaceName,
              values: history.records.map((record) => record.counts.total / spaceCapacity)
            };
          }),
          labels: this._countHistory[0].records.map((record) => record.startTime),
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
          lines: this._countPrediction.map((history, i) => {
            const { spaceName, spaceCapacity } = this.spaces![i];
            return {
              name: spaceName,
              values: history.records.map((record) => record.counts.total / spaceCapacity)
            };
          }),
          labels: this._countPrediction[0].records.map((record) => record.startTime),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartPredictionDataDeps = [this._countPrediction];
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
          .labels="${8}"
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
