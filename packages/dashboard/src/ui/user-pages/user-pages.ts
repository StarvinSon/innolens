import {
  BsCarousel, BsCarouselIndicator, BsCarouselIndicators, BsCarouselItem
} from '@lit-element-bootstrap/carousel';
import {
  customElement, LitElement, TemplateResult, html, property, PropertyValues
} from 'lit-element';

import '../theme';
import '../user-current-page';
import '../user-current-week-page';
import '../user-example-page';
import '../user-expendable-inventories-page';
import '../user-heatmap-page';
import '../user-machines-page';
import '../user-registered-page';
import '../user-reusable-inventories-page';
import '../user-spaces-page';
import { ExpendableInventoryService, ExpendableInventoryType } from '../../services/expendable-inventory';
import { MachineService, MachineType } from '../../services/machine';
import { MemberService } from '../../services/member';
import { ReusableInventoryService, ReusableInventoryType } from '../../services/reusable-inventory';
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

  @injectableProperty(MachineService)
  @observeProperty('_onDependencyInjected')
  public machineService: MachineService | null = null;

  @injectableProperty(ReusableInventoryService)
  @observeProperty('_onDependencyInjected')
  public reusableInventoryService: ReusableInventoryService | null = null;

  @injectableProperty(ExpendableInventoryService)
  @observeProperty('_onDependencyInjected')
  public expendableInventoryService: ExpendableInventoryService | null = null;

  @property({ attribute: false })
  public interactable = false;

  @property({ attribute: false })
  private _spaces: ReadonlyArray<Space> | null = null;

  @property({ attribute: false })
  private _spaceGroups: ReadonlyArray<ReadonlyArray<Space>> = [];

  @property({ attribute: false })
  private _machineTypes: ReadonlyArray<MachineType> | null = null;

  @property({ attribute: false })
  private _machineTypeGroups: ReadonlyArray<ReadonlyArray<MachineType>> = [];

  @property({ attribute: false })
  private _reusableInventoryTypes: ReadonlyArray<ReusableInventoryType> | null = null;

  @property({ attribute: false })
  private _reusableInventoryTypeGroups: ReadonlyArray<ReadonlyArray<ReusableInventoryType>> = [];

  @property({ attribute: false })
  private _expendableInventoryTypes: ReadonlyArray<ExpendableInventoryType> | null = null;

  @property({ attribute: false })
  private _expendableInventoryTypeGroups: ReadonlyArray<ReadonlyArray<ExpendableInventoryType>>
  = [];

  private _spaceFetched = false;

  private _machineTypeFetched = false;

  private _reusableInventoryTypeFetched = false;

  private _expendableInventoryTypeFetched = false;


  private _onDependencyInjected(): void {
    this.requestUpdate();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return super.shouldUpdate(changedProps) && this.interactable;
  }

  protected update(changedProps: PropertyValues): void {
    if (!window.customElements.get('bs-carousel')) window.customElements.define('bs-carousel', BsCarousel);
    if (!window.customElements.get('bs-carousel-indicator')) window.customElements.define('bs-carousel-indicator', BsCarouselIndicator);
    if (!window.customElements.get('bs-carousel-indicators')) window.customElements.define('bs-carousel-indicators', BsCarouselIndicators);
    if (!window.customElements.get('bs-carousel-item')) window.customElements.define('bs-carousel-item', BsCarouselItem);

    if (this.spaceService !== null && !this._spaceFetched) {
      this.spaceService.fetchSpaces().then((data) => {
        this._spaces = data.filter((space) => space.spaceId !== 'inno_wing');
        this._spaceGroups = this._spaces.reduce(
          (groups: Array<Array<Space>>, space, i) => {
            if (i % 8 === 0) {
              groups.push([space]);
            } else {
              groups[Math.floor(i / 8)].push(space);
            }
            return groups;
          },
          []
        );
      });
      this._spaceFetched = true;
    }

    if (this.machineService !== null && !this._machineTypeFetched) {
      this.machineService.updateTypes().then((data) => {
        this._machineTypes = data;
        this._machineTypeGroups = this._machineTypes.reduce(
          (groups: Array<Array<MachineType>>, machineType, i) => {
            if (i % 8 === 0) {
              groups.push([machineType]);
            } else {
              groups[Math.floor(i / 8)].push(machineType);
            }
            return groups;
          },
          []
        );
      });
      this._machineTypeFetched = true;
    }

    if (this.reusableInventoryService !== null && !this._reusableInventoryTypeFetched) {
      this.reusableInventoryService.updateTypes().then((data) => {
        this._reusableInventoryTypes = data;
        this._reusableInventoryTypeGroups = this._reusableInventoryTypes.reduce(
          (groups: Array<Array<ReusableInventoryType>>, reusableInventoryType, i) => {
            if (i % 8 === 0) {
              groups.push([reusableInventoryType]);
            } else {
              groups[Math.floor(i / 8)].push(reusableInventoryType);
            }
            return groups;
          },
          []
        );
      });
      this._reusableInventoryTypeFetched = true;
    }

    if (this.expendableInventoryService !== null && !this._expendableInventoryTypeFetched) {
      this.expendableInventoryService.updateTypes().then((data) => {
        this._expendableInventoryTypes = data;
        this._expendableInventoryTypeGroups = this._expendableInventoryTypes.reduce(
          (groups: Array<Array<ExpendableInventoryType>>, expendableInventoryType, i) => {
            if (i % 3 === 0) {
              groups.push([expendableInventoryType]);
            } else {
              groups[Math.floor(i / 3)].push(expendableInventoryType);
            }
            return groups;
          },
          []
        );
      });
      this._expendableInventoryTypeFetched = true;
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
          ${[
            ...Array(
              this._spaceGroups.length
              + this._machineTypeGroups.length
              + this._reusableInventoryTypeGroups.length
              + this._expendableInventoryTypeGroups.length
            )
          ].map(
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
        ${this._machineTypeGroups.map(
          (group) => html`
            <bs-carousel-item class="${classes.carouselItem}">
              <inno-user-machines-page
                class="${classes.page}"
                .machineService="${this.machineService}"
                .machineTypes="${group}"
              ></inno-user-machines-page>
            </bs-carousel-item>
          `
        )}
        ${this._reusableInventoryTypeGroups.map(
          (group) => html`
            <bs-carousel-item class="${classes.carouselItem}">
              <inno-user-reusable-inventories-page
                class="${classes.page}"
                .reusableInventoryService="${this.reusableInventoryService}"
                .reusableInventoryTypes="${group}"
              ></inno-user-reusable-inventories-page>
            </bs-carousel-item>
          `
        )}
        ${this._expendableInventoryTypeGroups.map(
          (group) => html`
            <bs-carousel-item class="${classes.carouselItem}">
              <inno-user-expendable-inventories-page
                class="${classes.page}"
                .expendableInventoryService="${this.expendableInventoryService}"
                .expendableInventoryTypes="${group}"
              ></inno-user-expendable-inventories-page>
            </bs-carousel-item>
          `
        )}
      </bs-carousel>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
