import {
  customElement, LitElement, TemplateResult,
  query, html
} from 'lit-element';

import '../drawer';
import '../login-dialog';
import '../pages';
import '../top-bar';
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


  @query('inno-pages')
  private readonly _pagesElem!: import('../pages').Pages;

  @query('inno-top-bar')
  private readonly _topBarElem!: import('../top-bar').TopBar;

  @query('inno-drawer')
  private readonly _drawerElement!: import('../drawer').Drawer;

  @query('inno-login-dialog')
  private readonly _loginDialogElement!: import('../login-dialog').LoginDialog;


  protected async _getUpdateComplete(): Promise<void> {
    await super._getUpdateComplete();
    await Promise.all([
      this._pagesElem.updateComplete,
      this._topBarElem.updateComplete,
      this._drawerElement.updateComplete,
      this._loginDialogElement.updateComplete
    ]);
  }


  protected render(): TemplateResult {
    return this.inject(html`
      <inno-pages class="${classes.pages}"></inno-pages>
      <inno-top-bar
        @drawer-toggled="${this._onTopBarDrawerToggled}"></inno-top-bar>
      <inno-drawer></inno-drawer>
      <inno-login-dialog></inno-login-dialog>
    `);
  }

  private _onTopBarDrawerToggled(): void {
    this._drawerElement.toggle();
  }
}
