import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import '../tab-bar';

import './all-spaces-page';
import './single-space-page';
import { css } from './spaces-page.scss';


const TAG_NAME = 'inno-spaces-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: SpacesPage;
  }
}

type spacesSubpage = 'all' | 'machineRoom' | 'laserCuttingRoom';

const tabs: Array<{ page: spacesSubpage; name: string }> = [
  { page: 'all', name: 'All' },
  { page: 'machineRoom', name: 'Machine room' },
  { page: 'laserCuttingRoom', name: 'Laser cutting room' }
];

@customElement(TAG_NAME)
export class SpacesPage extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  private currentPage: spacesSubpage = 'all';

  protected render(): TemplateResult {
    return html`
      <inno-tab-bar
        page="${this.currentPage}"
        .tabs="${tabs}"
        @pageChange="${this._handlePageChange}"
      ></inno-tab-bar>

      ${this.content}
    `;
  }

  private _handlePageChange(event: CustomEvent): void {
    this.currentPage = event.detail.page;
  }

  private get content(): TemplateResult {
    switch (this.currentPage) {
      case 'machineRoom':
        return html`
          <inno-single-space-page space="machineRoom"></inno-single-space-page>
        `;
      case 'laserCuttingRoom':
        return html`
          <inno-single-space-page space="laserCuttingRoom"></inno-single-space-page>
        `;
      case 'all':
      default:
        return html`
          <inno-all-spaces-page></inno-all-spaces-page>
        `;
    }
  }
}
