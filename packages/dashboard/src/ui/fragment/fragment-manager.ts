import { UpdatingElement } from 'lit-element';
import {
  DirectiveFn, NodePart, directive,
  html
} from 'lit-html';
import { repeat } from 'lit-html/directives/repeat';

import { directiveMethod } from '../directive-method';

import { Fragment, FragmentState } from './fragment';


const nodeDirective = directive((handler: (part: NodePart) => void): DirectiveFn => (part) => {
  if (!(part instanceof NodePart)) {
    throw new Error('Expect node binding');
  }
  handler(part);
});


interface FragmentsConfig {
  readonly fragments: ReadonlyMap<Fragment, FragmentConfig>;
  readonly extra: unknown;
}

interface FragmentConfig {
  readonly placeId: string;
  readonly targetState: 'visible' | 'hidden';
}


interface PendingFragmentsConfig extends FragmentsConfig {
  fragments: Map<Fragment, PendingFragmentConfig>;
  extra: unknown;
}

interface PendingFragmentConfig extends FragmentConfig {
  placeId: string;
  targetState: 'visible' | 'hidden';
}


interface FragmentUpdateOptions {
  placeId: string;
  nextState: FragmentState | 'dispose' | 'same';
  newlyAdded: boolean;
}


interface TemplateProvider {
  (place: (placeId?: string) => DirectiveFn): void;
}

const defaultTemplateProvider: TemplateProvider = (place) => html`${place()}`;


export class FragmentManager extends EventTarget {
  public readonly host: UpdatingElement | null = null;

  private _fragmentsConfig: FragmentsConfig = {
    extra: undefined,
    fragments: new Map()
  };

  private _pendingFragmentsConfig: PendingFragmentsConfig | null = null;

  private readonly _fragmentsConfigStack: Array<FragmentsConfig> = [];

  private _state: {
    readonly type: 'idle';
  } | {
    readonly type: 'animating';
  } = {
    type: 'idle'
  };

  private readonly _mountedFragments: Map<Fragment, FragmentUpdateOptions> = new Map();


  public constructor(host: UpdatingElement | null = null) {
    super();
    this.host = host;
    this._onFragmentAnimationFinished = this._onFragmentAnimationFinished.bind(this);
  }


  public pushFragmentConfigToStack(): void {
    this._fragmentsConfigStack.push(this._fragmentsConfig);
  }

  public popFragmentConfigFromStack(): void {
    const fmsConfig = this._fragmentsConfigStack.pop();
    if (fmsConfig !== undefined) {
      this._pendingFragmentsConfig = {
        ...fmsConfig,
        fragments: new Map(fmsConfig.fragments)
      };
      this.requestUpdate();
    }
  }

  public addFragment(fm: Fragment, placeId: string = ''): void {
    if (
      this._fragmentsConfig.fragments.has(fm)
      || (
        this._pendingFragmentsConfig !== null
        && this._pendingFragmentsConfig.fragments.has(fm)
      )
    ) {
      throw new Error('Fragment already added');
    }

    if (this._pendingFragmentsConfig === null) {
      this._pendingFragmentsConfig = {
        ...this._fragmentsConfig,
        fragments: new Map(this._fragmentsConfig.fragments)
      };
    }
    this._pendingFragmentsConfig.fragments.set(fm, {
      placeId,
      targetState: 'hidden'
    });
    this.requestUpdate();
  }

  public showFragment(fm: Fragment): void {
    const config = this._pendingFragmentsConfig?.fragments.get(fm)
      ?? this._fragmentsConfig.fragments.get(fm);
    if (config === undefined || config.targetState === 'visible') return;

    if (this._pendingFragmentsConfig === null) {
      this._pendingFragmentsConfig = {
        ...this._fragmentsConfig,
        fragments: new Map(this._fragmentsConfig.fragments)
      };
    }
    this._pendingFragmentsConfig.fragments.set(fm, {
      ...config,
      targetState: 'visible'
    });
    this.requestUpdate();
  }

  public hideFragment(fm: Fragment): void {
    const config = this._pendingFragmentsConfig?.fragments.get(fm)
      ?? this._fragmentsConfig.fragments.get(fm);
    if (config === undefined || config.targetState === 'hidden') return;

    if (this._pendingFragmentsConfig === null) {
      this._pendingFragmentsConfig = {
        ...this._fragmentsConfig,
        fragments: new Map(this._fragmentsConfig.fragments)
      };
    }
    this._pendingFragmentsConfig.fragments.set(fm, {
      ...config,
      targetState: 'hidden'
    });
    this.requestUpdate();
  }

  public removeFragment(fm: Fragment): void {
    const config = this._pendingFragmentsConfig?.fragments.get(fm)
      ?? this._fragmentsConfig.fragments.get(fm);
    if (config === undefined) return;

    if (this._pendingFragmentsConfig === null) {
      this._pendingFragmentsConfig = {
        ...this._fragmentsConfig,
        fragments: new Map(this._fragmentsConfig.fragments)
      };
    }
    this._pendingFragmentsConfig.fragments.delete(fm);
    this.requestUpdate();
  }


  public requestUpdate(): void {
    Promise.resolve().then(() => {
      this.host?.requestUpdate();
      this.dispatchEvent(new Event('request-update'));
    });
  }


