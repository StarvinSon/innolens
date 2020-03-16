import {
  customElement, LitElement, TemplateResult,
  html, property, PropertyValues
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../theme';
import { css, classes } from './ripple.scss';
import './wave'; // eslint-disable-line import/no-duplicates
import { RippleWave } from './wave'; // eslint-disable-line import/no-duplicates


const TAG_NAME = 'inno-ripple';

declare global {
  interface HTMLElement {
    [TAG_NAME]: Ripple;
  }
}

@customElement(TAG_NAME)
export class Ripple extends LitElement {
  public static readonly styles = css;

  @property({ attribute: false })
  public highlight = false;

  private readonly _waves: Array<RippleWave> = [];
  private readonly _waveTasks: Map<RippleWave, () => void> = new Map();

  public constructor() {
    super();
    this._onWaveAnimationFinished = this._onWaveAnimationFinished.bind(this);
  }

  protected render(): TemplateResult {
    const { highlight, _waves: waves } = this;

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div
        class="${classMap({
          [classes.background]: true,
          [classes.background_$show]: highlight
        })}"></div>
      ${waves}
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  protected updated(updatedProps: PropertyValues): void {
    super.updated(updatedProps);

    for (const task of this._waveTasks.values()) {
      task();
    }
    this._waveTasks.clear();
  }

  public newWave(spreadOpts: {
    readonly left: number;
    readonly top: number;
    readonly radius: number;
  }): void {
    this.fadeAllWaves();

    const reusableWaveIdx = this._waves.findIndex((wave) => wave.animationState === 'none');
    let wave: RippleWave;
    if (reusableWaveIdx >= 0) {
      wave = this._waves[reusableWaveIdx];
      this._waves.splice(reusableWaveIdx, 1);
    } else {
      wave = document.createElement('inno-ripple-wave');
    }
    wave.addEventListener('animation-finished', this._onWaveAnimationFinished);

    this._waves.push(wave);
    this._waveTasks.set(wave, () => wave.spread({
      duration: 1500,
      left: spreadOpts.left,
      top: spreadOpts.top,
      radius: spreadOpts.radius
    }));
    this.requestUpdate();
  }

  public fadeAllWaves(): void {
    for (const wave of this._waves) {
      if (wave.animationState === 'spreading') {
        this._waveTasks.set(wave, () => wave.fade({
          fadeDuration: 300,
          spreadSpeedup: 3
        }));
        this.requestUpdate();
      }
    }
  }

  private _releaseFinishedWaves(): void {
    let cachedCount = 0;
    for (let i = this._waves.length - 1; i >= 0; i -= 1) {
      const wave = this._waves[i];
      if (wave.animationState === 'none' || wave.animationState === 'finished') {
        if (wave.animationState === 'finished') {
          wave.removeEventListener('animation-finished', this._onWaveAnimationFinished);
          this._waveTasks.set(wave, () => wave.release());
          this.requestUpdate();
        }
        if (cachedCount >= 3) {
          this._waves.splice(i, 1);
          this.requestUpdate();
        } else {
          cachedCount += 1;
        }
      }
    }
  }

  private _onWaveAnimationFinished(): void {
    this._releaseFinishedWaves();
  }
}
