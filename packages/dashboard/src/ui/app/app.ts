import {
  customElement, LitElement, TemplateResult,
  query, html,
  property, PropertyValues
} from 'lit-element';

import { PathService } from '../../services/path';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import '../drawer';
import '../login-dialog';
import '../pages';
import '../top-bar';
import '../user-top-bar';
import { PropertyInjectorElement } from '../element-property-injector';

import { css, classes } from './app.scss';


const TAG_NAME = 'inno-app';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: App;
  }
}

@customElement(TAG_NAME)
export class App extends PropertyInjectorElement(LitElement) {
  public static readonly styles = css;

  @injectableProperty(PathService)
  @observeProperty('_updatePathListener')
  public pathService: PathService | null;

  @property({ attribute: false })
  private _path: string = '';

  @query('inno-pages')
  private readonly _pagesElem!: import('../pages').Pages;

  @query('inno-top-bar')
  private readonly _topBarElem!: import('../top-bar').TopBar;

  @query('inno-user-top-bar')
  private readonly _userTopBarElem!: import('../user-top-bar').TopBar;

  @query('inno-drawer')
  private readonly _drawerElement!: import('../drawer').Drawer;

  @query('inno-login-dialog')
  private readonly _loginDialogElement!: import('../login-dialog').LoginDialog;


  protected async _getUpdateComplete(): Promise<void> {
    await super._getUpdateComplete();
    await Promise.all([
      this._pagesElem.updateComplete,
      ...(this._path === '/'
        ? [this._userTopBarElem.updateComplete]
        : [this._topBarElem.updateComplete]),
      this._drawerElement.updateComplete,
      this._loginDialogElement.updateComplete
    ]);
  }

  protected updated(changedProps: PropertyValues): void {
    document.documentElement.setAttribute('theme', this._path === '/' ? 'white' : 'black');
    super.updated(changedProps);
  }

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

  protected render(): TemplateResult {
    return this.inject(html`
      <inno-pages class="${classes.pages}"></inno-pages>
      ${(this._path === '/') ? html`
        <inno-user-top-bar
          @drawer-toggled="${this._onTopBarDrawerToggled}"></inno-user-top-bar>
      ` : html`
        <inno-top-bar
          @drawer-toggled="${this._onTopBarDrawerToggled}"></inno-top-bar>
      `}
      <inno-drawer></inno-drawer>
      <inno-login-dialog></inno-login-dialog>
    `);
  }

  private _onTopBarDrawerToggled(): void {
    this._drawerElement.toggle();
  }
}
