import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import '../button';

import { css, classes } from './single-space-page.scss';


const TAG_NAME = 'inno-single-space-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: SingleSpacePage;
  }
}

type spacesSubpage = 'all' | 'machineRoom' | 'laserCuttingRoom';

const spaces: { [K in spacesSubpage]: { name: string } } = {
  all: { name: 'All machines' },
  machineRoom: { name: 'Machine room' },
  laserCuttingRoom: { name: 'Laser cutting room' }
};

@customElement(TAG_NAME)
export class SingleSpacePage extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  public space: spacesSubpage = 'all';

  protected render(): TemplateResult {
    const { space } = this;

    return html`
      <p class="${classes.text}">${spaces[space].name}</p>
    `;
  }
}
