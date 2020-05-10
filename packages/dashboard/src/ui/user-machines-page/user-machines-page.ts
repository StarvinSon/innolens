import {
  format as formatDate, startOfHour
} from 'date-fns';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../gauge';
import {
  MachineService, MachineType,
  MachineMemberCountHistoryLegacy, MachineMemberCountForecast
} from '../../services/machine';
import { generateKey } from '../../utils/key';
import { getTime } from '../../utils/time';

import { css, classes } from './user-machines-page.scss';

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
  private _countHistory: MachineMemberCountHistoryLegacy | null = null;

  private _forecastKey: string | null = null;

  @property({ attribute: false })
  private _forecast: MachineMemberCountForecast | null = null;

  @property({ attribute: false })
  private _lineChartData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _lineChartPredictionData: import('../line-chart').LineChartData<Date> | null = null;

  @property({ attribute: false })
  private _gaugeData: ReadonlyArray<{ name: string; value: number }> | null = null;

  private _lineChartDataDeps: readonly [MachineMemberCountHistoryLegacy | null] = [null];

  private _lineChartPredictionDataDeps: readonly [MachineMemberCountForecast | null] = [null];

  private _gaugeDataDeps: readonly [MachineMemberCountHistoryLegacy | null] = [null];

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

      this.machineService
        .updateMemberCountHistoryLegacy(
          this.machineTypes.map((machineType) => machineType.typeId),
          undefined,
          'type',
          20
        )
        .then((result) => {
          this._countHistory = result;
        });

      const current = getTime();
      const forecastKey = generateKey({
        fromTime: startOfHour(current).toISOString(),
        timeStepMs: '1800000',
        typeIds: this.machineTypes.map((machineType) => machineType.typeId).map(encodeURIComponent).join(','),
        countType: 'uniqueStay'
      });
      if (this._forecastKey !== forecastKey) {
        this.machineService
          .fetchMemberCountForecast({
            fromTime: startOfHour(current),
            filterTypeIds: this.machineTypes.map((machineType) => machineType.typeId),
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
            name: this.machineTypes![i].typeName,
            values: this._countHistory!.records.map(
              (record) => record.uniqueUseCounts[group] / this.machineTypeCapacity![group]
            )
          })),
          labels: this._countHistory.timeSpans.map((timeSpan) => startOfHour(timeSpan[0])),
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
            name: this.machineTypes![i].typeName,
            values: this._forecast!.values[i].slice(0, 8).map(
              (value) => value / this.machineTypeCapacity![this.machineTypes![i].typeId]
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
          name: this.machineTypes![i].typeName,
          value:
            // eslint-disable-next-line max-len
            this._countHistory!.records[this._countHistory!.records.length - 1].uniqueUseCounts[group]
            / this.machineTypeCapacity![this.machineTypes![i].typeId]
        }));
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
          .labels="${12}"
          showPercentage
        >
          <span slot="title">Utilization rate of machines</span>
        </inno-line-chart>
      </div>
    `;
  }
}
