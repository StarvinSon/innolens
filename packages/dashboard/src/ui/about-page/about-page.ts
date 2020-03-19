import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

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
      <h1 class="${classes.title}">InnoLens</h1>
      <p class="${classes.slogan}">A smart user management system for the Innovation Wing</p>
    `;
  }
}
