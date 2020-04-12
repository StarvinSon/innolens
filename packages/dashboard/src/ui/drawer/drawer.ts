import {
  LitElement, TemplateResult, html,
  customElement,
  PropertyValues,
  property
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import { PathService } from '../../services/path';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { ifString } from '../directives/if-string';
import { ElementAnimator } from '../element-animator';
import { pageEntries, PageEntry, PageGroupEntry } from '../page-entries';

import './item';
import './item-group';
import { css, classes } from './drawer.scss';


const TAG_NAME = 'inno-drawer';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Drawer;
  }
}

@customElement(TAG_NAME)
export class Drawer extends LitElement {
  public static readonly styles = css;


  @injectableProperty(PathService)
  @observeProperty('_updatePathListener')
  public pathService: PathService | null;


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
    },
    this
  );


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
      this._path = this.pathService.path;
    }
  }


  public toggle(): void {
    this._animator.direction = this._animator.direction === 'forwards' ? 'backwards' : 'forwards';
  }

  public show(): void {
    this._animator.direction = 'forwards';
  }

  public hide(): void {
    this._animator.direction = 'backwards';
  }


  protected render(): TemplateResult {
    const {
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
        <div class="${classes.drawer_items}">
          ${this._renderPageOrPageGroupEntries(0, pageEntries)}
        </div>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderPageOrPageGroupEntries(
    indentation: number,
    entries: ReadonlyArray<PageEntry | PageGroupEntry>,
    slotName: string | null = null
  ): unknown {
    /* eslint-disable @typescript-eslint/indent */
    return entries.map((entry) => entry.type === 'pageEntry'
      ? html`
        <inno-drawer-item
          slot="${ifString(slotName)}"
          .identation="${indentation}"
          .href="${entry.href}"
          .highlight="${entry.pathRegExp === undefined
            ? entry.href === this._path
            : entry.pathRegExp.test(this._path)}">
          ${entry.name}
        </inno-drawer-item>
      `
      : html`
        <inno-drawer-item-group
          slot="${ifString(slotName)}"
          .indentation="${indentation}">
          ${entry.name}
          ${this._renderPageOrPageGroupEntries(indentation + 1, entry.pages, 'items')}
        </inno-drawer-item-group>
      `);
    /* eslint-enable @typescript-eslint/indent */
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (this._animator.visible) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }

    if (changedProps.has('_path')) {
      this.hide();
    }
  }

  private _onBackgroundClick(): void {
    if (this._animator.interactable) {
      this.hide();
    }
  }
}
