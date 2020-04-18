import { format as formatDate } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, property, PropertyValues
} from 'lit-element';

import '../line-chart';
import {
  SpaceService, SpaceCountHistoryCountType, SpaceCountHistoryGroupBy,
  SpaceCountHistory
} from '../../services/space';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './space-count-history-chart.scss';


const TAG_NAME = 'inno-space-count-history-chart';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: SpaceCountHistoryChart;
  }
}

@customElement(TAG_NAME)
export class SpaceCountHistoryChart extends LitElement {
  public static readonly styles = css;


  @injectableProperty(SpaceService)
  @observeProperty('_onServiceInjected')
  public spaceService: SpaceService | null = null;


  @property({ attribute: false })
  public fromTime: Date | null = null;

  @property({ attribute: false })
  public toTime: Date | null = null;

  @property({ attribute: false })
  public timeStepMs: number | null = null;

  @property({ attribute: false })
  public spaceIds: ReadonlyArray<string> | null = null;

  @property({ attribute: false })
  public countType: SpaceCountHistoryCountType | null = null;

  @property({ attribute: false })
  public groupBy: SpaceCountHistoryGroupBy | null = null;


  private _historyKey: string | null = null;

  @property({ attribute: false })
  private _history: SpaceCountHistory | null = null;


  private _chartDataDeps: readonly [SpaceCountHistory | null] = [null];

  @property({ attribute: false })
  private _chartData: import('../line-chart').LineChartData<Date> | null = null;


  private _onServiceInjected(): void {
    this.requestUpdate();
  }


  protected update(changedProps: PropertyValues): void {
    if (this.spaceService !== null) {
      if (
        this.fromTime === null || this.toTime === null || this.timeStepMs === null
        || this.countType === null
      ) {
        this._historyKey = null;
        this._history = null;
      } else {
        const params = new URLSearchParams();
        params.set('fromTime', this.fromTime.toISOString());
        params.set('toTime', this.toTime.toISOString());
        params.set('timeStepMs', String(this.timeStepMs));
        if (this.spaceIds !== null) params.set('spaceIds', this.spaceIds.map(encodeURIComponent).join(','));
        params.set('countType', this.countType);
        if (this.groupBy !== null) params.set('groupBy', this.groupBy);
        const key = params.toString();

        if (this._historyKey !== key) {
          this.spaceService
            .fetchCountHistory(
              this.fromTime,
              this.toTime,
              this.timeStepMs,
              this.spaceIds,
              this.countType,
              this.groupBy
            )
            .then((data) => {
              if (this._historyKey === key) {
                this._history = data;
              }
            });
        }
        this._historyKey = key;
      }

      if (this._chartDataDeps[0] !== this._history) {
        if (this._history === null) {
          this._chartData = null;
        } else {
          this._chartData = {
            lines: this._history.groups.map((group) => ({
              name: group,
              values: this._history!.records.map((record) => record.counts[group])
            })),
            labels: this._history!.records.map((record) => record.endTime),
            formatLabel: (time) => formatDate(time, 'd/L')
          };
        }
        this._chartDataDeps = [this._history];
      }
    }

    super.update(changedProps);
  }

  protected render(): TemplateResult {
    return html`
      <inno-line-chart
        class="${classes.lineChart}"
        .data="${this._chartData}">
        <span slot="title">Space Member Count History</span>
      </inno-line-chart>
    `;
  }
}
