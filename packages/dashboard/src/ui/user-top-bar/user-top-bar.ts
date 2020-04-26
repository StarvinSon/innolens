import { format as formatDate } from 'date-fns';
import {
  LitElement, TemplateResult, html,
  customElement, property, PropertyValues
} from 'lit-element';

import logo from '../../images/logo-2-horizontal.png';
import { CurrentWeather, WeatherService } from '../../services/weather';
import '../button';
import '../theme';
import '../typography';

import { css, classes } from './user-top-bar.scss';


const TAG_NAME = 'inno-user-top-bar';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserTopBar;
  }
}

/**
 * @event drawer-toggled
 */
@customElement(TAG_NAME)
export class UserTopBar extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  public weatherService: WeatherService | null = null;

  @property({ attribute: false })
  private _currentTime: string = formatDate(new Date(), 'eee d MMM  HH:mm');

  @property({ attribute: false })
  private _currentWeather: CurrentWeather | null = null;

  public constructor() {
    super();
    setInterval(() => {
      this._currentTime = formatDate(new Date(), 'eee d MMM  HH:mm');
    }, 1000);
  }

  protected async update(changedProps: PropertyValues): Promise<void> {
    if (this.weatherService === null) return;

    if (this._currentWeather === null) {
      this._currentWeather = await this.weatherService.getCurrentWeather();
    }

    super.update(changedProps);
  }

  protected render(): TemplateResult {
    return html`
      <inno-button
        class="${classes.drawerButton}"
        @click="${this._onDrawerButtonClick}">
        <img src="${logo}" width="256" height="48" />
      </inno-button>

      <div class="${classes.info}">
        ${this._renderCurrentWeather()}
        <div class="${classes.time}">${this._currentTime}</div>
      </div>
    `;
  }

  private _renderCurrentWeather(): TemplateResult {
    if (this._currentWeather === null) return html``;

    return html`
      <div class="${classes.icon}">
        <img src="${this._currentWeather.icon}" />
      </div>
      <div class="${classes.temperature}">${this._currentWeather.temperature.value}ºC</div>
    `;
  }

  private _onDrawerButtonClick(): void {
    this.dispatchEvent(new Event('drawer-toggled'));
  }
}
