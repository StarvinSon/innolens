import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import '../button';
import '../ripple';
import '../theme';
import '../typography';

import { css } from './tab-bar.scss';


const TAG_NAME = 'inno-tab-bar';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: TabBar;
  }
}

@customElement(TAG_NAME)
export class TabBar extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  public page: string = '';

  @property({ type: Array })
  public tabs: Array<{ name: string, page: string }> = [];

  protected render(): TemplateResult {
    const { page, tabs, _onTabButtonClick } = this;

    return html`
      ${tabs.map((tab) => html`
        <inno-button
          theme="${page === tab.page ? 'raised' : 'flat'}"
          @click="${_onTabButtonClick.bind(this, tab.page)}"
        >
          ${tab.name}
        </inno-button>
      `)}
    `;
  }

  private _onTabButtonClick(page: string): void {
    this.dispatchEvent(new CustomEvent('pageChange', {
      detail: { page }
    }));
  }
}
