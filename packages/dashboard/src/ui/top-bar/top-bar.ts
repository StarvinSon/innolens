import {
  LitElement, TemplateResult, html,
  customElement
} from 'lit-element';

import logo from '../../images/logo-2-white-horizontal.png';
import '../icon-button';
import '../theme';
import '../typography';
import { menuIcon } from '../icons/menu';

import { css, classes } from './top-bar.scss';


const TAG_NAME = 'inno-top-bar';

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
      <img src="${logo}" width="214" height="40" />
    `;
  }

  private _onDrawerButtonClick(): void {
    this.dispatchEvent(new Event('drawer-toggled'));
  }
}
