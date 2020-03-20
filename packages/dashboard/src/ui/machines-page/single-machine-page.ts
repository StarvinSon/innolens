import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import '../button';

import { css, classes } from './single-machine-page.scss';


const TAG_NAME = 'inno-single-machine-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: SingleMachinePage;
  }
}

type machinesSubpage =
  | 'all'
  | 'waterjetCuttingMachine'
  | 'cncMillingMachine'
  | 'acrylicLaserCutMachine'
  | 'metalLaserCutMachine';

const machines: { [K in machinesSubpage]: { name: string } } = {
  all: { name: 'All machines' },
  waterjetCuttingMachine: { name: 'Waterjet cutting machine' },
  cncMillingMachine: { name: 'CNC milling machine' },
  acrylicLaserCutMachine: { name: 'Acrylic laser cut machine' },
  metalLaserCutMachine: { name: 'Metal laser cut machine' }
};

@customElement(TAG_NAME)
export class SingleMachinePage extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  public machine: machinesSubpage = 'all';

  protected render(): TemplateResult {
    const { machine } = this;

    return html`
      <p class="${classes.text}">${machines[machine].name}</p>
    `;
  }
}
