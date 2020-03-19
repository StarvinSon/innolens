import { TemplateResult, NodePart, nothing } from 'lit-html';

import { PromiseSource } from '../../utils/promise-source';


export type FragmentState = 'hidden'| 'showing' | 'visible' | 'visibleFreeze' | 'hiding';

export type FragmentAnimationType = 'showing' | 'hiding';

export abstract class Fragment extends EventTarget {
  private _containerPart: NodePart | null = null;
  private _nextState: FragmentState | 'same' = 'same';

  private _updateState: {
    readonly type: 'waiting';
    readonly promiseSource: PromiseSource<boolean> | null;
  } | {
    readonly type: 'updating';
    readonly currentPromiseSource: PromiseSource<boolean> | null;
    readonly nextPromiseSource: PromiseSource<boolean> | null;
  } = {
    type: 'waiting',
    promiseSource: null
  };

  private _state: {
    readonly type: 'hidden' | 'visible' | 'visibleFreeze' | 'disposed';
  } | {
    readonly type: 'showing' | 'hiding';
    readonly animations: ReadonlyArray<Animation>;
    readonly finished: boolean;
  } = {
    type: 'hidden'
  };

  private _part: NodePart | null = null;
  private _visible = false;
  private _interactable = false;


  public constructor() {
    super();
    this._onAnimationFinish = this._onAnimationFinish.bind(this);
  }

  public get state(): FragmentState | 'disposed' {
    return this._state.type;
  }

  public get animationFinished(): boolean {
    return (this._state.type !== 'showing' && this._state.type !== 'hiding') || this._state.finished;
  }

  protected get visible(): boolean {
    return this._visible;
  }

  protected get interactable(): boolean {
    return this._interactable;
  }


  public dispose(): void {
    if (this._state.type === 'disposed') return;

    switch (this._state.type) {
      case 'showing':
      case 'hiding': {
        for (const animation of this._state.animations) {
          animation.removeEventListener('finish', this._onAnimationFinish);
          animation.cancel();
        }
        break;
      }
      // no default
    }
    this._state = {
      type: 'disposed'
    };
  }


  public updateByFragmentManager(
    containerPart: NodePart | null,
    nextState: FragmentState | 'same'
  ): void {
    if (this._containerPart !== containerPart) {
      switch (this._state.type) {
        case 'showing':
        case 'hiding': {
          for (const animation of this._state.animations) {
            animation.removeEventListener('finish', this._onAnimationFinish);
            animation.cancel();
          }
        } // falls through
        case 'visible':
        case 'visibleFreeze': {
          this._state = {
            type: 'hidden'
          };
          break;
        }
        // no default
      }
    }

    this._containerPart = containerPart;
    this._nextState = nextState;
    this._update();
  }

  public async requestUpdate(): Promise<boolean> {
    if (this._updateState.type === 'waiting' && this._updateState.promiseSource !== null) {
      return this._updateState.promiseSource.promise;
    }
    if (this._updateState.type === 'updating' && this._updateState.nextPromiseSource !== null) {
      return this._updateState.nextPromiseSource.promise;
    }

    const newPromiseSource = new PromiseSource<boolean>();
    if (this._updateState.type === 'waiting') {
      this._updateState = {
        type: 'waiting',
        promiseSource: newPromiseSource
      };
    } else {
      this._updateState = {
        type: 'updating',
        currentPromiseSource: this._updateState.currentPromiseSource,
        nextPromiseSource: newPromiseSource
      };
    }

    Promise.resolve().then(() => {
      if (this._updateState.type === 'waiting' && this._updateState.promiseSource === newPromiseSource) {
        this._update();
      }
    });

    if (this._updateState.type === 'waiting') {
      return this._updateState.promiseSource!.promise;
    }
    return this._updateState.nextPromiseSource!.promise;
  }

