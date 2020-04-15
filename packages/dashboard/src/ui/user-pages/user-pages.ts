import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';
import '@lit-element-bootstrap/carousel';
import '../user-theme';

import { css, classes } from './user-pages.scss';


const TAG_NAME = 'inno-user-pages';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserPages;
  }
}

@customElement(TAG_NAME)
export class UserPages extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <bs-carousel interval="10000">
        <bs-carousel-indicators slot="indicators">
          <bs-carousel-indicator index="0"></bs-carousel-indicator>
          <bs-carousel-indicator index="1"></bs-carousel-indicator>
        </bs-carousel-indicators>

        <bs-carousel-item class="${classes.carouselItem}" active>
          <img class="${classes.image}" src="https://www.w3schools.com/w3css/img_lights.jpg">
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <img class="${classes.image}" src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/1200px-Image_created_with_a_mobile_phone.png">
        </bs-carousel-item>
      </bs-carousel>
    `;
  }
}
