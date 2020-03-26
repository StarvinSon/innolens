import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import { PathService } from '../../services/path';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import '../button';

import { css, classes } from './machines-single-page.scss';


const TAG_NAME = 'inno-machines-single-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MachinesSinglePage;
  }
}

export type machinesSubpage =
  | 'waterjetCuttingMachine'
  | 'cncMillingMachine'
  | 'acrylicLaserCutMachine'
  | 'metalLaserCutMachine';

export const machines: { [K in machinesSubpage]: { name: string } } = {
  waterjetCuttingMachine: { name: 'Waterjet cutting machine' },
  cncMillingMachine: { name: 'CNC milling machine' },
  acrylicLaserCutMachine: { name: 'Acrylic laser cut machine' },
  metalLaserCutMachine: { name: 'Metal laser cut machine' }
};

@customElement(TAG_NAME)
export class MachinesSinglePage extends LitElement {
  public static readonly styles = css;

  @injectableProperty(PathService)
  @observeProperty('_updatePathListener')
  public pathService: PathService | null;

  @property({ type: String })
  public machine: machinesSubpage = 'waterjetCuttingMachine';

  public constructor() {
    super();
    this._bindPath = this._bindPath.bind(this);
    this.pathService = null;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._updatePathListener();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._updatePathListener();
  }

  private _updatePathListener(): void {
    if (this.pathService === undefined || this.pathService === null) return;

    if (this.isConnected) {
      this.pathService.addEventListener('path-updated', this._bindPath);
      this._bindPath();
    } else {
      this.pathService.removeEventListener('path-updated', this._bindPath);
    }
  }

  private _bindPath(): void {
    if (this.pathService !== null) {
      switch (this.pathService.path) {
        case '/machines/waterjet-cutting-machine':
          this.machine = 'waterjetCuttingMachine';
          break;
        case '/machines/cnc-milling-machine':
          this.machine = 'cncMillingMachine';
          break;
        case '/machines/acrylic-laser-cut-machine':
          this.machine = 'acrylicLaserCutMachine';
          break;
        case '/machines/metal-laser-cut-machine':
          this.machine = 'metalLaserCutMachine';
          break;
        // no default
      }
    }
  }

  protected render(): TemplateResult {
    const { machine } = this;

    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">${machines[machine].name}</h4>
      </div>
    `;
  }
}
