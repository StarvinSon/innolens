import {
  format as formatDate, startOfHour
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../gauge';
import {
  ReusableInventoryService, ReusableInventoryType,
  ReusableInventoryMemberCountHistoryLegacy, ReusableInventoryMemberCountForecast
} from '../../services/reusable-inventory';
import { generateKey } from '../../utils/key';
import { getTime } from '../../utils/time';

import { css, classes } from './user-reusable-inventories-page.scss';

const TAG_NAME = 'inno-user-reusable-inventories-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserReusableInventoriesPage;
  }
}

@customElement(TAG_NAME)
export class UserReusableInventoriesPage extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  public reusableInventoryService: ReusableInventoryService | null = null;

  @property({ attribute: false })
  public reusableInventoryTypes: ReadonlyArray<ReusableInventoryType> | null = null;

  @property({ attribute: false })
  public reusableInventoryTypeCapacity: Readonly<Record<string, number>> | null = null;

  @property({ attribute: false })
  private _countHistory: ReusableInventoryMemberCountHistoryLegacy | null = null;

  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: ReusableInventoryMemberCountForecast | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _gaugeData: ReadonlyArray<{ name: string; value: number }> | null = null;

  private _lineChartDataDeps: readonly [ReusableInventoryMemberCountHistoryLegacy | null] = [null];

  // eslint-disable-next-line max-len
  private _lineChartPredictionDataDeps: readonly [ReusableInventoryMemberCountForecast | null] = [null];

  private _gaugeDataDeps: readonly [ReusableInventoryMemberCountHistoryLegacy | null] = [null];

  private _dataFetched = false;

  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.reusableInventoryService === null) return;

    if (!this._dataFetched && this.reusableInventoryTypes !== null) {
      const reusableInventoryTypeCapacityPromises = this.reusableInventoryTypes.map(
        async (reusableInventoryType): Promise<{ typeId: string; count: number }> => {
          const instancesOfType = await this.reusableInventoryService!.fetchInstances(
            reusableInventoryType.typeId
          );
          return {
            typeId: reusableInventoryType.typeId,
            count: instancesOfType.length
          };
        }
      );
      Promise.all(reusableInventoryTypeCapacityPromises).then((capacityData) => {
        this.reusableInventoryTypeCapacity = capacityData.reduce(
          (acc: Record<string, number>, data) => {
            acc[data.typeId] = data.count;
            return acc;
          },
          {}
        );
      });

      this.reusableInventoryService!
        .updateMemberCountHistoryLegacy(
          20,
          this.reusableInventoryTypes.map((reusableInventoryType) => reusableInventoryType.typeId),
          undefined,
          'type',
          'uniqueUse'
        )
        .then((result) => {
          this._countHistory = result;
        });

      const current = getTime();
      const forecastKey = generateKey({
        fromTime: startOfHour(current).toISOString(),
        timeStepMs: '1800000',
        typeIds: this.reusableInventoryTypes
          .map((reusableInventoryType) => reusableInventoryType.typeId)
          .map(encodeURIComponent)
          .join(','),
        countType: 'uniqueUse'
      });
      if (this._forecastKey !== forecastKey) {
        this.reusableInventoryService
          .fetchMemberCountForecast({
            fromTime: startOfHour(current),
            filterTypeIds: this.reusableInventoryTypes.map(
              (reusableInventoryType) => reusableInventoryType.typeId
            ),
            filterInstanceIds: null,
            groupBy: 'type',
            countType: 'uniqueUse'
          })
          .then((result) => {
            this._forecast = result;
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
          lines: this._countHistory.groups.map((group, i) => ({
            name: this.reusableInventoryTypes![i].typeName,
            values: this._countHistory!.records.map(
              (record) => record.counts[group] / this.reusableInventoryTypeCapacity![group]
            )
          })),
          labels: this._countHistory.records.map((record) => startOfHour(record.periodStartTime)),
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
          lines: this._forecast.groups.map((group, i) => ({
            name: this.reusableInventoryTypes![i].typeName,
            values: this._forecast!.values[i].slice(0, 8).map(
              (value) =>
                value / this.reusableInventoryTypeCapacity![this.reusableInventoryTypes![i].typeId]
            )
          })),
          labels: this._forecast.timeSpans.slice(0, 8).map((timeSpan) => timeSpan[0]),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartPredictionDataDeps = [this._forecast];
    }

    if (this._gaugeDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._gaugeData = null;
      } else {
        this._gaugeData = this._countHistory.groups.map((group, i) => ({
          name: this.reusableInventoryTypes![i].typeName,
          value:
            this._countHistory!.records[this._countHistory!.records.length - 1].counts[group]
            / this.reusableInventoryTypeCapacity![this.reusableInventoryTypes![i].typeId]
        }));
      }
      this._gaugeDataDeps = [this._countHistory];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderLineChart()}
        ${this._renderGauges()}
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
          <span slot="title">Utilization rate of reusable inventories</span>
        </inno-line-chart>
      </div>
    `;
  }
}