  public get updatePromise(): Promise<boolean> {
    if (this._updateState.type === 'waiting') {
      return this._updateState.promiseSource?.promise ?? Promise.resolve(false);
    }

    if (this._updateState.currentPromiseSource === null) {
      this._updateState = {
        type: 'updating',
        currentPromiseSource: new PromiseSource(),
        nextPromiseSource: this._updateState.nextPromiseSource
      };
    }
    return this._updateState.currentPromiseSource!.promise;
  }

  private _update(): void {
    if (this._updateState.type === 'updating') {
      throw new Error('Concurrent update');
    }
    this._updateState = {
      type: 'updating',
      currentPromiseSource: this._updateState.promiseSource,
      nextPromiseSource: null
    };

    try {
      if (this._containerPart === null) {
        this._part = null;
      } else if (
        this._part === null
        || this._part.startNode.previousSibling !== this._containerPart.startNode
      ) {
        this._part = new NodePart(this._containerPart.options);
        this._part.appendIntoPart(this._containerPart);
      }

      let stateUpdated = false;

      if (this._nextState !== 'same') {
        switch (this._state.type) {
          case 'hiding':
          case 'showing': {
            for (const animation of this._state.animations) {
              animation.removeEventListener('finish', this._onAnimationFinish);
              animation.cancel();
            }
            break;
          }
          // no default
        }

        switch (this._nextState) {
          case 'hidden':
          case 'visible':
          case 'visibleFreeze': {
            this._state = {
              type: this._nextState
            };
            break;
          }
          case 'showing':
          case 'hiding': {
            this._state = {
              type: this._nextState,
              animations: [],
              finished: true
            };
            break;
          }
          default: {
            throw new Error(`Unexpected animation state: ${this._state!.type}`);
          }
        }

        this._nextState = 'same';
        stateUpdated = true;
      }

      this._visible = this._state.type !== 'hidden';
      this._interactable = this._state.type === 'visible';
      if (this._part !== null) {
        this._part.setValue(this.render() ?? nothing);
        this._part.commit();
      }

      if (
        (this._state.type === 'showing' || this._state.type === 'hiding')
        && stateUpdated
      ) {
        let animations: ReadonlyArray<Animation>;
        if (
          this._part !== null
          && (animations = this.makeAnimations(this._state.type)).length > 0
        ) {
          for (const animation of animations) {
            animation.addEventListener('finish', this._onAnimationFinish);
            animation.play();
          }
          this._state = {
            type: this._state.type,
            animations,
            finished: animations.every((a) => a.playState === 'finished')
          };
        }

        if (this._state.finished) {
          this._dispatchAnimationFinished();
        }
      }

      this._updateState.currentPromiseSource?.resolve(this._updateState.nextPromiseSource !== null);
    } catch (err) {
      this._updateState.currentPromiseSource?.reject(err);
    } finally {
      this._updateState = {
        type: 'waiting',
        promiseSource: this._updateState.nextPromiseSource
      };
    }
  }

  private _onAnimationFinish(): void {
    switch (this._state.type) {
      case 'showing':
      case 'hiding': {
        if (this._state.animations.every((a) => a.playState === 'finished')) {
          this._state = {
            type: this._state.type,
            animations: this._state.animations,
            finished: true
          };
          this.requestUpdate();
          this._dispatchAnimationFinished();
        }
        break;
      }
      // no default
    }
  }

  private _dispatchAnimationFinished(): void {
    Promise.resolve().then(() => {
      this.dispatchEvent(new Event('animation-finished'));
    });
  }

  protected render(): TemplateResult | void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected makeAnimations(type: FragmentAnimationType): ReadonlyArray<Animation> {
    return [];
  }

  protected getRootElement(): Element | null {
    if (this._part !== null) {
      for (
        let node: Node | null = this._part.startNode;
        node !== null;
        node = node.nextSibling
      ) {
        if (node instanceof Element) return node;
      }
    }
    return null;
  }
}
