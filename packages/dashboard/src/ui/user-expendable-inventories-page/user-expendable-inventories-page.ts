import {
  format as formatDate, addHours, startOfHour, getHours, startOfDay
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../availability-bar';
import {
  ExpendableInventoryService, ExpendableInventoryType,
  ExpendableInventoryQuantityHistory, expendableInventoryTypeCapacity
} from '../../services/expendable-inventory';

import { css, classes } from './user-expendable-inventories-page.scss';

interface ExpendableInventoryQuantityPrediction {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ExpendableInventoryQuantityPredictionRecord>;
}

interface ExpendableInventoryQuantityPredictionRecord {
  readonly time: Date;
  readonly counts: ExpendableInventoryQuantityPredictionRecordValues;
}

interface ExpendableInventoryQuantityPredictionRecordValues {
  readonly [group: string]: number;
}

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
  private _countHistory: ReadonlyArray<ExpendableInventoryQuantityHistory> | null = null;

  @property({ attribute: false })
  private _countPrediction: ReadonlyArray<ExpendableInventoryQuantityPrediction> | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _availabilityBarData: ReadonlyArray<{ name: string; value: number }> | null = null;

  private _lineChartDataDeps: readonly [
    ReadonlyArray<ExpendableInventoryQuantityHistory> | null
  ] = [null];

  private _lineChartPredictionDataDeps: readonly [
    ReadonlyArray<ExpendableInventoryQuantityPrediction> | null
  ] = [null];

  private _availabilityBarDataDeps: readonly [
    ReadonlyArray<ExpendableInventoryQuantityHistory> | null
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
        async (expendableInventoryType): Promise<ExpendableInventoryQuantityHistory> =>
          this.expendableInventoryService!.fetchQuantityHistory(
            startOfDay(current),
            startOfHour(current),
            3600000,
            [expendableInventoryType.typeId],
            undefined
          )
      );
      Promise.all(expendableInventoryCountPromises).then((expendableInventoryData) => {
        this._countHistory = expendableInventoryData;
      });

      // Hard coded predictions
      const time = startOfHour(new Date());
      this._countPrediction = this.expendableInventoryTypes.map(() => ({
        groups: ['total'],
        records: [...Array(25 - getHours(time))].map((_, i) => ({
          time: addHours(time, i),
          counts: { total: Math.cos(i / 4 + Math.random()) / 2 + 30 }
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
            const { typeId, typeName } = this.expendableInventoryTypes![i];
            return {
              name: typeName,
              values: history.records.map(
                (record) => record.counts.total / expendableInventoryTypeCapacity![typeId]
              )
            };
          }),
          labels: this._countHistory[0].records.map(
            (record) => startOfHour(record.time)
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
            const { typeId, typeName } = this.expendableInventoryTypes![i];
            return {
              name: typeName,
              values: history.records.map(
                (record) => record.counts.total / expendableInventoryTypeCapacity![typeId]
              )
            };
          }),
          labels: this._countPrediction[0].records.map(
            (record) => startOfHour(record.time)
          ),
          formatLabel: (time) => formatDate(time, 'HH:mm')
        };
      }
      this._lineChartPredictionDataDeps = [this._countPrediction];
    }

    if (this._availabilityBarDataDeps[0] !== this._countHistory) {
      if (this._countHistory === null) {
        this._availabilityBarData = null;
      } else {
        this._availabilityBarData = this._countHistory.map((history, i) => {
          const { typeId, typeName } = this.expendableInventoryTypes![i];
          return {
            name: typeName,
            value:
              history.records[history.records.length - 1].counts.total
              / expendableInventoryTypeCapacity![typeId]
          };
        });
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
          .labels="${8}"
          showPercentage
        >
          <span slot="title">Utilization rate of expendable inventories</span>
        </inno-line-chart>
      </div>
    `;
  }
}
