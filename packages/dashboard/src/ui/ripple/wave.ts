import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../theme';

import { css, classes } from './wave.scss';


export interface RippleWaveSpreadOptions {
  readonly top: number;
  readonly left: number;
  readonly radius: number;
  readonly duration: number;
}

export interface RippleWaveFadeOptions {
  readonly spreadSpeedup: number;
  readonly fadeDuration: number;
}


const TAG_NAME = 'inno-ripple-wave';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: RippleWave;
  }
}

@customElement(TAG_NAME)
export class RippleWave extends LitElement {
  public static readonly styles = css;

  private _animationState: {
    type: 'none';
  } | {
    type: 'spreading';
    animation: Animation;
  } | {
    type: 'spreadingAndFading';
    spreadAnimation: Animation;
    fadeAnimation: Animation;
  } | {
    type: 'finished';
    spreadAnimation: Animation;
    fadeAnimation: Animation;
  } = {
    type: 'none'
  };

  public constructor() {
    super();
    this._onAnimationFinish = this._onAnimationFinish.bind(this);
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.background}"></div>
    `;
  }

  public get animationState(): RippleWave['_animationState']['type'] {
    return this._animationState.type;
  }

  public spread(options: RippleWaveSpreadOptions): void {
    if (this._animationState.type !== 'none') {
      return;
    }

    const animation = new Animation(
      new KeyframeEffect(
        this,
        [{
          top: `${options.top}px`,
          left: `${options.left}px`,
          width: `${2 * options.radius}px`,
          height: `${2 * options.radius}px`,
          transform: 'translate(-50%, -50%) scale(0)'
        }, {
          top: `${options.top}px`,
          left: `${options.left}px`,
          width: `${2 * options.radius}px`,
          height: `${2 * options.radius}px`,
          transform: 'translate(-50%, -50%) scale(1)'
        }],
        {
          duration: options.duration,
          fill: 'forwards'
        }
      ),
      document.timeline
    );
    animation.play();
    this.setAttribute('show', '');
    this._animationState = {
      type: 'spreading',
      animation
    };
  }

  public fade(options: RippleWaveFadeOptions): void {
    if (this._animationState.type !== 'spreading') {
      return;
    }

    this._animationState.animation
      .updatePlaybackRate(this._animationState.animation.playbackRate * options.spreadSpeedup);

    const fadeAnimation = new Animation(
      new KeyframeEffect(
        this,
        [{
          opacity: 1
        }, {
          opacity: 0
        }],
        {
          duration: options.fadeDuration,
          fill: 'forwards'
        }
      ),
      document.timeline
    );
    fadeAnimation.addEventListener('finish', this._onAnimationFinish);
    fadeAnimation.play();

    this._animationState = {
      type: 'spreadingAndFading',
      spreadAnimation: this._animationState.animation,
      fadeAnimation
    };
  }

  private _onAnimationFinish(): void {
    const animationState = this._animationState;
    if (animationState.type === 'spreadingAndFading' && animationState.fadeAnimation.playState === 'finished') {
      animationState.fadeAnimation.removeEventListener('finish', this._onAnimationFinish);
      this._animationState = {
        type: 'finished',
        spreadAnimation: animationState.spreadAnimation,
        fadeAnimation: animationState.fadeAnimation
      };
      this.dispatchEvent(new Event('animation-finished'));
    }
  }

  public release(): void {
    const animationState = this._animationState;
    if (animationState.type === 'none') {
      return;
    }

    switch (animationState.type) {
      case 'spreading': {
        animationState.animation.cancel();
        break;
      }
      case 'spreadingAndFading':
      case 'finished': {
        animationState.spreadAnimation.cancel();
        animationState.fadeAnimation.cancel();
        break;
      }
      // no default
    }

    this.removeAttribute('show');

    this._animationState = { type: 'none' };
  }
}
