import {
  customElement, LitElement, TemplateResult,
  html, property, PropertyValues, query
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../theme';
import '../typography';
import '../ripple'; // eslint-disable-line import/no-duplicates
import { expandMoreIcon } from '../icons/expand-more';
import { RippleController } from '../ripple'; // eslint-disable-line import/no-duplicates

import { css, classes } from './item-group.scss';


const TAG_NAME = 'inno-drawer-item-group';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: DrawerItemGroup;
  }
}

@customElement(TAG_NAME)
export class DrawerItemGroup extends LitElement {
  public static readonly styles = css;


  @property({ type: Number })
  public indentation = 0;

  @property({ attribute: false })
  private _expand = false;


  @query(`.${classes.expandIcon}`)
  private readonly _expandIconElem!: HTMLElement;

  @query(`.${classes.items}`)
  private readonly _itemsElem!: HTMLElement;


  private _animationState: {
    readonly type: 'collapsed' | 'expanded';
  } | {
    readonly type: 'collapsing' | 'expanding';
    readonly animations: ReadonlyArray<Animation>;
    readonly finished: boolean;
  } = {
    type: 'collapsed'
  };

  private _animationStateUpdated = false;


  private readonly _rippleController = new RippleController();


  public constructor() {
    super();
    this._onAnimationFinish = this._onAnimationFinish.bind(this);
  }


  protected createRenderRoot(): ShadowRoot {
    return this.attachShadow({
      mode: 'open',
      delegatesFocus: true
    });
  }

  protected update(changedProps: PropertyValues): void {
    this._updateAnimationState();
    super.update(changedProps);
  }

  private _updateAnimationState(): void {
    let nextAnimationStateType: DrawerItemGroup['_animationState']['type'] | 'same' = 'same';
    if (this._expand) {
      switch (this._animationState.type) {
        case 'collapsed':
        case 'collapsing': {
          nextAnimationStateType = 'expanding';
          break;
        }
        case 'expanding': {
          if (this._animationState.finished) {
            nextAnimationStateType = 'expanded';
          }
          break;
        }
        // no default
      }
    } else {
      switch (this._animationState.type) {
        case 'expanding':
        case 'expanded': {
          nextAnimationStateType = 'collapsing';
          break;
        }
        case 'collapsing': {
          if (this._animationState.finished) {
            nextAnimationStateType = 'collapsed';
          }
          break;
        }
        // no default
      }
    }

    if (nextAnimationStateType !== 'same') {
      switch (this._animationState.type) {
        case 'collapsing':
        case 'expanding': {
          for (const animation of this._animationState.animations) {
            animation.removeEventListener('finish', this._onAnimationFinish);
            animation.cancel();
          }
          break;
        }
        // no default
      }

      switch (nextAnimationStateType) {
        case 'collapsed':
        case 'expanded': {
          this._animationState = {
            type: nextAnimationStateType
          };
          break;
        }
        case 'collapsing':
        case 'expanding': {
          this._animationState = {
            type: nextAnimationStateType,
            animations: [],
            finished: true
          };
          break;
        }
        // no default
      }

      this._animationStateUpdated = true;
    }
  }

  protected render(): TemplateResult {
    const {
      indentation,
      _rippleController: rippleCtr
    } = this;
    const hide = this._animationState.type === 'collapsed';
    const freeze = this._animationState.type !== 'expanded';

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <button
        class="${classes.button}"
        data-ripple-host="${rippleCtr.bindHost()}"
        @click="${this._onButtonClick}">
        <inno-ripple
          class="${classes.button_ripple}"
          data-ripple="${rippleCtr.bindRipple()}"></inno-ripple>
        <div
          class="${classes.button_content} ${classes[`button_content_$indent${indentation}`]}">
          <slot></slot>
          ${expandMoreIcon({
            [classes.expandIcon]: true,
            [classes.expandIcon_$hide]: hide
          })}
        </div>
      </button>
      <div
        class="${classMap({
          [classes.items]: true,
          [classes.items_$hide]: hide,
          [classes.items_$freeze]: freeze
        })}">
          <slot name="items"></slot>
      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    this._updateStateAnimations();
  }

  private _updateStateAnimations(): void {
    if (this._animationStateUpdated) {
      switch (this._animationState.type) {
        case 'expanding':
        case 'collapsing': {
          const animations = this._createAnimations(this._animationState.type);
          if (animations.length > 0) {
            for (const animation of animations) {
              animation.addEventListener('finish', this._onAnimationFinish);
              animation.play();
            }
            this._animationState = {
              ...this._animationState,
              animations,
              finished: animations.every((a) => a.playState === 'finished')
            };
          }
          if (this._animationState.finished) {
            this.requestUpdate();
          }
          break;
        }
        // no default
      }
      this._animationStateUpdated = false;
    }
  }

  private _onAnimationFinish(): void {
    switch (this._animationState.type) {
      case 'expanding':
      case 'collapsing': {
        if (
          !this._animationState.finished
          && this._animationState.animations.every((a) => a.playState === 'finished')
        ) {
          this._animationState = {
            ...this._animationState,
            finished: true
          };
          this.requestUpdate();
        }
        break;
      }
      // no default
    }
  }

  private _createAnimations(type: 'collapsing' | 'expanding'): ReadonlyArray<Animation> {
    const itemsElem = this._itemsElem;
    const expandIconElem = this._expandIconElem;

    if (type === 'collapsing') {
      return [
        new Animation(
          new KeyframeEffect(
            itemsElem,
            [
              { height: `${itemsElem.getBoundingClientRect().height}px` },
              { height: '0px' }
            ],
            {
              duration: 200,
              easing: 'ease-out',
              fill: 'forwards'
            }
          ),
          document.timeline
        ),
        new Animation(
          new KeyframeEffect(
            expandIconElem,
            [
              { transform: 'none' },
              { transform: 'rotate(-90deg)' }
            ],
            {
              duration: 200,
              easing: 'ease-out',
              fill: 'forwards'
            }
          ),
          document.timeline
        )
      ];
    }

    return [
      new Animation(
        new KeyframeEffect(
          itemsElem,
          [
            { height: '0px' },
            { height: `${itemsElem.getBoundingClientRect().height}px` }
          ],
          {
            duration: 200,
            easing: 'ease-out',
            fill: 'forwards'
          }
        ),
        document.timeline
      ),
      new Animation(
        new KeyframeEffect(
          expandIconElem,
          [
            { transform: 'rotate(-90deg)' },
            { transform: 'none' }
          ],
          {
            duration: 200,
            easing: 'ease-out',
            fill: 'forwards'
          }
        ),
        document.timeline
      )
    ];
  }

  private _onButtonClick(): void {
    switch (this._animationState.type) {
      case 'collapsed':
      case 'expanded': {
        this._expand = !this._expand;
        break;
      }
      // no default
    }
  }
}
