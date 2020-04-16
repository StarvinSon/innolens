import { format as formatDate } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';

import '../choice-chip';
import '../choice-chips';
import '../line-chart';
import '../chart-card';
import {
  ExpendableInventoryService, ExpendableInventoryAccessHistoryGroupBy,
  ExpendableInventoryAccessHistory,
  ExpendableInventoryAccessHistoryCountType
} from '../../services/expendable-inventory';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './expendable-inventory-access-history-chart.scss';


const TAG_NAME = 'inno-expendable-inventory-access-history-chart';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ExpendableInventoryAccessHistoryChart;
  }
}

@customElement(TAG_NAME)
export class ExpendableInventoryAccessHistoryChart extends LitElement {
  public static readonly styles = css;


  @injectableProperty(ExpendableInventoryService)
  @observeProperty('_onDependencyInjected')
  public expendableInventoryService: ExpendableInventoryService | null;


  @property({ attribute: false })
  public fromTime: Date | null = null;

  @property({ attribute: false })
  public toTime: Date | null = null;

  @property({ attribute: false })
  public timeStepMs: number = 30 * 60 * 1000; // 30 minutes

  @property({ attribute: false })
  public typeIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  public groupBy: ExpendableInventoryAccessHistoryGroupBy | null = null;

  @property({ attribute: false })
  public countType: ExpendableInventoryAccessHistoryCountType = 'total';


  @property({ attribute: false })
  private _history: ExpendableInventoryAccessHistory | null = null;

  @property({ attribute: false })
  private _chartData: import('../line-chart').LineChartData<Date> | null = null;


  private _chartDataDeps: readonly [
    ExpendableInventoryAccessHistory | null
  ] = [null];


  public constructor() {
    super();
    this._onExpendableInventoryServiceUpdated =
      this._onExpendableInventoryServiceUpdated.bind(this);
    this.expendableInventoryService = null;
  }


  private _onDependencyInjected(): void {
    if (this.expendableInventoryService !== null) {
      this.expendableInventoryService.addEventListener('access-history-updated', this._onExpendableInventoryServiceUpdated);
      this._updateProperties();
    }
  }

  private _onExpendableInventoryServiceUpdated(): void {
    this.requestUpdate();
  }


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.expendableInventoryService === null) return;

    if (this.fromTime === null || this.toTime === null || this.typeIds === null) {
      this._history = null;
    } else {
      const opts = [
        this.fromTime,
        this.toTime,
        this.timeStepMs,
        this.typeIds.length > 0 ? this.typeIds : undefined,
        this.groupBy ?? undefined,
        this.countType
      ] as const;
      const data = this.expendableInventoryService.getAccessHistory(...opts);
      switch (data.type) {
        case 'none': {
          this.expendableInventoryService.fetchAccessHistory(...opts);
          break;
        }
        case 'successful': {
          this._history = data.data;
          break;
        }
        case 'failed': {
          this._history = null;
          break;
        }
        // no default
      }
    }

    if (this._chartDataDeps[0] !== this._history) {
      if (this._history === null) {
        this._chartData = null;
      } else {
        this._chartData = {
          lines: this._history.groups.map((group) => ({
            name: group,
            values: this._history!.records
              .map((record) => record.counts[group])
          })),
          labels: this._history.records.map((record) => record.endTime),
          formatLabel: (time) => formatDate(time, 'd/L')
        };
      }
      this._chartDataDeps = [this._history];
    }
  }

  protected render(): TemplateResult {
    return html`
      <inno-line-chart
        class="${classes.lineChart}"
        .data="${this._chartData}"
      >
        <span slot="title">Expenable Inventory Access History</span>
      </inno-line-chart>
    `;
  }
}
