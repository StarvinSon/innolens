import {
  format as formatDate, startOfHour, subHours
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../availability-bar';
import {
  ExpendableInventoryService, ExpendableInventoryType,
  ExpendableInventoryQuantityHistoryLegacy, ExpendableInventoryQuantityForecast
} from '../../services/expendable-inventory';
import { generateKey } from '../../utils/key';

import { css, classes } from './user-expendable-inventories-page.scss';

const TAG_NAME = 'inno-user-expendable-inventories-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserExpendableInventoriesPage;
  }
}

@customElement(TAG_NAME)
export class UserExpendableInventoriesPage extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  public expendableInventoryService: ExpendableInventoryService | null = null;

  @property({ attribute: false })
  public expendableInventoryTypes: ReadonlyArray<ExpendableInventoryType> | null = null;

  @property({ attribute: false })
  private _countHistory: ReadonlyArray<ExpendableInventoryQuantityHistoryLegacy> | null = null;

  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: ReadonlyArray<ExpendableInventoryQuantityForecast> | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _availabilityBarData: ReadonlyArray<{ name: string; value: number }> | null = null;

  private _lineChartDataDeps: readonly [
    ReadonlyArray<ExpendableInventoryQuantityHistoryLegacy> | null
  ] = [null];

  private _lineChartPredictionDataDeps: readonly [
    ReadonlyArray<ExpendableInventoryQuantityForecast> | null
  ] = [null];

  private _availabilityBarDataDeps: readonly [
    ReadonlyArray<ExpendableInventoryQuantityHistoryLegacy> | null
  ] = [null];

  private _dataFetched = false;

  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.expendableInventoryService === null) return;

    if (!this._dataFetched && this.expendableInventoryTypes !== null) {
      const current = new Date();

      const expendableInventoryCountPromises = this.expendableInventoryTypes.map(
        async (expendableInventoryType): Promise<ExpendableInventoryQuantityHistoryLegacy> =>
          this.expendableInventoryService!.fetchQuantityHistoryLegacy(
            subHours(startOfHour(current), 20),
            startOfHour(current),
            1800000,
            [expendableInventoryType.typeId],
            null
          )
      );
      Promise.all(expendableInventoryCountPromises).then((expendableInventoryData) => {
        this._countHistory = expendableInventoryData;
      });

      const forecastKey = generateKey({
        fromTime: startOfHour(current).toISOString(),
        timeStepMs: '1800000',
        spaceIds: this.expendableInventoryTypes.map((expendableInventoryType) => expendableInventoryType.typeId).map(encodeURIComponent).join(','),
        countType: 'uniqueStay'
      });
      if (this._forecastKey !== forecastKey) {
        const forecastPromises = this.expendableInventoryTypes.map(
          async (expendableInventoryType): Promise<ExpendableInventoryQuantityForecast> =>
            this.expendableInventoryService!.fetchQuantityForecast({
              fromTime: startOfHour(current),
              timeStepMs: 1800000,
              filterTypeIds: [expendableInventoryType.typeId],
              groupBy: null,
              countType: 'quantity'
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
            name: this.expendableInventoryTypes![i].typeName,
            values: history.records.map(
              (record) => record.counts.total / this.expendableInventoryTypes![i].typeCapacity
            )
          })),
          labels: this._countHistory[0].records.map((record) => startOfHour(record.time)),
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
            name: this.expendableInventoryTypes![i].typeName,
            values: forecast.values[0].slice(0, 8).map(
              (value) => value / this.expendableInventoryTypes![i].typeCapacity
            )
          })),
          labels: this._forecast[0].timeSpans.slice(0, 8).map((timeSpan) => timeSpan[0]),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartPredictionDataDeps = [this._forecast];
    }

    if (this._availabilityBarDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._availabilityBarData = null;
      } else {
        this._availabilityBarData = this._countHistory.map((history, i) => ({
          name: this.expendableInventoryTypes![i].typeName,
          value:
            history.records[history.records.length - 1].counts.total
            / this.expendableInventoryTypes![i].typeCapacity
        }));
      }
      this._availabilityBarDataDeps = [this._countHistory];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderLineChart()}
        ${this._renderAvailabilityBars()}
      </div>
    `;
  }

  private _renderAvailabilityBars(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.availabilityBars}">
        ${this._availabilityBarData === null
          ? html``
          : this._availabilityBarData.map(
              (data) => html`
                <inno-availability-bar class="${classes.availabilityBar}" .percentage="${data.value}">
                  <span slot="title">${data.name}</span>
                </inno-availability-bar>
              `
            )}
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
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
          <span slot="title">Utilization rate of expendable inventories</span>
        </inno-line-chart>
      </div>
    `;
  }
}
