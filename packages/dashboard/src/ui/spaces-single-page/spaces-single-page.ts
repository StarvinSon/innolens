import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';

import { PathService } from '../../services/path';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import '../button';

import { css, classes } from './spaces-single-page.scss';


const TAG_NAME = 'inno-spaces-single-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: SpacesSinglePage;
  }
}

export type spacesSubpage = 'machineRoom' | 'laserCuttingRoom';

export const spaces: { [K in spacesSubpage]: { title: string } } = {
  machineRoom: { title: 'Machine room' },
  laserCuttingRoom: { title: 'Laser cutting room' }
};

@customElement(TAG_NAME)
export class SpacesSinglePage extends LitElement {
  public static readonly styles = css;

  @injectableProperty(PathService)
  @observeProperty('_updatePathListener')
  public pathService: PathService | null;

  @property({ attribute: false })
  public space: spacesSubpage = 'machineRoom';

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
        case '/spaces/machine-room':
          this.space = 'machineRoom';
          break;
        case '/spaces/laser-cutting-room':
          this.space = 'laserCuttingRoom';
          break;
        // no default
      }
    }
  }

  protected render(): TemplateResult {
    const { space } = this;

    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">${spaces[space].title}</h4>
      </div>
    `;
  }
}
