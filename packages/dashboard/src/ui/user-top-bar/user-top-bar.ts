import {
  LitElement, TemplateResult, html,
  customElement
} from 'lit-element';

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

  protected render(): TemplateResult {
    return html`
      <inno-icon-button
        class="${classes.drawerIcon}"
        @click="${this._onDrawerButtonClick}">
        ${menuIcon(classes.drawerIcon_svg)}
      </inno-icon-button>
      <h1 class="${classes.logo}">InnoLens User Dashboard</h1>
    `;
  }

  private _onDrawerButtonClick(): void {
    this.dispatchEvent(new Event('drawer-toggled'));
  }
}
