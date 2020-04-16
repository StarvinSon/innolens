import {
  customElement, LitElement, TemplateResult,
  html, PropertyValues, property
} from 'lit-element';
import '@lit-element-bootstrap/carousel';

import '../theme';
import '../user-current-page';
import '../user-registered-page';
import { MemberService } from '../../services/member';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

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


  @injectableProperty(MemberService)
  @observeProperty('_onDependencyInjected')
  public memberService: MemberService | null = null;

  @property({ attribute: false })
  public interactable = false;


  private _onDependencyInjected(): void {
    this.requestUpdate();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return super.shouldUpdate(changedProps) && this.interactable;
  }

  protected render(): TemplateResult {
    return html`
      <bs-carousel interval="10000">
        <bs-carousel-indicators class="${classes.indicators}" slot="indicators">
          <bs-carousel-indicator class="${classes.indicator}" index="0" active></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="1"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="2"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="3"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="4"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="5"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="6"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="7"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="8"></bs-carousel-indicator>
        </bs-carousel-indicators>

        <bs-carousel-item class="${classes.carouselItem}" active>
          <inno-user-registered-page 
            class="${classes.image}"
            .memberService="${this.memberService}"
          ></inno-user-registered-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page class="${classes.image}"></inno-user-current-page>
        </bs-carousel-item>
      </bs-carousel>
    `;
  }
}
