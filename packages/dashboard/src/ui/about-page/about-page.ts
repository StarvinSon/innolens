import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import logo from '../../images/logo-2-white.png';

import '../theme';
import '../typography';
import { css, classes } from './about-page.scss';


const TAG_NAME = 'inno-about-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: AboutPage;
  }
}

@customElement(TAG_NAME)
export class AboutPage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <img class="${classes.logo}" src="${logo}" width="364" height="434" />
      <p class="${classes.slogan}">A smart user management system for the Innovation Wing</p>
    `;
  }
}