  @directiveMethod()
  public render(templateProvider?: TemplateProvider): DirectiveFn {
    return (containerPart) => {
      if (!(containerPart instanceof NodePart)) {
        throw new Error('Fragments.render can only be used in node binding');
      }

      const hasPartPlaceIds: Set<string> = new Set();
      const placeMarker = directive((placeId = ''): DirectiveFn => {
        if (hasPartPlaceIds.has(placeId)) {
          throw new Error('duplicated place id');
        }
        hasPartPlaceIds.add(placeId);

        return (placePart) => {
          if (!(placePart instanceof NodePart)) {
            throw new Error('place directive can only be used in node binding');
          }

          this._updatePlace(placeId, placePart);
        };
      });

      this._updateFragmentUpdateOptions();
      const template = (templateProvider ?? defaultTemplateProvider)(placeMarker);

      const partlessPlaceIds = new Set(Array
        .from(this._mountedFragments.values())
        .map((state) => state.placeId)
        .filter((id) => !hasPartPlaceIds.has(id)));
      for (const placeId of partlessPlaceIds) {
        this._updatePlace(placeId, null);
      }

      containerPart.setValue(template);
    };
  }

  private _updateFragmentUpdateOptions(): void {
    if (
      this._pendingFragmentsConfig !== null
      && this._pendingFragmentsConfig.extra === this._fragmentsConfig.extra
      && this._pendingFragmentsConfig.fragments.size === this._fragmentsConfig.fragments.size
      && Array.from(this._pendingFragmentsConfig.fragments).every(([fm, penfingConfig]) => {
        const config = this._fragmentsConfig.fragments.get(fm);
        return (
          config !== undefined
          && config.targetState === penfingConfig.targetState
        );
      })
    ) {
      this._pendingFragmentsConfig = null;
    }

    if (this._pendingFragmentsConfig === null) {
      switch (this._state.type) {
        case 'animating': {
          const finished = Array.from(this._mountedFragments)
            .every(([fm]) => fm.animationFinished);
          if (finished) {
            for (const [fm, state] of this._mountedFragments) {
              const config = this._fragmentsConfig.fragments.get(fm);
              if (config === undefined) {
                state.nextState = 'dispose';
              } else {
                state.nextState = config.targetState === 'visible' ? 'visible' : 'hidden';
              }
            }
            this._state = {
              type: 'idle'
            };
          }
          break;
        }
        // no default
      }
    } else {
      switch (this._state.type) {
        case 'animating': {
          for (const [fm, state] of this._mountedFragments) {
            const config = this._fragmentsConfig.fragments.get(fm);
            if (config === undefined) {
              state.nextState = 'dispose';
            } else {
              state.nextState = config.targetState === 'visible' ? 'visibleFreeze' : 'hidden';
            }
          }
        } // fall through
        case 'idle': {
          for (const [fm, state] of this._mountedFragments) {
            const config = this._fragmentsConfig.fragments.get(fm);
            const pendingConfig = this._pendingFragmentsConfig.fragments.get(fm);
            switch (pendingConfig?.targetState) {
              case undefined: {
                switch (config?.targetState) {
                  case undefined: state.nextState = 'dispose'; break;
                  case 'visible': state.nextState = 'hiding'; break;
                  case 'hidden': state.nextState = 'hidden'; break;
                  // no default
                }
                break;
              }
              case 'visible': {
                switch (config?.targetState) {
                  case undefined: throw new Error('Invalid config: trying to show a disposed fragment');
                  case 'visible': state.nextState = 'visibleFreeze'; break;
                  case 'hidden': state.nextState = 'showing'; break;
                  // no default
                }
                break;
              }
              case 'hidden': {
                switch (config?.targetState) {
                  case undefined: throw new Error('Invalid config: trying to hide a disposed fragment');
                  case 'visible': state.nextState = 'hiding'; break;
                  case 'hidden': state.nextState = 'hidden'; break;
                  // no default
                }
              }
              // no default
            }
          }
          for (const [fm, pendingConfig] of this._pendingFragmentsConfig.fragments) {
            if (!this._mountedFragments.has(fm)) {
              this._mountedFragments.set(fm, {
                placeId: pendingConfig.placeId,
                nextState: pendingConfig.targetState === 'visible' ? 'showing' : 'hidden',
                newlyAdded: true
              });
            }
          }
          this._state = {
            type: this._mountedFragments.size > 0 ? 'animating' : 'idle'
          };
          break;
        }
        // no default
      }
      this._fragmentsConfig = this._pendingFragmentsConfig;
      this._pendingFragmentsConfig = null;
    }
  }

  private _updatePlace(placeId: string, placePart: NodePart | null): void {
    const placeFms: Array<readonly [Fragment, FragmentState | 'same']> = [];

    for (const [fm, updateOpts] of this._mountedFragments) {
      if (updateOpts.placeId === placeId) {
        if (updateOpts.nextState === 'dispose') {
          this._mountedFragments.delete(fm);
          fm.removeEventListener('animation-finished', this._onFragmentAnimationFinished);
          fm.dispose();
        } else {
          if (updateOpts.newlyAdded) {
            fm.addEventListener('animation-finished', this._onFragmentAnimationFinished);
            updateOpts.newlyAdded = false;
          }
          placeFms.push([fm, updateOpts.nextState]);
          updateOpts.nextState = 'same';
        }
      }
    }

    if (placePart === null) {
      for (const [fm, state] of placeFms) {
        fm.updateByFragmentManager(null, state);
      }
    } else {
      placePart.setValue(repeat(
        placeFms,
        ([fm]) => fm,
        ([fm, fmState]) => nodeDirective((part) => fm.updateByFragmentManager(part, fmState))
      ));
    }
  }

  private _onFragmentAnimationFinished(): void {
    this.requestUpdate();
  }
}
