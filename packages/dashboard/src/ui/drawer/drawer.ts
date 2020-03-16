import {
  LitElement, TemplateResult, html,
  customElement,
  PropertyValues,
  property
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../elevation';
import { PathService } from '../../services/path';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { ElementAnimator } from '../element-animator';

import './item';
import { css, classes } from './drawer.scss';


const links: ReadonlyArray<{
  readonly href: string;
  readonly name: string;
}> = [
  {
    href: '/',
    name: 'Home'
  },
  {
    href: '/about',
    name: 'About'
  }
];


const TAG_NAME = 'inno-drawer';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Drawer;
  }
}

/**
 * @event request-close
 */
@customElement(TAG_NAME)
export class Drawer extends LitElement {
  public static readonly styles = css;


  @injectableProperty(PathService)
  @observeProperty('_updatePathListener')
  public pathService: PathService | null = null;


  @property({ type: Boolean })
  public get show(): boolean {
    return this._animator.direction === 'forwards';
  }

  public set show(val: boolean) {
    this._animator.direction = val ? 'forwards' : 'backwards';
  }


  @property({ attribute: false })
  private _path: string = '';


  private readonly _animator = new ElementAnimator<'background' | 'drawer'>(
    (direction, key, elem) => {
      switch (direction) {
        case 'forwards': {
          switch (key) {
            case 'background': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  opacity: 0
                }, {
                  opacity: 1
                }],
                {
                  duration: 100,
                  fill: 'forwards'
                }
              ),
              document.timeline
            );
            case 'drawer': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  transform: 'translateX(-100%)'
                }, {
                  transform: 'translateX(0%)'
                }],
                {
                  duration: 200,
                  fill: 'forwards',
                  easing: 'ease-out'
                }
              ),
              document.timeline
            );
            default: {
              throw new Error(`Unexpected key: ${key}`);
            }
          }
        }
        case 'backwards': {
          switch (key) {
            case 'background': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  opacity: 1
                }, {
                  opacity: 0
                }],
                {
                  duration: 100,
                  fill: 'forwards'
                }
              ),
              document.timeline
            );
            case 'drawer': return new Animation(
              new KeyframeEffect(
                elem,
                [{
                  transform: 'translateX(0%)'
                }, {
                  transform: 'translateX(-100%)'
                }],
                {
                  duration: 200,
                  fill: 'forwards',
                  easing: 'ease-out'
                }
              ),
              document.timeline
            );
            default: {
              throw new Error(`Unexpected key: ${key}`);
            }
          }
        }
        default: {
          throw new Error(`Unexpected direction: ${direction}`);
        }
      }
    }
  );


  public constructor() {
    super();
    this._animator.addEventListener('request-update', () => this.requestUpdate());
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
      if (!Object.prototype.hasOwnProperty.call(this, '_bindPath')) {
        this._bindPath = this._bindPath.bind(this);
      }
      this.pathService.addEventListener('path-changed', this._bindPath);
      this._bindPath();
    } else if (Object.prototype.hasOwnProperty.call(this, '_bindPath')) {
      this.pathService.removeEventListener('path-changed', this._bindPath);
    }
  }

  private _bindPath(): void {
    if (this.pathService !== null) {
      this._path = this.pathService.path;
    }
  }


  protected render(): TemplateResult {
    const {
      _path: path,
      _animator: animator
    } = this;

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div
        class="${classes.background}"
        data-animator-control="${animator.control('background')}"
        @click="${this._onBackgroundClick}"></div>
      <div
        class="${classMap({
          [classes.drawer]: true,
          [classes.drawer_$freeze]: !animator.interactable
        })}"
        data-animator-control="${animator.control('drawer')}">
        <div class="${classes.drawer_links}">
          ${links.map(({ href, name }) => html`
            <inno-drawer-item
              .href="${href}"
              .highlight="${href === path}">
              ${name}
            </inno-drawer-item>
          `)}
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (this._animator.visible) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }
  }

  private _onBackgroundClick(): void {
    if (this._animator.interactable) {
      this.dispatchEvent(new Event('request-close'));
    }
  }
}
