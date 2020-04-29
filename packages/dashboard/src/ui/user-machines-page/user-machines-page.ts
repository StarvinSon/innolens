import {
  format as formatDate, addHours, startOfHour, getHours
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../gauge';
import {
  MachineService, MachineType, MachineMemberCountHistoryLegacy
} from '../../services/machine';

import { css, classes } from './user-machines-page.scss';

interface MachineMemberCountPrediction {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<MachineMemberCountPredictionRecord>;
}

interface MachineMemberCountPredictionRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly acquireCounts: MachineMemberCountPredictionRecordValues;
  readonly uniqueAcquireCounts: MachineMemberCountPredictionRecordValues;
  readonly releaseCounts: MachineMemberCountPredictionRecordValues;
  readonly uniqueReleaseCounts: MachineMemberCountPredictionRecordValues;
  readonly useCounts: MachineMemberCountPredictionRecordValues;
  readonly uniqueUseCounts: MachineMemberCountPredictionRecordValues;
}

interface MachineMemberCountPredictionRecordValues {
  readonly [group: string]: number;
}

const TAG_NAME = 'inno-user-machines-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserMachinesPage;
  }
}

@customElement(TAG_NAME)
export class UserMachinesPage extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  public machineService: MachineService | null = null;

  @property({ attribute: false })
  public machineTypes: ReadonlyArray<MachineType> | null = null;

  @property({ attribute: false })
  public machineTypeCapacity: Readonly<Record<string, number>> | null = null;

  @property({ attribute: false })
  private _countHistory: ReadonlyArray<MachineMemberCountHistoryLegacy> | null = null;

  @property({ attribute: false })
  private _countPrediction: ReadonlyArray<MachineMemberCountPrediction> | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _gaugeData: ReadonlyArray<{ name: string; value: number }> | null = null;

  // eslint-disable-next-line max-len
  private _lineChartDataDeps: readonly [ReadonlyArray<MachineMemberCountHistoryLegacy> | null] = [null];

  private _lineChartPredictionDataDeps: readonly [
    ReadonlyArray<MachineMemberCountPrediction> | null
  ] = [null];

  private _gaugeDataDeps: readonly [ReadonlyArray<MachineMemberCountHistoryLegacy> | null] = [null];

  private _dataFetched = false;

  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.machineService === null) return;

    if (!this._dataFetched && this.machineTypes !== null) {
      const machineTypeCapacityPromises = this.machineTypes.map(
        async (machineType): Promise<{ typeId: string; count: number }> => {
          const instancesOfType = await this.machineService!.fetchInstances(machineType.typeId);
          return {
            typeId: machineType.typeId,
            count: instancesOfType.length
          };
        }
      );
      Promise.all(machineTypeCapacityPromises).then((capacityData) => {
        this.machineTypeCapacity = capacityData.reduce((acc: Record<string, number>, data) => {
          acc[data.typeId] = data.count;
          return acc;
        }, {});
      });

      const machineCountPromises = this.machineTypes.map(
        async (machineType): Promise<MachineMemberCountHistoryLegacy> =>
          this.machineService!.updateMemberCountHistoryLegacy(
            [machineType.typeId],
            undefined,
            null,
            getHours(new Date())
          )
      );
      Promise.all(machineCountPromises).then((machineData) => {
        this._countHistory = machineData;
      });

      // Hard coded predictions
      const time = startOfHour(new Date());
      this._countPrediction = this.machineTypes.map(() => ({
        groups: ['all'],
        records: [...Array(25 - getHours(time))].map((_, i) => ({
          periodStartTime: addHours(time, i),
          periodEndTime: addHours(time, i + 1),
          acquireCounts: { all: Math.round(Math.random()) },
          uniqueAcquireCounts: { all: Math.round(Math.random()) },
          releaseCounts: { all: Math.round(Math.random()) },
          uniqueReleaseCounts: { all: Math.round(Math.random()) },
          useCounts: { all: Math.round(Math.random()) },
          uniqueUseCounts: { all: Math.round(Math.random()) }
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
            const { typeId, typeName } = this.machineTypes![i];
            return {
              name: typeName,
              values: history.records.map(
                (record) => record.uniqueUseCounts.all / this.machineTypeCapacity![typeId]
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
            const { typeId, typeName } = this.machineTypes![i];
            return {
              name: typeName,
              values: history.records.map(
                (record) => record.uniqueUseCounts.all / this.machineTypeCapacity![typeId]
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
          const { typeId, typeName } = this.machineTypes![i];
          return {
            name: typeName,
            value:
              history.records[history.records.length - 1].uniqueUseCounts.all
              / this.machineTypeCapacity![typeId]
          };
        });
      }
      this._gaugeDataDeps = [this._countHistory];
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        ${this._renderGauges()}
        ${this._renderLineChart()}
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
          <span slot="title">Utilization rate of machines</span>
        </inno-line-chart>
      </div>
    `;
  }
}
