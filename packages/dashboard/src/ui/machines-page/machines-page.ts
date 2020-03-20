import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import '../tab-bar';

import './all-machines-page';
import './single-machine-page';
import { css } from './machines-page.scss';


const TAG_NAME = 'inno-machines-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MachinesPage;
  }
}

type machinesSubpage =
  | 'all'
  | 'waterjetCuttingMachine'
  | 'cncMillingMachine'
  | 'acrylicLaserCutMachine'
  | 'metalLaserCutMachine';

const tabs: Array<{ page: machinesSubpage; name: string }> = [
  { page: 'all', name: 'All' },
  { page: 'waterjetCuttingMachine', name: 'Waterjet cutting machine' },
  { page: 'cncMillingMachine', name: 'CNC milling machine' },
  { page: 'acrylicLaserCutMachine', name: 'Acrylic laser cut machine' },
  { page: 'metalLaserCutMachine', name: 'Metal laser cut machine' }
];

@customElement(TAG_NAME)
export class MachinesPage extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  private currentPage: machinesSubpage = 'all';

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
      case 'waterjetCuttingMachine':
        return html`
          <inno-single-machine-page machine="waterjetCuttingMachine"></inno-single-machine-page>
        `;
      case 'cncMillingMachine':
        return html`
          <inno-single-machine-page machine="cncMillingMachine"></inno-single-machine-page>
        `;
      case 'acrylicLaserCutMachine':
        return html`
          <inno-single-machine-page machine="acrylicLaserCutMachine"></inno-single-machine-page>
        `;
      case 'metalLaserCutMachine':
        return html`
          <inno-single-machine-page machine="metalLaserCutMachine"></inno-single-machine-page>
        `;
      case 'all':
      default:
        return html`
          <inno-all-machines-page></inno-all-machines-page>
        `;
    }
  }
}
