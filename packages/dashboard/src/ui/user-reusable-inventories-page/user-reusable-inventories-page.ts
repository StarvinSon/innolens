import {
  format as formatDate, addHours, startOfHour, getHours
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../gauge';
import {
  ReusableInventoryService, ReusableInventoryType, ReusableInventoryMemberCountHistory
} from '../../services/reusable-inventory';

import { css, classes } from './user-reusable-inventories-page.scss';

interface ReusableInventoryMemberCountPrediction {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ReusableInventoryMemberCountPredictionRecord>;
}

interface ReusableInventoryMemberCountPredictionRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly counts: ReusableInventoryMemberCountPredictionRecordValues;
}

interface ReusableInventoryMemberCountPredictionRecordValues {
  readonly [group: string]: number;
}

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
  private _countHistory: ReadonlyArray<ReusableInventoryMemberCountHistory> | null = null;

  @property({ attribute: false })
  private _countPrediction: ReadonlyArray<ReusableInventoryMemberCountPrediction> | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _gaugeData: ReadonlyArray<{ name: string; value: number }> | null = null;

  private _lineChartDataDeps: readonly [
    ReadonlyArray<ReusableInventoryMemberCountHistory> | null
  ] = [null];

  private _lineChartPredictionDataDeps: readonly [
    ReadonlyArray<ReusableInventoryMemberCountPrediction> | null
  ] = [null];

  private _gaugeDataDeps: readonly [
    ReadonlyArray<ReusableInventoryMemberCountHistory> | null
  ] = [null];

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
          const instancesOfType = await this.reusableInventoryService!.updateInstances(
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

      const reusableInventoryCountPromises = this.reusableInventoryTypes.map(
        async (reusableInventoryType): Promise<ReusableInventoryMemberCountHistory> =>
          this.reusableInventoryService!.updateMemberCountHistory(
            getHours(new Date()),
            [reusableInventoryType.typeId],
            undefined,
            undefined,
            'uniqueUseCounts'
          )
      );
      Promise.all(reusableInventoryCountPromises).then((reusableInventoryData) => {
        this._countHistory = reusableInventoryData;
      });

      // Hard coded predictions
      const time = startOfHour(new Date());
      this._countPrediction = this.reusableInventoryTypes.map(() => ({
        groups: ['total'],
        records: [...Array(25 - getHours(time))].map((_, i) => ({
          periodStartTime: addHours(time, i),
          periodEndTime: addHours(time, i + 1),
          counts: { total: Math.round(Math.random()) }
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
            const { typeId, typeName } = this.reusableInventoryTypes![i];
            return {
              name: typeName,
              values: history.records.map(
                (record) => record.counts.total / this.reusableInventoryTypeCapacity![typeId]
              )
            };
          }),
          labels: this._countHistory[0].records.map(
            (record) => startOfHour(record.periodStartTime)
          ),
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
            const { typeId, typeName } = this.reusableInventoryTypes![i];
            return {
              name: typeName,
              values: history.records.map(
                (record) => record.counts.total / this.reusableInventoryTypeCapacity![typeId]
              )
            };
          }),
          labels: this._countPrediction[0].records.map(
            (record) => startOfHour(record.periodStartTime)
          ),
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
          const { typeId, typeName } = this.reusableInventoryTypes![i];
          return {
            name: typeName,
            value:
              history.records[history.records.length - 1].counts.total
              / this.reusableInventoryTypeCapacity![typeId]
          };
        });
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
          .labels="${8}"
          showPercentage
        >
          <span slot="title">Utilization rate of reusable inventories</span>
        </inno-line-chart>
      </div>
    `;
  }
}
