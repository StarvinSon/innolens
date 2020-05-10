import {
  startOfMinute, setMinutes,
  getMinutes, format as formatDate
} from 'date-fns';
import {
  LitElement, TemplateResult, html,
  customElement, PropertyValues, property, query
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../button';
import '../chart-card';
import '../choice-chip';
import '../choice-chips';
import '../datetime-input';
import '../line-chart-2';
import {
  AccessCausalityService, AccessCausalityFeaturesHistory,
  AccessCausalityFeaturesForecast
} from '../../services/access-causality';
import { toggleNullableArray } from '../../utils/array';
import { mergeArray } from '../../utils/immutable/array';
import { mergeObject } from '../../utils/immutable/object';
import { strictParseInt } from '../../utils/number';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { getTime } from '../../utils/time';

import { css, classes } from './access-causality-page.scss';


interface ModifiedFeaturesHistory {
  readonly startTimes: ReadonlyArray<Date>;
  readonly endTimes: ReadonlyArray<Date>;
  readonly features: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
  readonly inputValids: ReadonlyArray<boolean>;
}


const emptyArray: ReadonlyArray<never> = [];


const TAG_NAME = 'inno-access-causality-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: AccessCausalityPage;
  }
}

@customElement(TAG_NAME)
export class AccessCausalityPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(AccessCausalityService)
  @observeProperty('_onServiceInjected')
  public accessCausalityService: AccessCausalityService | null = null;


  @property({ attribute: false })
  private _selectedTime: Date | null = null;

  @property({ attribute: false })
  private _selectedFeatures: ReadonlyArray<string> | null = null;


  private _originalHistoryKey: string | null = null;

  @property({ attribute: false })
  private _originalHistory: AccessCausalityFeaturesHistory | null = null;


  private _modifiedHistoryDeps: readonly [AccessCausalityFeaturesHistory | null] = [null];

  @property({ attribute: false })
  private _modifiedHistory: ModifiedFeaturesHistory | null = null;


  private _originalForecastDeps: readonly [AccessCausalityFeaturesHistory | null] = [null];

  @property({ attribute: false })
  private _originalForecast: AccessCausalityFeaturesForecast | null = null;


  private _modifiedForecastDeps: readonly [ModifiedFeaturesHistory | null] = [null];

  @property({ attribute: false })
  private _modifiedForecast: AccessCausalityFeaturesForecast | null = null;


  private _featureLineChartsDeps: {
    readonly originalHistory: AccessCausalityFeaturesHistory | null;
    readonly modifiedHistory: ModifiedFeaturesHistory | null;
    readonly originalForecast: AccessCausalityFeaturesForecast | null;
    readonly modifiedForecast: AccessCausalityFeaturesForecast | null;
    readonly selectedFeatures: ReadonlyArray<string> | null;
  } = {
    originalHistory: null,
    modifiedHistory: null,
    originalForecast: null,
    modifiedForecast: null,
    selectedFeatures: null
  };

  private _featureLineChartsProps: ReadonlyArray<{
    readonly name: string;
    readonly ys: ReadonlyArray<ReadonlyArray<number>>;
    readonly yMax: number;
    readonly dashedStartIndex: number;
    readonly xLabels: ReadonlyArray<readonly [Date, Date]>;

    readonly modifiedHistoryValues: ReadonlyArray<number>;
    readonly modifiedHistoryValuesValid: boolean;
  }> | null = null;


  @query(`.${classes.timeInput}`)
  private readonly _timeInputElem!: import('../datetime-input').DatetimeInput;


  public constructor() {
    super();
  }

  private _onServiceInjected(): void {
    this.requestUpdate();
  }


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.accessCausalityService === null) return;

    if (this._selectedTime === null) {
      let time = getTime();
      time = startOfMinute(time);
      time = setMinutes(time, Math.floor(getMinutes(time) / 30) * 30);
      this._selectedTime = time;
      // this._selectedTime = new Date('2020-04-27T12:30+08:00');
    }

    const oriHistoryKey = JSON.stringify({
      toTime: this._selectedTime
    });
    if (this._originalHistoryKey !== oriHistoryKey) {
      if (this._selectedTime === null) {
        this._originalHistory = null;
      } else {
        this.accessCausalityService
          .fetchFeaturesHistory({
            toTime: this._selectedTime
          })
          .then((history) => {
            if (this._originalHistoryKey === oriHistoryKey) {
              this._originalHistory = history;
            }
          })
          .catch((err) => {
            console.error(err);
            if (this._originalHistoryKey === oriHistoryKey) {
              this._originalHistory = null;
            }
          });
      }
      this._originalHistoryKey = oriHistoryKey;
    }

    const oriForecastDeps: AccessCausalityPage['_originalForecastDeps'] = [this._originalHistory];
    if (this._originalForecastDeps[0] !== oriForecastDeps[0]) {
      if (this._originalHistory === null) {
        this._originalForecast = null;
      } else {
        this.accessCausalityService
          .fetchFeaturesForecast({
            startTimes: this._originalHistory.startTimes,
            endTimes: this._originalHistory.endTimes,
            features: this._originalHistory.features,
            values: this._originalHistory.values
          })
          .then((forecast) => {
            if (this._originalForecastDeps === oriForecastDeps) {
              this._originalForecast = forecast;
            }
          })
          .catch((err) => {
            console.error(err);
            if (this._originalForecastDeps === oriForecastDeps) {
              this._originalForecast = null;
            }
          });
      }
      this._originalForecastDeps = oriForecastDeps;
    }

    if (this._modifiedHistoryDeps[0] !== this._originalHistory) {
      if (this._originalHistory === null) {
        this._modifiedHistory = null;
      } else {
        this._modifiedHistory = {
          ...this._originalHistory,
          inputValids: this._originalHistory.features.map(() => true)
        };
      }
      this._modifiedHistoryDeps = [this._originalHistory];
    }

    const modForecastDeps: AccessCausalityPage['_modifiedForecastDeps'] = [this._modifiedHistory];
    if (this._modifiedForecastDeps[0] !== modForecastDeps[0]) {
      if (this._modifiedHistory === null) {
        this._modifiedForecast = null;
      } else {
        this.accessCausalityService
          .fetchFeaturesForecast({
            startTimes: this._modifiedHistory.startTimes,
            endTimes: this._modifiedHistory.endTimes,
            features: this._modifiedHistory.features,
            values: this._modifiedHistory.values
          })
          .then((forecast) => {
            if (this._modifiedForecastDeps === modForecastDeps) {
              this._modifiedForecast = forecast;
            }
          })
          .catch((err) => {
            console.error(err);
            if (this._modifiedForecastDeps === modForecastDeps) {
              this._modifiedForecast = null;
            }
          });
      }
      this._modifiedForecastDeps = modForecastDeps;
    }

    if (this._originalHistory === null) {
      this._selectedFeatures = null;
    } else if (this._selectedFeatures !== null) {
      const validFeatures = this._selectedFeatures
        .filter((feature) => this._originalHistory!.features.includes(feature));
      if (validFeatures.length === 0) {
        this._selectedFeatures = null;
      } else {
        this._selectedFeatures = mergeArray(this._selectedFeatures, validFeatures);
      }
    }

    if (
      this._featureLineChartsDeps.originalHistory !== this._originalHistory
      || this._featureLineChartsDeps.originalForecast !== this._originalForecast
      || this._featureLineChartsDeps.modifiedHistory !== this._modifiedHistory
      || this._featureLineChartsDeps.modifiedForecast !== this._modifiedForecast
      || this._featureLineChartsDeps.selectedFeatures !== this._selectedFeatures
    ) {
      if (
        this._originalHistory === null || this._originalForecast === null
        || this._modifiedHistory === null || this._modifiedForecast === null
      ) {
        this._featureLineChartsProps = null;
      } else {
        const features = this._selectedFeatures ?? this._originalHistory.features;
        const featureLineChartsProps = features.map((feature) => {
          const oriHistoryIdx = this._originalHistory!.features.indexOf(feature);
          const oriForecastIdx = this._originalForecast!.features.indexOf(feature);
          const modHistoryIdx = this._modifiedHistory!.features.indexOf(feature);
          const modForecastIdx = this._modifiedForecast!.features.indexOf(feature);
          if (
            oriHistoryIdx < 0 || oriForecastIdx < 0
            || modHistoryIdx < 0 || modForecastIdx < 0
          ) {
            throw new Error('Failed to find index. This should not happen.');
          }

          const oriY = this._originalHistory!.values[oriHistoryIdx]
            .concat(this._originalForecast!.values[oriForecastIdx]);
          const modY = this._modifiedHistory!.values[modHistoryIdx]
            .concat(this._modifiedForecast!.values[modForecastIdx]);

          if (this._originalHistory!.endTimes.length !== this._modifiedHistory!.endTimes.length) {
            throw new Error('original history has different length than modified history');
          }
          const dashedStartIndex = this._originalHistory!.endTimes.length - 1;
          const xLabels = [
            ...this._originalHistory!.startTimes
              .map((st, t) => [st, this._originalHistory!.endTimes[t]] as const),
            ...this._originalForecast!.startTimes
              .map((st, t) => [st, this._originalForecast!.endTimes[t]] as const)
          ];

          const modHistoryValuesValid = modHistoryIdx < 0
            ? true
            : this._modifiedHistory!.inputValids[modHistoryIdx];

          return {
            name: feature,
            ys: [oriY, modY],
            dashedStartIndex,
            xLabels,

            modifiedHistoryValues: this._modifiedHistory!.values[modHistoryIdx],
            modifiedHistoryValuesValid: modHistoryValuesValid
          };
        });
        const yMax = featureLineChartsProps
          .flatMap((props) => props.ys.flat(1))
          .reduce((a, b) => Math.max(a, b), 0);
        this._featureLineChartsProps = featureLineChartsProps.map((props) => ({
          ...props,
          yMax
        }));
      }
      this._featureLineChartsDeps = {
        originalHistory: this._originalHistory,
        originalForecast: this._originalForecast,
        modifiedHistory: this._modifiedHistory,
        modifiedForecast: this._modifiedForecast,
        selectedFeatures: this._selectedFeatures
      };
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this._renderOptions()}
      ${this._renderCharts()}
    `;
  }

  private _renderOptions(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.options}">

        <div class="${classes.option}">
          <div class="${classes.option_label}">Template time</div>
          <inno-datetime-input
            class="${classes.timeInput}"
            .time="${this._selectedTime}"
            .timeStepSec="${30 * 60}"
            @selected-time-changed="${this._onSelectedTimeChanged}"
          ></inno-datetime-input>
        </div>

        ${this._renderChipOptions({
          title: 'Features',
          items: this._originalHistory === null ? emptyArray : [
            null,
            ...this._originalHistory.features
          ],
          formatItem: (item) => item === null ? 'All' : item,
          selectItem: (item) => item === null
            ? this._selectedFeatures === null
            : (this._selectedFeatures !== null && this._selectedFeatures.includes(item)),
          onClick: (item) => this._onFeatureChipClick(item)
        })}

        <div class="${classes.legends}">
          <div class="${classes.legends_content}">
            <span class="${classes.legend} ${classes.legend_$original}">Original Data</span>
            <span class="${classes.legend} ${classes.legend_$modified}">Modified Data</span>
          </div>
        </div>

        <inno-button
          theme="raised"
          @click="${this._onClearModificationClick}"
        >Clear modification</inno-button>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderChipOptions<T>(options: {
    readonly title: unknown,
    readonly items: ReadonlyArray<T>,
    readonly selectItem: (item: T) => boolean,
    readonly formatItem?: (item: T) => unknown,
    readonly onClick: (item: T) => void
  }): TemplateResult {
    return html`
      <div class="${classes.option}">
        <div class="${classes.option_label}">${options.title}</div>
        <inno-choice-chips
          class="${classes.option_chips}"
        >
          ${options.items.map((item) => html`
            <inno-choice-chip
              .selected="${options.selectItem(item)}"
              @click="${() => options.onClick(item)}">
              ${options.formatItem === undefined ? item : options.formatItem(item)}
            </inno-choice-chip>
          `)}
        </inno-choice-chips>
      </div>
    `;
  }

  private _renderCharts(): TemplateResult {
    return html`
      <div class="${classes.charts}">
        ${this._renderFeatureCharts()}
      </div>
    `;
  }

  private _renderFeatureCharts(): TemplateResult {
    /* eslint-disable max-len, @typescript-eslint/indent */
    return html`
      ${this._featureLineChartsProps === null
        ? []
        : this._featureLineChartsProps.map((chartProps) => html`
          <inno-chart-card>
            <inno-line-chart-2
              class="${classes.featureChart}"
              .ys="${chartProps.ys}"
              .yMax="${chartProps.yMax}"
              .dashedStartIndex="${chartProps.dashedStartIndex}"
              .xLabels="${chartProps.xLabels}"
              .formatXLabel="${this._formatLineChartXLabel}"
            >
              <span slot="title">${chartProps.name}</span>
            </inno-line-chart-2>
            <div class="${classes.featureHistoryInput}">
              <input
                class="${classes.featureHistoryInput_input}"
                .value="${chartProps.modifiedHistoryValues.join(', ')}"
                @input="${(event: Event) => this._onFeatureHistoryInputChange(chartProps.name, event)}"
              >
              <span
                class="${classMap({
                  [classes.featureHistoryInput_validMessage]: true,
                  [classes.featureHistoryInput_validMessage_$valid]: chartProps.modifiedHistoryValuesValid,
                  [classes.featureHistoryInput_validMessage_$invalid]: !chartProps.modifiedHistoryValuesValid
                })}"
              ></span>
            </div>
          </inno-chart-card>
        `)}
    `;
    /* eslint-enable max-len, @typescript-eslint/indent */
  }

  private _formatLineChartXLabel(
    [startTime, endTime]: readonly [Date, Date],
    i: number // eslint-disable-line @typescript-eslint/no-unused-vars
  ): TemplateResult {
    return html`${formatDate(startTime, 'HH:mm')}<br>|<br>${formatDate(endTime, 'HH:mm')}`;
  }


  private _onSelectedTimeChanged(): void {
    this._selectedTime = this._timeInputElem.selectedTime;
  }

  private _onFeatureChipClick(feature: string | null): void {
    if (feature === null) {
      this._selectedFeatures = null;
    } else {
      this._selectedFeatures = toggleNullableArray(this._selectedFeatures, feature);
    }
  }

  private _onFeatureHistoryInputChange(feature: string, event: Event): void {
    let idx: number;
    if (
      this._modifiedHistory === null
      || (idx = this._modifiedHistory.features.indexOf(feature)) < 0
    ) {
      return;
    }

    let modHistoryValues = this._modifiedHistory.values[idx];
    let modHistoryValuesValid = this._modifiedHistory.inputValids[idx];

    const text = (event.currentTarget as HTMLInputElement).value;
    const numbers = text
      .split(',')
      .map((item) => item.trim())
      .map((item) => strictParseInt(item));
    if (
      numbers.length === modHistoryValues.length
      && numbers.every((num) => !Number.isNaN(num))
    ) {
      modHistoryValues = numbers;
      modHistoryValuesValid = true;
    } else {
      modHistoryValuesValid = false;
    }

    this._modifiedHistory = mergeObject(this._modifiedHistory, {
      values: mergeArray(this._modifiedHistory.values, [
        ...this._modifiedHistory.values.slice(0, idx),
        mergeArray(this._modifiedHistory.values[idx], modHistoryValues),
        ...this._modifiedHistory.values.slice(idx + 1)
      ]),
      inputValids: mergeArray(this._modifiedHistory.inputValids, [
        ...this._modifiedHistory.inputValids.slice(0, idx),
        modHistoryValuesValid,
        ...this._modifiedHistory.inputValids.slice(idx + 1)
      ])
    });
  }

  private _onClearModificationClick(): void {
    if (this._originalHistory !== null && this._modifiedHistory !== null) {
      this._modifiedHistory = mergeObject(this._modifiedHistory, {
        values: this._originalHistory.values,
        inputValids: mergeArray(
          this._modifiedHistory.inputValids,
          this._modifiedHistory.inputValids.map(() => true)
        )
      });
    }
  }
}
