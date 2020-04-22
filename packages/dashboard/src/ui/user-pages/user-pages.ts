import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';
import '@lit-element-bootstrap/carousel';

import '../theme';
import '../user-current-page';
import '../user-current-week-page';
import '../user-example-page';
import '../user-heatmap-page';
import '../user-registered-page';
import '../user-spaces-page';
import { MemberService } from '../../services/member';
import { SpaceService, Space } from '../../services/space';
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

  @injectableProperty(SpaceService)
  @observeProperty('_onDependencyInjected')
  public spaceService: SpaceService | null = null;

  @property({ attribute: false })
  public interactable = false;

  @property({ attribute: false })
  private _spaces: ReadonlyArray<Space> | null = null;

  @property({ attribute: false })
  private _spaceGroups: ReadonlyArray<ReadonlyArray<Space>> = [];

  private _spaceFetched = false;


  private _onDependencyInjected(): void {
    this.requestUpdate();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return super.shouldUpdate(changedProps) && this.interactable;
  }

  protected update(changedProps: PropertyValues): void {
    if (this.spaceService !== null && !this._spaceFetched) {
      this.spaceService.fetchSpaces().then((data) => {
        this._spaces = data.filter((space) => space.spaceId !== 'inno_wing');
        this._spaceGroups = this._spaces.reduce(
          (groups: Array<Array<Space>>, space, i) => {
            if (i % 3 === 0) {
              groups.push([space]);
            } else {
              groups[Math.floor(i / 3)].push(space);
            }
            return groups;
          },
          []
        );
      });
      this._spaceFetched = true;
    }

    super.update(changedProps);
  }

  protected render(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <bs-carousel interval="10000" pause="false">
        <bs-carousel-indicators class="${classes.indicators}" slot="indicators">
          <bs-carousel-indicator class="${classes.indicator}" index="0" active></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="1"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="2"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="3"></bs-carousel-indicator>
          <bs-carousel-indicator class="${classes.indicator}" index="4"></bs-carousel-indicator>
          ${[...Array(this._spaceGroups.length)].map(
            (_, i) => html`
              <bs-carousel-indicator
                class="${classes.indicator}"
                index="${5 + i}"
              ></bs-carousel-indicator>
            `
          )}
        </bs-carousel-indicators>

        <bs-carousel-item class="${classes.carouselItem}" active>
          <inno-user-registered-page
            class="${classes.page}"
            .memberService="${this.memberService}"
          ></inno-user-registered-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-page
            class="${classes.page}"
            .spaceService="${this.spaceService}"
          ></inno-user-current-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-current-week-page
            class="${classes.page}"
            .spaceService="${this.spaceService}"
          ></inno-user-current-week-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-heatmap-page
            class="${classes.page}"
            floor="gf"
            .spaceService="${this.spaceService}"
            .spaces="${this._spaces}"
          ></inno-user-heatmap-page>
        </bs-carousel-item>
        <bs-carousel-item class="${classes.carouselItem}">
          <inno-user-heatmap-page
            class="${classes.page}"
            floor="lgf"
            .spaceService="${this.spaceService}"
            .spaces="${this._spaces}"
          ></inno-user-heatmap-page>
        </bs-carousel-item>
        ${this._spaceGroups.map(
          (group) => html`
            <bs-carousel-item class="${classes.carouselItem}">
              <inno-user-spaces-page
                class="${classes.page}"
                .spaceService="${this.spaceService}"
                .spaces="${group}"
              ></inno-user-spaces-page>
            </bs-carousel-item>
          `
        )}
      </bs-carousel>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
