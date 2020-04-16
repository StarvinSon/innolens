import { format as formatDate } from 'date-fns';
import {
  LitElement, TemplateResult, html,
  customElement, property
} from 'lit-element';

import logo from '../../images/logo-2-horizontal.png';
import '../button';
import '../theme';
import '../typography';

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
  private currentTime: string = formatDate(new Date(), 'eee d MMM  HH:mm');

  public constructor() {
    super();
    setInterval(() => {
      this.currentTime = formatDate(new Date(), 'eee d MMM  HH:mm');
    }, 1000);
  }

  protected render(): TemplateResult {
    return html`
      <inno-button
        class="${classes.drawerButton}"
        @click="${this._onDrawerButtonClick}">
        <img src="${logo}" width="256" height="48" />
      </inno-button>

      <div class="${classes.info}">
        ${this.currentTime}
      </div>
    `;
  }

  private _onDrawerButtonClick(): void {
    this.dispatchEvent(new Event('drawer-toggled'));
  }
}
