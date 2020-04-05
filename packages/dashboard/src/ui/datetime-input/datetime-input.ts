import { parseISO, formatISO } from 'date-fns';
import {
  customElement, LitElement, TemplateResult,
  html, property, query
} from 'lit-element';

import { css, classes } from './datetime-input.scss';


const TAG_NAME = 'inno-datetime-input';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: DatetimeInput;
  }
}

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
    this._dateInputTime = newVal;
    this._timeInputTime = newVal;
  }

  @property({ attribute: false })
  private _dateInputTime: Date | null = null;

  @property({ attribute: false })
  private _timeInputTime: Date | null = null;


  private _selectedTime: Date | null = null;

  private _updateSelectedTime(): void {
    const oldSelectedTime = this._selectedTime;

    const time = this._dateInputTime === null || this._timeInputTime === null
      ? null
      : new Date(this._dateInputTime.getTime() + this._timeInputTime.getTime());
    if (time === null) {
      this._selectedTime = null;
    } else if (this._selectedTime === null || this._selectedTime.getTime() !== time.getTime()) {
      this._selectedTime = time;
    }

    if (oldSelectedTime !== this._selectedTime) {
      this.dispatchEvent(new Event('selected-time-changed'));
    }
  }

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

  protected render(): TemplateResult {
    return html`
      <input
        class="${classes.dateInput}"
        type="date"
        .valueAsDate="${this._dateInputTime}"
        .required="${this.required}"
        @input="${this._onInputChanged}">
      <input
        class="${classes.timeInput}"
        type="time"
        .valueAsDate="${this._timeInputTime}"
        .required="${this.required}"
        @input="${this._onInputChanged}">
    `;
  }

  private _onInputChanged(): void {
    this._dateInputTime = this._dateInputElement.valueAsDate;
    this._timeInputTime = this._timeInputElement.valueAsDate;
    this._updateSelectedTime();
  }
}
