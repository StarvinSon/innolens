import { parseISO, formatISO, format as formatDate } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import {
  customElement, LitElement, TemplateResult,
  html, property, query, PropertyValues
} from 'lit-element';

import { css, classes } from './datetime-input.scss';


const TAG_NAME = 'inno-datetime-input';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: DatetimeInput;
  }
}

/**
 * @event selected-time-changed
 */
@customElement(TAG_NAME)
export class DatetimeInput extends LitElement {
  public static readonly styles = css;


  @property({ type: Boolean })
  public required = false;


  private _time: Date | null = null;

  @property({
    converter: {
      fromAttribute: (val) => parseISO(val!),
      toAttribute: (val) => val === null ? null : formatISO(val as Date)
    }
  })
  public get time(): Date | null {
    return this._time;
  }

  public set time(newVal: Date | null) {
    this._time = newVal;
    this._dateInputTime = newVal === null ? '' : formatDate(newVal, 'yyyy-MM-dd');
    this._timeInputTime = newVal === null ? '' : formatDate(newVal, 'HH:mm');
  }

  @property({ type: Number })
  public timeStepSec = 60;

  @property({ type: String })
  public timezone = 'Asia/Hong_Kong';


  @property({ attribute: false })
  private _dateInputTime = '';

  @property({ attribute: false })
  private _timeInputTime = '';


  private _selectedTime: Date | null = null;

  public get selectedTime(): Date | null {
    return this._selectedTime === null ? null : new Date(this._selectedTime);
  }


  @query(`.${classes.dateInput}`)
  private readonly _dateInputElement!: HTMLInputElement;

  @query(`.${classes.timeInput}`)
  private readonly _timeInputElement!: HTMLInputElement;


  protected createRenderRoot(): ShadowRoot | Element {
    return this.attachShadow({
      mode: 'open',
      delegatesFocus: true
    });
  }

  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this._dateInputTime === '' || this._timeInputTime === '') {
      this._selectedTime = null;
    } else {
      let time = parseISO(`${this._dateInputTime}T${this._timeInputTime}`);
      time = zonedTimeToUtc(time, this.timezone);
      if (this._selectedTime === null || this._selectedTime.getTime() !== time.getTime()) {
        this._selectedTime = time;
        Promise.resolve().then(() => this.dispatchEvent(new Event('selected-time-changed')));
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <input
        class="${classes.dateInput}"
        type="date"
        .value="${this._dateInputTime}"
        .required="${this.required}"
        @input="${this._onInputChanged}">
      <input
        class="${classes.timeInput}"
        type="time"
        .value="${this._timeInputTime}"
        .step="${String(this.timeStepSec)}"
        .required="${this.required}"
        @input="${this._onInputChanged}">
    `;
  }

  private _onInputChanged(): void {
    this._dateInputTime = this._dateInputElement.value;
    this._timeInputTime = this._timeInputElement.value;
  }
}
