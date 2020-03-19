import { UpdatingElement } from 'lit-element';
import { DirectiveFn, AttributePart } from 'lit-html';

import { directiveMethod } from './directive-method';


export type AnimationDirection = 'forwards' | 'backwards';

export interface AnimationFactory<K extends string> {
  (direction: AnimationDirection, key: K, elem: Element): Animation;
}

export class ElementAnimator<K extends string = string> extends EventTarget {
  public readonly animationFactory: AnimationFactory<K>;
  public readonly host: UpdatingElement | null;

  private _direction: AnimationDirection = 'backwards';

  private _animationState: {
    type: 'start';
  } | {
    type: 'forwarding';
    animations: { readonly [P in K]?: Animation };
  } | {
    type: 'end'
  } | {
    type: 'backwarding';
    animations: { readonly [P in K]?: Animation };
  } = {
    type: 'start'
  };

  private readonly _animationsToCancel: Array<Animation> = [];


  public constructor(animationFactory: AnimationFactory<K>, host: UpdatingElement | null = null) {
    super();
    this.animationFactory = animationFactory;
    this.host = host;
    this._onAnimationFinished = this._onAnimationFinished.bind(this);
  }


  public get direction(): AnimationDirection {
    return this._direction;
  }

  public set direction(newVal: AnimationDirection) {
    const oldVal = this._direction;
    this._direction = newVal;
    if (oldVal !== newVal) {
      this._requestUpdate();
    }
  }


  public get visible(): boolean {
    return this._direction === 'forwards' || this._animationState.type !== 'start';
  }

  public get interactable(): boolean {
    return this._direction === 'forwards' && this._animationState.type === 'end';
  }

  @directiveMethod()
  public control(key: K = '' as K): DirectiveFn {
    return (part) => {
      if (!(part instanceof AttributePart)) {
        throw new Error('controller directive can only be used in attribute binding');
      }
      const { element } = part.committer;

      if (this._animationsToCancel !== null) {
        for (const animation of this._animationsToCancel) {
          animation.cancel();
        }
        this._animationsToCancel.length = 0;
      }

      const currAnimationState = this._animationState;
      let nextAnimationState = currAnimationState;
      switch (currAnimationState.type) {
        case 'start':
        case 'forwarding': {
          if (
            this._direction === 'forwards'
            && (
              currAnimationState.type === 'start'
              || currAnimationState.animations[key] === undefined
            )
          ) {
            const animation = this.animationFactory('forwards', key, element);
            nextAnimationState = {
              type: 'forwarding',
              animations: {
                ...currAnimationState.type === 'forwarding' ? currAnimationState.animations : undefined,
                [key]: animation
              }
            };
            animation.addEventListener('finish', this._onAnimationFinished);
            animation.play();
          }
          break;
        }
        case 'end':
        case 'backwarding': {
          if (
            this._direction === 'backwards'
            && (
              currAnimationState.type === 'end'
              || currAnimationState.animations[key] === undefined
            )
          ) {
            const animation = this.animationFactory('backwards', key, element);
            nextAnimationState = {
              type: 'backwarding',
              animations: {
                ...currAnimationState.type === 'backwarding' ? currAnimationState.animations : undefined,
                [key]: animation
              }
            };
            animation.addEventListener('finish', this._onAnimationFinished);
            animation.play();
          }
          break;
        }
        // no default
      }

      if (nextAnimationState !== currAnimationState) {
        this._animationState = nextAnimationState;
        this._requestUpdate();
      }
    };
  }

  private _onAnimationFinished(): void {
    const currAnimationState = this._animationState;
    let nextAnimationState = currAnimationState;
    switch (currAnimationState.type) {
      case 'forwarding':
      case 'backwarding': {
        const animations = Object
          .values<Animation>(currAnimationState.animations as Record<K, Animation>);
        if (animations.every((animation) => animation.playState === 'finished')) {
          for (const animation of animations) {
            animation.removeEventListener('finish', this._onAnimationFinished);
          }
          nextAnimationState = {
            type: currAnimationState.type === 'forwarding' ? 'end' : 'start'
          };
          this._animationsToCancel.push(...animations);
        }
        break;
      }
      // no default
    }
    if (currAnimationState !== nextAnimationState) {
      this._animationState = nextAnimationState;
      this._requestUpdate();
    }
  }

  private _requestUpdate(): void {
    this.host?.requestUpdate();
    this.dispatchEvent(new Event('request-update'));
  }
}
