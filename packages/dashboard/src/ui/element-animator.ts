import { DirectiveFn, directive, AttributePart } from 'lit-html';

import { wrapMethod } from '../utils/method-wrapper';


const directiveMethod = (): MethodDecorator => wrapMethod((method) => {
  const invoke = directive((target: object, args: ReadonlyArray<unknown>) =>
    Reflect.apply(method, target, args));

  const wrapped = function(this: object, ...args: ReadonlyArray<unknown>): unknown {
    return invoke(this, args);
  };
  return wrapped;
});


export interface AnimationFactory<K extends string> {
  (elem: Element, key: K | undefined): Animation;
}

export type AnimationDirection = 'forwards' | 'backwards';

export class ElementAnimator<K extends string = string> extends EventTarget {
  public readonly forwardAnimationFactory: AnimationFactory<K>;
  public readonly backwardAnimationFactory: AnimationFactory<K>;

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


  public constructor(
    forwardAnimationFactory: AnimationFactory<K>,
    backwardAnimationFactory: AnimationFactory<K>
  ) {
    super();
    this.forwardAnimationFactory = forwardAnimationFactory;
    this.backwardAnimationFactory = backwardAnimationFactory;
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
            const animation = this.forwardAnimationFactory(element, key);
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
            const animation = this.backwardAnimationFactory(element, key);
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
    this.dispatchEvent(new Event('request-update'));
  }
}
