import {
  LitElement, TemplateResult, html,
  customElement, property
} from 'lit-element';
import moment from 'moment';

import '../icon-button';
import '../user-theme';
import '../typography';
import { menuIcon } from '../icons/menu';

import { css, classes } from './user-top-bar.scss';


const TAG_NAME = 'inno-user-top-bar';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: TopBar;
  }
}

/**
 * @event drawer-toggled
 */
@customElement(TAG_NAME)
export class TopBar extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  private currentTime: string = moment().format('ddd D MMM  HH:mm');

  public constructor() {
    super();
    setInterval(() => {
      this.currentTime = moment().format('ddd D MMM  HH:mm');
    }, 1000);
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.left}">
        <inno-icon-button
          class="${classes.drawerIcon}"
          @click="${this._onDrawerButtonClick}">
          ${menuIcon(classes.drawerIcon_svg)}
        </inno-icon-button>
        <h1 class="${classes.logo}">InnoLens User Dashboard</h1>
      </div>
      <div class="${classes.right}">
        ${this.currentTime}
      </div>
    `;
  }

  private _onDrawerButtonClick(): void {
    this.dispatchEvent(new Event('drawer-toggled'));
  }
}
