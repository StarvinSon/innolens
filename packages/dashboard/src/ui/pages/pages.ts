import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../theme';
import { PathService } from '../../services/path';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { PropertyInjectorElement } from '../element-property-injector';
import { FragmentManager, Fragment } from '../fragment';
import { pageEntries, PageEntry, PageGroupEntry } from '../page-entries';

import { PageFragment } from './page-fragment';
import { css } from './pages.scss';


const TAG_NAME = 'inno-pages';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Pages;
  }
}

@customElement(TAG_NAME)
export class Pages extends PropertyInjectorElement(LitElement) {
  public static readonly styles = css;


  @injectableProperty(PathService)
  @observeProperty('_updatePathListener')
  private _pathService: PathService | null;

  private _path = '';


  private readonly _fragmentManager = new FragmentManager(this);


  private readonly _pageStates: Map<RegExp, {
    readonly type: 'loading';
    readonly promise: Promise<void>;
  } | {
    readonly type: 'loaded';
  } | {
    readonly type: 'error';
    readonly error: unknown;
  } | {
    readonly type: 'connected';
    readonly fragment: PageFragment;
  }> = new Map();


  public constructor() {
    super();
    this._bindPath = this._bindPath.bind(this);
    this._pathService = null;
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
    if (this._pathService === undefined) return;

    if (this.isConnected) {
      if (this._pathService !== null) {
        this._pathService.addEventListener('path-updated', this._bindPath);
      }
      this._bindPath();
    } else if (this._pathService !== null) {
      this._pathService.removeEventListener('path-updated', this._bindPath);
    }
  }

  private _bindPath(): void {
    if (this._pathService !== null) {
      this._path = this._pathService.path;
      this._updatePageFragment();
    }
  }

  private _updatePageFragment(): void {
    const matchedEntry = this._findMatchedPagEntry();

    if (matchedEntry === null) {
      // TODO: show 404
      this._showPage(null);
      return;
    }

    const state = this._pageStates.get(matchedEntry.pathRegExp);
    if (state === undefined) {
      const promise = Promise.resolve().then(async () => {
        try {
          await matchedEntry.load();
          if (matchedEntry.tagName.includes('-')) {
            await customElements.whenDefined(matchedEntry.tagName);
          }
          this._pageStates.set(matchedEntry.pathRegExp, {
            type: 'loaded'
          });
        } catch (err) {
          this._pageStates.set(matchedEntry.pathRegExp, {
            type: 'error',
            error: err
          });
        } finally {
          this._updatePageFragment();
        }
      });
      this._pageStates.set(matchedEntry.pathRegExp, {
        type: 'loading',
        promise
      });

      // TODO: show loading
      this._showPage(null);
      return;
    }

    switch (state.type) {
      case 'loading': {
        // TODO: show loading
        this._showPage(null);
        break;
      }
      case 'error': {
        // TODO: show error
        this._showPage(null);
        return;
      }
      case 'loaded': {
        const fm = new PageFragment(matchedEntry.tagName, () => this.resolver);
        this._pageStates.set(matchedEntry.pathRegExp, {
          type: 'connected',
          fragment: fm
        });
        this._fragmentManager.addFragment(fm);
        this._showPage(fm);
        return;
      }
      case 'connected': {
        this._showPage(state.fragment);
        return;
      }
      default: {
        throw new Error(`Unexpected type: ${state!.type}`);
      }
    }
  }

  private _findMatchedPagEntry(): PageEntry | null {
    const entryStack: Array<PageEntry | PageGroupEntry> = pageEntries.slice();
    let entry: PageEntry | PageGroupEntry | undefined;
    while ((entry = entryStack.pop()) !== undefined) {
      if (entry.type === 'pageEntry' && entry.pathRegExp.test(this._path)) {
        return entry;
      }
      if (entry.type === 'pageGroupEntry') {
        entryStack.push(...entry.pages);
      }
    }
    return null;
  }

  private _showPage(fm: Fragment | null): void {
    if (fm !== null) {
      this._fragmentManager.showFragment(fm);
    }
    for (const state of this._pageStates.values()) {
      if (state.type === 'connected' && state.fragment !== fm) {
        this._fragmentManager.hideFragment(state.fragment);
      }
    }
  }


  protected render(): TemplateResult {
    const {
      _fragmentManager: fmMgr
    } = this;

    return html`${fmMgr.render()}`;
  }
}
