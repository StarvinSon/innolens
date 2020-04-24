import { interpolateRdYlGn } from 'd3-scale-chromatic';
import {
  customElement, LitElement, property, TemplateResult, html, PropertyValues
} from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';

import '../theme';

import { css, classes } from './heatmap.scss';


export interface HeatmapData {
  readonly spaces: ReadonlyArray<HeatmapSpaceData>;
}

export interface HeatmapSpaceData {
  readonly spaceId: string;
  readonly spaceCapacity: number;
  readonly currentUserCount: number;
}

export type HeatmapSpaceFloor = 'gf' | 'lgf';

const TAG_NAME = 'inno-heatmap';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Heatmap;
  }
}

@customElement(TAG_NAME)
export class Heatmap extends LitElement {
  public static readonly styles = css;


  @property({ type: String })
  public floor: HeatmapSpaceFloor = 'gf';

  @property({ attribute: false })
  public data: HeatmapData | null = null;

  @property({ attribute: false })
  private ratio: Record<string, number> = {};


  protected update(changedProps: PropertyValues): void {
    if (changedProps.has('data')) {
      this._calcRatio();
    }
    super.update(changedProps);
  }

  private _calcRatio(): void {
    if (this.data === null) return;

    for (const { spaceId, spaceCapacity, currentUserCount } of this.data.spaces) {
      this.ratio[spaceId] = currentUserCount / spaceCapacity;
    }
  }

  private _getRatio(spaceId: string): number {
    const currentUserCount = this.ratio[spaceId];
    if (currentUserCount === undefined) {
      return 1;
    }
    return Math.max(1 - currentUserCount, 0);
  }

  protected render(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      ${this.floor === 'gf'
        ? html`${this._renderGfHeatmap()}`
        : html`${this._renderLgfHeatmap()}`}
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderGfHeatmap(): TemplateResult {
    return html`
      <svg id="areas" class="${classes.gf}" viewBox="0 0 1170 637">
        <defs>
          <style>
            .cls-1, .cls-5, .cls-6 {
              fill-rule: evenodd;
            }

            .cls-2 {
              font-size: 42.667px;
            }

            .cls-2, .cls-3 {
              fill: #31c2c2;
              text-anchor: middle;
              font-family: Helvetica;
              font-weight: 700;
            }

            .cls-3 {
              font-size: 21.333px;
            }

            .cls-4, .cls-5 {
              fill: #d8d8d8;
            }

            .cls-6 {
              fill: #d2f5f0;
            }
          </style>
        </defs>
        <g id="common_makerspace_area_2" class="${classes.areas} ${classes.common_makerspace_area_2}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('common_makerspace_area_2')) })}">
          <path id="形狀_1" data-name="形狀 1" d="M430,16l53,194H869L876,8Z"/>
        </g>
        <g id="machine_room" class="${classes.areas} ${classes.machine_room}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('machine_room')) })}">
          <rect id="矩形_37" data-name="矩形 37" x="876" y="7" width="288" height="198"/>
        </g>
        <g id="electronic_workbenches" class="${classes.areas} ${classes.electronic_workbenches}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('electronic_workbenches')) })}">
          <rect id="矩形_38" data-name="矩形 38" x="831" y="210" width="242" height="74"/>
        </g>
        <g id="workshop_3" class="${classes.areas} ${classes.workshop_3}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_3')) })}">
          <path id="shape3" d="M941,348l2,109,160-2-39-108Z"/>
        </g>
        <g id="workshop_1" class="${classes.areas} ${classes.workshop_1}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_1')) })}">
          <path id="shape2" d="M479,236l33,125,83,1,3-44,15-3,2-75Z"/>
        </g>
        <g id="workshop_2" class="${classes.areas} ${classes.workshop_2}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_2')) })}">
          <path id="shape1" d="M529,416l28,97H710l3-51-115-4V411Z"/>
        </g>
        <g id="laser_cutting_room" class="${classes.areas} ${classes.laser_cutting_room}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('laser_cutting_room')) })}">
          <rect id="矩形_44" data-name="矩形 44" x="616" y="237" width="172" height="77"/>
        </g>
        <g id="common_makerspace_area_1" class="${classes.areas} ${classes.common_workspace_area_1}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('common_makerspace_area_1')) })}">
          <rect id="矩形_45" data-name="矩形 45" x="718" y="463" width="445" height="164"/>
        </g>
        <text id="Common_Makerspace_Area" data-name="Common Makerspace Area" class="cls-2" x="666.375" y="88.956"><tspan x="666.375">Common</tspan><tspan x="666.375" dy="51.2">Makerspace Area</tspan></text>
        <text id="Machine_Room-2" data-name="Machine Room" class="cls-2" x="1023.922" y="93.47"><tspan x="1023.922">Machine</tspan><tspan x="1023.922" dy="51.2">Room</tspan></text>
        <text id="Workshop_1-2" data-name="Workshop 1" class="cls-3" x="551.002" y="270.842"><tspan x="551.002">Workshop</tspan><tspan x="551.002" dy="25.6">1</tspan></text>
        <text id="Laser_Cutting_Room-2" data-name="Laser Cutting Room" class="cls-3" x="703.691" y="269.085"><tspan x="703.691">Laser</tspan><tspan x="703.691" dy="25.6">Cutting Room</tspan></text>
        <text id="Workshop_3-2" data-name="Workshop 3" class="cls-3" x="1010.556" y="399.523"><tspan x="1010.556">Workshop</tspan><tspan x="1010.556" dy="25.6">3</tspan></text>
        <text id="Workshop_2-2" data-name="Workshop 2" class="cls-3" x="630.576" y="491.647"><tspan x="630.576">Workshop 2</tspan></text>
        <text id="Electronic_Workbenches" data-name="Electonic  Workbenches" class="cls-3" x="958.601" y="238.916"><tspan x="958.601">Electronic </tspan><tspan x="958.601" dy="25.6">Workbenches</tspan></text>
        <text id="Conference_Room" data-name="Conference Room" class="cls-3" transform="translate(397.793 96.867) rotate(74.119)"><tspan x="0">Conference</tspan><tspan x="0" dy="25.6">Room</tspan></text>
        <text id="Common_Makerspace_Area-2" data-name="Common Makerspace Area" class="cls-2" x="928.23" y="528.202"><tspan x="928.23">Common</tspan><tspan x="928.23" dy="51.2">Makerspace Area</tspan></text>
        <g id="grey">
          <rect id="grey10" class="cls-4" x="4" y="8" width="225" height="163"/>
          <path id="grey9" class="cls-5" d="M221.75,170.428L8.033,239.057l1.031-72.966Z"/>
          <path id="grey8" class="cls-5" d="M190.254,39.256L306.769,5.478,363.943,202.7,247.428,236.475Z"/>
          <path id="grey7" class="cls-5" d="M316.663,34.544L416.677,6.026,468.7,188.484,368.69,217Z"/>
          <rect id="grey6" class="cls-4" x="221" y="6" width="199" height="38"/>
          <rect id="grey5" class="cls-4" x="220" y="310" width="178" height="321"/>
          <path id="grey4" class="cls-5" d="M485.871,633.881L380,628.512l6.532-325.735Z"/>
          <rect id="grey3" class="cls-4" x="598" y="316" width="192" height="145"/>
          <rect id="grey2" class="cls-4" x="839" y="287" width="226" height="57"/>
          <rect id="grey1" class="cls-4" x="871" y="322" width="70" height="136"/>
        </g>
        <image id="handrail" x="249" y="86" width="58" height="61" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAA9CAYAAAD8vnqQAAADMUlEQVRoge2aW4hNURjHf47jMmbMMKZkJJehXFKKXMstD5RCyFDmifKoXB88eNE8kJQSD26Ra17xpBnxokSEkAglCk2ZctxGS9/Rbll72/vsy6y1O/86nX3WXnuv77f2t76117dOH9xUG7ALqA1p/W3XKGuAk0BPxM8rC2wPrYnAwwognQLdAHypELLHBdcdCBwNATLEAlsrVgtw3wD1BHiWF9A1QJcB8ixQB3S4DtofOGwA/Aps9tRzGnQscMcA+RyYptV1FnQF8NkAeRkYbKjvHGg/4EAF0TQyaDF520NrFHAJmJ1FY4UsGjFoGXDPAPkrrQazBu0LtANXgWGe8h/ANuBWxvakomag0zAOXwNzpMGwY8/aYLQE+GCAvAY0euo5C6pcdS/wUzNMuepuQF8PpwaaZtQdDpwDFhvOqbKbKbb9j9ICXQCcB0b4nM8UkhSirnLFPcCNAMheUZJPtAk4AyzVyt/LWG2KeX/ViTuBSZJt8OoI8M3nOhUfTsVs+6/mAW8NUbVTnqy+rvRTUJCZESPD8CCu66pe3i4GjvSUq5vvk6DzLmYbZdXFuLY+juuq+e80sFwr/whslDnSGlUKOhO4CIzRylUSqlXc2CpFdV3lqlvlnVSHVFpkIyQRn2gDcBxYHVDnewI2paKwoNNl7TguJTuUZ9Ub7GnwHMcJRqG0BSgZQvYh4HHIaSNoelHz65sYU0eYT2CmXuVqLhhu0iXpyP8BhAVdmDLkH1A/150KXAEmaOUqK7AWeBHUQzbKFHU3SdpRhzwGzHUREm3w18o7Y5uh3npxY2dVBp0iUXWyD4jTkAjoKtnTGJTgfVXW/SAwVH6P1853eI4zS4Pc1SJUt2GDx09+0bQ9g0gaKeoWPL2u9FTeY1/G7LyamNcnroLsJCPuq9Z8j2wzMgkVJac6APjkPo6/ijImu201MCn11t5L5qqC5k1RUymzgBOev6Y1a+fLy6FGLFNU0HUBr4lKo20DLCuq6zrr6tVglDdVQfOmoqQZ52sRuEHjXCnfLS7zX7ds7ZjaelTfa8ylqsEob6qC5k1V0LypIFuCeVdJbdWrTaUdkgnMo0rA/t+zEKv1Ofp9mQAAAABJRU5ErkJggg=="/>
        <image id="lift" x="322" y="496" width="58" height="58" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAYAAADhu0ooAAACBElEQVRoge2byytEURzHPySK8sjWkpVioyzFzsZaHkl5hCgbf4Nmo5SysLDy2NqwIqyULJQFNh4bNp4LGgadOnSaLs49c4bxcz41ze2czm++n+bcX/dOd/KAPmACKEQmSSChRI+AGqGS7xznC/4mTQrzcydLdgmiGbAGtAJbliVegGFgEHjQY0/AKDAApHwFOwFePb1WjHO+GFi3qHtoZGkBboA2Y2zPQ7YTn6IrEY3NVrbbWFNmHHd6yuZN9BQoMoLOGoFLgMtv1qe0FGmSqVwTvQDKgUpgR4+p9wo9dmVRQ0n1aMkuj5Let646t+7Txm6Bu5h1zj0KfogWODawKMoixkod6lR5zPRBHNFnvR2fsxHEAZW9MY6D7dbtzxFBk37brRvnguE4+7ljY53J5RxtBqYcg+3q20LFHNDgWGcc2IizwEVUNZ16h3XozvxOdQZ1ohrfl4SLemkEUWkEUWkEUWlIEt0H2oHNqEmft2m/zQywrO+BmySLjukb/6GoSUmitcDCZ5OhGf1BDoAOYDsquqStOw0sAtfAavqkJNER3XHFN6M6YOmzydCMpBFEpRFEpRFEpRFEpRFEpRFEpRFEpRFEpRFEpfFvRF1+BVQPCvc6ft6FcTwJzDvW2Yu7oED/LyQOZxkENFnzUMOWpBJNWP7B5/EHg9miMqmHor8iCSTeAJa/QD6Vp2NEAAAAAElFTkSuQmCC"/>
        <image id="male" x="304" y="323" width="28" height="56" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAA4CAYAAADuMJi0AAAB5klEQVRYhe2YMWvbUBDHf89JpwzVB8gWyNApYFrIkj2QoYuHbmlxhoyeigct1ZR8gGRK3dIvkCGlNGQo2FBoB2/x5KVQWnAg6lAwlFbhwgVMkfxOjqMs7w/G9t3/7qcz0rOeHEZFSfYA2AVeAI+06hx4DRymsftj6WQCRkn2EPgArBdYPgObaex++XrVjAN2psDQXMfSyDthlGSPgS/GA3uSxu7rNINlwi0jzOS1AJdLAL1eC/CiBNDrtQA/lQB6vRbgR6Bv8PXVeztgGrt/QAP4McUmuYZ6bwdU6BCoA++A8URqrLG6erwyL203ipJsCVjRr8M0dr/L9qhU1xNGSbagC/O2Hn3pyQuUya8AvNEF/q9T2HHJFWUWnQBP5aRpVQBDGS0B7lQAu9GOAFcrBK5a/w/npiKgnFlvgcEMoIHW5i4ERcBeGju5RE5nAJ5qba8M8M4UgAEYgAFYDXCUE/82h955PUYCbP8X/A4czAF4oL0m1a6lsTsCNoA94CWwlsbup6dZx7cf1B5r2lN6bwhrUZNdoFvi6F/p+3MPVDY3+5OxcB0GYAAGYAAGYADeA3DRkx8XxKc92y6quZZvwvc5MdkdX8qrYJebV2MD6r1OU28l5anSGfBswiKfJSY58TS1Jl/AFTgyegyMth0wAAAAAElFTkSuQmCC"/>
        <image id="male-2" data-name="male" x="611" y="344" width="19" height="35" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAjCAYAAAB2KjFhAAABL0lEQVRIie2VMUsDMRiGnxyCi2AGF3HpbyiCm3/AH6GD/RFS4hKK7uJUB/tLCm6CU2eHw9khHRxEaSTyKdcjyfW4jvcuH3nzvc+FJOQUGWnrL4ExMABKYOKMekglkjABTSNToxSwyCxs3NLPwgYpX1sfzeVgZcp3Rq3awiYt/TRMNnlUWWGZ2/yt6/dqaOsPgBvgFNht8ZFP4Am4cka9KzmZZ+C4w0pfgJMAGnYEIflhgO11BP3pKHaat8C8ITiXvqrUTqQx7N9hA+xN+taUu7St1cO2A4s+Lxv0rQp5Db7FCHWxIWxRzxXOqAA7A+5ClXFVX8BM6r9iuegPRVv/CJzLcOmM0tp6B+yLN3NGXdRz/T3rYT0spmXF/KjV+nwj7B54FcC1eKGGcfDD/LqAH0Y7VngIj11IAAAAAElFTkSuQmCC"/>
        <image id="wheelchair" x="621" y="413" width="24" height="34" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAiCAYAAABFlhkzAAACHUlEQVRIibWWTUhUURTHf35QQUkEQUi7ol1otAhxIUoIurFs1RSKtDNaiKvctMi1IkRIoJsCP0AYN6bBEBMUfSwicSHkBAbmRoki0PKj4gxn4Hq57907M88/HJi5953//56Pe94jEMeBYSCnNqxriaACyAL/LMvqXtlocZAXrMVHXhmgfr7EvWCBXIl7wZA8ZxzpyYTUoCpQZUafPQ1sAmNAL7CbRARloZg2Owe06+85YDXJg6SAP0b+94AHSZGfAbYi7sFAEgKpmIsmdqdcgT6PwD5wO8o55KL5IBzPgEHg6GFEYNoX4K7el0QEliLW/+qImSo3ReM6UZet9Qodkg0ugRNAP/A8UETeC3VAN/DR3qy2/t8AnmgOfxYRyZ4WWuwC0ApclAYwBe4Bj4ogjcKKWh6FFLU5yNcSEMtDovhqdcGgkb64LvoGfHLYpNYlj5uW05B1gK4i7oFpMr/qheCpsfhDu8jEWWC7RJFZ4flgLKQj0njLGtehlpM8nzKINiIEJoBX2gw1npp2Ak1GfXljnOaFxzkEIwbfqrTpouHUDNR6SMTnvdZL7LXvYTPvR4BRz7taxsgV4KTaS19UQvbOKlraEckx4KH13C/HaD6QosLiZeC35SxdMw881u+iTUfn9DgO7BQQdDhE4ux+REYiBQqRvPUQrwPXYlJ+QMAe1zLPG4GrwHXgkn62SLd8BhaAaWAnRuC7zjaAtf9E6vt67YVvoAAAAABJRU5ErkJggg=="/>
        <image id="female" x="336" y="323" width="36" height="56" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA4CAYAAACVFFp4AAADt0lEQVRYhe2Y34tVVRTHP/umovhgqIVgoRNGjYbzkI4o+SYaFU0vgkrEkDOIhdWDCtrDYoOmRqIiiD5E4PQH9GMiiiBBC8KHiobKdBxFIdFIJQV/dmTpusOde/c+954z9ww+3O/LnDnru9f+zDqz91n7OHIq8X48sB54E5hrWX4HPgYOOpHbeTLnAkq8nwJ8DSyOWH4EXnIiV7PmLuUBAj5JgVEtMU9mZa5Q4n0n8FOD9k4ncjxL/jwVeqUgb26gmRm8T2RNngfon4K8uYGOZPB+nzV5HqBvgJ8b8Knn28KBnMj/wErg7xSbxlaat1gggxoEngf6gBsVIb0+rDHzZM+dZ1ClEu8nA3P0Ehh0ItdHm/OhUt0KJd6/CmwAOoAJOeFvAb8C+53IF2nGVKDE+w+ALTkhYtrpRKI5o0CJ98ttiRehF51IMHcQKPF+HPALMK8gIO2bOpzInepAbNn3FgiDNXS9oUBNhaz5Ogk8FvB/BTwOLGxwYm09LgIvB2L6nptT3cSFKvR+BOZLJ6LtxOkGYbB9Scf0B2LTba4RGlGhxPs24M/A8tZNb77txBp/pEGgu8CzwCRb9tVPRLeDdicy/EdWV+jDyF7T50QGgM0ZYDDvJifyG/BpIK5z7aq8MUyceP8CcDQwSE8PTwO6IoaA8RmAyuNn2+R/RcYvdSLHKFco8V7B9kQSHnAiZ4GNOWCwMRudyBk9HkU8e4zhQYUS71+3N3e1rgFtdk8TTs4BpLpuVSrZogjlecOJ9JUS7yfqdh5J9JET0eX5zihgsLEbnIhuAbsjnh3K4hLvu4DPAoZLwFN2fR6YMgog1RXgSXsq+r84LeB5TUs4MZJgmxPRR/Z2E2BUjwJvOZH/gO0Rz/0KTbWdeWpFQH9/zpatPvMZTQBSXbCqa2s7YI1dWf/qai45Eb1YZieEc8DnwAonoptWdxNhsFzdTuSmzqG7v/XfOvcyZUlrP/SNfwqY1UQg1Vl7h9W86anT5K8pAAbLuSYWjPVDJXvG7QUAqf7Q/9HQMSlWoa4CYbDcXaFADGhrgTCpc9QAWS+9YAyAFthc6UAFnDLSVDNXCGjRGAJ1Vt8YFzDpmf2ZSIK1kS9o6+znoUCs377MhnSi+l6ms33i/V7g3UCo3KIMBWL7nMh7jc6R9ytsYWoB1VMLqJ5aQPXUAqqnFlA9tYDqKdR+pOlGJHY1pXOIjQkqa4X0G2O1jjmRy3bg/KHBMc0BciL6QavHPkToZ77vgNUVllV2T2Pq6bExjQm4B4sP6iqE5tDBAAAAAElFTkSuQmCC"/>
        <image id="female-2" data-name="female" x="633" y="343" width="23" height="35" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAjCAYAAAB/wZEbAAACEklEQVRIie2Vz0tUURTHP1dbBJEJQcscqBZFREi0bCm0rK1BEdrGfuzK0DqcSKhFm8QgMtBd9CeU+AcYQoLQoqCpVUlB0y8ErRs3zsTlznvznm9oIfiFYbjfc89nzn3vnLmOEvKqQ8AYUAPqwIQTmS7KLIQb+FFGaLjoB7pKFD6e448VJbaFe9UQ78sJ1zqCO5HfwLuccL0juOl2jj/RMdxe2nBUab3My/zvymxFr3oBCC24p0QBK8BjJ/Kw5dQZ4EvA/QqnuuxEJnPhXjVU+hroqQD/ChxwIitNI32hmoDngNUc2KrFmwp5tzIr96qHgZdAt1kLwAjwok21x4AHwHFb/wKOOpHltPJ7EThoFLjeBozFR6N1t3H4B/eqJ4GBaNMz4CNwqgB+GvgAPI+8AePhvOo2YAk4FG3oB64AZwvgQbPWXYuR9wo40mUVx+AnwGfgTAlw0CDwCXgaeQcDN8C/ReY6cAO4ljz/dgonv2p/wevRvu9/u8UG5wQwY8d7C2wvCcfasmbdcx6YdyJTWRN6xyrfqO46kbhzWia0F3gP7KwADxPa50S+NI10Qi9WBGMTOhIb8YTusFtnd0U41mV7nchPksr32boRfdaS5EayXkv2h/z9LZVnyavORIPUcCK9XjU8013mzTqRc3n5Ze7QytqCb8E3CTyeyB/JdxrfMHwKeGPAcIkE3bR18EM8W8Af5xyMeUiqZy8AAAAASUVORK5CYII="/>
        <image id="handrail-2" data-name="handrail" x="886" y="365" width="39" height="40" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAoCAYAAAB99ePgAAACU0lEQVRYhe2Yz0sVURTHPz1M0gzth9RCpMCFEAQaSkSkIUQrEWoblFiLFv0FLYJaBG1cSBIKIgRiBCm4DV8gBGKiLaWoTQUl9QJDCuLFjTNxuMx7M2/ufW9m8b4wDOfM3Pu+c+73nHPv20M62AvcA8aAhhIM3qfB7ATwCihGXIVaR+4KMAW0Wf7ZkHc/14gT+4BJFanfwJayU0M38EYReQf0A+Npk7sO/FQkngKt8iw1cgeAJ5bg71jvRJIrlcYu6AXmgS5rjpVK58x5JGUy/7aUiYDYpsuEviJ3CJgBhsXeAW4Cu8DzpJP6iNw5iVBAbB3oAeZcJ3YhlxOR54EO8S0CZ4G3rsRwWNZjko1Dln8D+OWB1z8kIXdRiLWL/Ro4XcH4Vikj55VvIeS9l5WQMjuJB6o2/QHuA4eV7641ZkQ9GxTfYIymb65vcSN3XAR+RmzTlK8CL0KauC/k4pC7DEwrEp8kG79UidR/lMtWs5N4BDyzovO1FsQokxDd0oJOif0BaAKOVjC30ecFZRt9bgNHHPhyTSp8IEwTuYNSJopy12grkRBxRF/uKuhlbZESYdrQfqlXt2T3+t3la5MiWNYe2WvpnYSpQ6tpkApgyN0AJoBG69lWxNiTwCjQrHyXfJeWj7LuO0pXxZAfsTU37kFXkZozh401Wdq8z692RYOcIzMJnzth78g0uaje2gk8lu4QlBlzz4ccYGpOrlfKg4Yp0APVJkZdcw7IfEI8BPrE1iJfquIuNxbMKb2g/lzJEn7UNZcUdXJJYbJ12TqIZAOw/Bf6ca1k2HAJnQAAAABJRU5ErkJggg=="/>
        <path id="border46" class="cls-6" d="M0,1H15V338H0V1Z"/>
        <path id="border45" class="cls-6" d="M0,16V1H1170V16H0Z"/>
        <path id="border44" class="cls-6" d="M1155,5h15V637h-15V5Z"/>
        <path id="border43" class="cls-6" d="M1167,622v15H90V622H1167Z"/>
        <path id="border42" class="cls-6" d="M105,637H90V323h15V637Z"/>
        <path id="border41" class="cls-6" d="M99,323v15H0V323H99Z"/>
        <path id="border40" class="cls-6" d="M10.219,246.164L5.781,231.836l226-70,4.438,14.328Z"/>
        <path id="border39" class="cls-6" d="M218,6h15V179H218V6Z"/>
        <path id="border38" class="cls-6" d="M218.782,165.036l14.436-4.072,22,78-14.436,4.072Z"/>
        <path id="border37" class="cls-6" d="M241.053,243.214l-4.106-14.428,130-37,4.106,14.427Z"/>
        <path id="border36" class="cls-6" d="M298.786,7.052l14.428-4.1,62,218-14.428,4.1Z"/>
        <path id="border35" class="cls-6" d="M361.02,225.223l-4.04-14.446,118-33,4.04,14.446Z"/>
        <path id="border34" class="cls-6" d="M411.774,7.009l14.452-4.019,52,187-14.452,4.018Z"/>
        <path id="border33" class="cls-6" d="M869,6h15V210H869V6Z"/>
        <path id="border32" class="cls-6" d="M1163,195v15H869V195h294Z"/>
        <path id="border31" class="cls-6" d="M831,282h15v71H831V282Z"/>
        <path id="border30" class="cls-6" d="M837,353V338h42v15H837Z"/>
        <path id="border29" class="cls-6" d="M932,344h15V460H932V344Z"/>
        <path id="border28" class="cls-6" d="M932,353V338h141v15H932Z"/>
        <path id="border27" class="cls-6" d="M1073,346h-15V278h15v68Z"/>
        <path id="border26" class="cls-6" d="M1066,278v15H831V278h235Z"/>
        <path id="border25" class="cls-6" d="M1057.88,344.372l14.24-4.744,37,111-14.24,4.744Z"/>
        <path id="border24" class="cls-6" d="M864,345h15V463H864V345Z"/>
        <path id="border23" class="cls-6" d="M869,463V448h240v15H869Z"/>
        <path id="border22" class="cls-6" d="M783,229h15V466H783V229Z"/>
        <path id="border21" class="cls-6" d="M792,451v15H589V451H792Z"/>
        <path id="border20" class="cls-6" d="M607,235h15v88H607V235Z"/>
        <path id="border19" class="cls-6" d="M604,460H589V308h15V460Z"/>
        <path id="border18" class="cls-6" d="M675,460H660V308h15V460Z"/>
        <path id="border17" class="cls-6" d="M599,323V308H798v15H599Z"/>
        <path id="border16" class="cls-6" d="M597,409V394h75v15H597Z"/>
        <path id="border15" class="cls-6" d="M703,458h15v62H703V458Z"/>
        <path id="border14" class="cls-6" d="M711,505v15H549V505H711Z"/>
        <path id="border13" class="cls-6" d="M598,404v15H520V404h78Z"/>
        <path id="border12" class="cls-6" d="M466.8,243.113l14.392-4.226,37,126L503.8,369.113Z"/>
        <path id="border11" class="cls-6" d="M598,354v15H504V354h94Z"/>
        <path id="border10" class="cls-6" d="M793,229v15H467V229H793Z"/>
        <path id="border9" class="cls-6" d="M519.786,418.051l14.428-4.1,29,102-14.428,4.1Z"/>
        <path id="border8" class="cls-6" d="M227,631H212V300h15V631Z"/>
        <path id="border7" class="cls-6" d="M222,315V300H401v15H222Z"/>
        <path id="border6" class="cls-6" d="M221,418V403h61v15H221Z"/>
        <path id="border5" class="cls-6" d="M269,308h15V468H269V308Z"/>
        <path id="border4" class="cls-6" d="M277,453v15H248V453h29Z"/>
        <path id="border3" class="cls-6" d="M248,460h15V631H248V460Z"/>
        <path id="border2" class="cls-6" d="M386.8,305.1l14.4-4.19,96,330-14.4,4.19Z"/>
        <path id="border1" class="cls-6" d="M276,402V387H420v15H276Z"/>
      </svg>
    `;
  }

  private _renderLgfHeatmap(): TemplateResult {
    return html`
      <svg id="areas" class="${classes.lgf}" viewBox="0 0 1557 831">
        <defs>
          <style>
            .cls-1, .cls-2 {
              fill: #d8d8d8;
            }
    
            .cls-2, .cls-9 {
              fill-rule: evenodd;
            }
    
            .cls-3, .cls-4 {
              font-size: 42.667px;
            }
    
            .cls-3, .cls-4, .cls-5, .cls-6, .cls-7, .cls-8 {
              fill: #31c2c2;
              font-family: Helvetica;
              font-weight: 700;
            }
    
            .cls-4, .cls-5, .cls-6, .cls-7, .cls-8 {
              text-anchor: middle;
            }
    
            .cls-5 {
              font-size: 37.333px;
            }
    
            .cls-6 {
              font-size: 26.667px;
            }
    
            .cls-7 {
              font-size: 32px;
            }
    
            .cls-8 {
              font-size: 21.333px;
            }
    
            .cls-9 {
              fill: #d2f5f0;
            }
          </style>
          <image id="image" width="64" height="67" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABDCAYAAAAs/QNwAAADiUlEQVR4nO2bSWgUQRSGv4wjSFBckBgUxeUiaEAdUAKiQVEEBSM5KHrx5iUuBw+Cu5iLoDfx5C4YiSDoLSLEFbxoQA+CiBJyiKLiSZAZF57UQFNUd8/0VHd198wPDZmuru73/vrrvarXnTbygSJwDNgO1OPTizx4Pw94BvyNcIymwP6GsBn4EtH5TBMwCTgL/GnAeTleZzEGzAVuA+tCrjsJjIVc886iXYnAT/Jlw7kVWXMuCEGSfw/05JmATuCRzxweAqYBM/JKwEZgwuDcL6Dfc13uCBDJnwJ+Gxz7AJS063NFQJDk7wLTDX1yQ4Cf5KvHQp9+kQko2LU/MgpqLT8MzEnywcUkH+aDDuAWsMnFw10rYL3akOjOy8LmgiObEkFV8qYo/xFYreZ77DHABTrUXDcFufvATGVTLglYC4z7rOUPa8WMXBEgjh0BKgZDZcfWbeiTCAFJZIHZwE1gi0+7GPo9ATuMiJsAkfygKlv5wZnzgrjSYFXyIyHOO0ccCpgF3AC2GtreAsstPmsZcEBtiXWcCVGX7CgvWrTlP7pVUNMDUkUpYqWhzQ+1BMGRkJpf2PHUluNtKo2ZSlPjKhagAp5NAkYbJGDUxhQQyV8HthnaHgK7ga8WnhMLGg2C3WoUdOeldndcpb7UOi+IqgCR/CHgnOEeZbW5eWzBvtgRhQBZq18Ben3af2bFeUG9BMgu7U7AkjRzqJUAkfxBJfnJWlvZcK4RtKs6wXzDPaovRqow1QetQyR/zyeNSPFyl3buR4ABtaTBBw2mtrrSYFgWEMm/Msx3ifKn1YhMWGa8y/L9AhE0BfYD5w3y/gzsUaOfeZgIkHl1GegztD0BdsYw6s6gT4GSkrzuvMyXAWBDnpwXeAnoV9/MLDZcN+YpYuYKRbWVvOojeRsoeQLbAsP99mq/pyZN8FAN6eJTQH/93bw3DXZZ+Iwl9jS4SHPoG3DJErlL6vxsLXEUtEzwXC1WhtNstE0IAS+BNyrK96gCRtNARn9fMzmsIy2vx52hRUAKbHCKpicgSklM+pzwrOo6tXYpaFxTf5tWfplAb8BKsC/FKzvrBRETTK+hMoumjwEtAlJgg1O0CEiBDU4hOX2K+kbXW/1doxnV7imNr8obCYM5yuuR1gFLUzAIztD0MaBFQApscIoWASmwwSlaBKTABqcoqK84mxUVeW21Aziakn+gShIVYOAfSJwVrmLWVxYAAAAASUVORK5CYII="/>
        </defs>
        <g id="open_event_area" class="${classes.areas} ${classes.open_event_area}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('open_event_area')) })}">
          <rect id="shape1" x="23" y="6" width="295" height="310"/>
        </g>
        <g id="event_hall_a" class="${classes.areas} ${classes.event_hall_a}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('event_hall_a')) })}">
          <path id="形狀_4" data-name="形狀 4" d="M430,7l88,301,44,4,2,19,228,5,2-326Z"/>
        </g>
        <g id="event_hall_b" class="${classes.areas} ${classes.event_hall_b}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('event_hall_b')) })}">
        <path id="形狀_3" data-name="形狀 3" d="M796,10l2,323,271-1,1-23,45-1,3-300Z"/>
        </g>
        <g id="workshop_4" class="${classes.areas} ${classes.workshop_4}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_4')) })}">
          <rect id="shape1-4" data-name="shape1" x="1116" y="138" width="89" height="196"/>
        </g>
        <g id="workshop_5" class="${classes.areas} ${classes.workshop_5}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_5')) })}">
          <rect id="shape1-5" data-name="shape1" x="1116" y="2" width="154" height="136"/>
        </g>
        <g id="workshop_6" class="${classes.areas} ${classes.workshop_6}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_6')) })}">
          <path id="形狀_2" data-name="形狀 2" d="M1273,14l2,190,270,2,1-172-20-1-1-19H1273Z"/>
        </g>
        <g id="workshop_7" class="${classes.areas} ${classes.workshop_7}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_7')) })}">
          <rect id="shape1-7" data-name="shape1" x="1269" y="205" width="280" height="407"/>
        </g>
        <g id="digital_learning_lab" class="${classes.areas} ${classes.digital_learning_lab}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('digital_learning_lab')) })}">
          <rect id="shape1-8" data-name="shape1" x="1274" y="613" width="277" height="212"/>
        </g>
        <g id="workshop_8" class="${classes.areas} ${classes.workshop_8}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_8')) })}">
          <rect id="shape1-9" data-name="shape1" x="1119" y="677" width="154" height="147"/>
        </g>
        <g id="workshop_9" class="${classes.areas} ${classes.workshop_9}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('workshop_9')) })}">
          <rect id="shape1-10" data-name="shape1" x="783" y="678" width="338" height="148"/>
        </g>
        <g id="ar_vr_room" class="${classes.areas} ${classes.ar_vr_room}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('ar_vr_room')) })}">
          <path id="形狀_1" data-name="形狀 1" d="M308,420l1,189H414l3-92H544l-1-99Z"/>
        </g>
        <g id="brainstorming_area" class="${classes.areas} ${classes.brainstorming_area}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('brainstorming_area')) })}">
          <rect id="shape1-12" data-name="shape1" x="3" y="409" width="307" height="115"/>
        </g>
        <g id="meeting_room_1" class="${classes.areas} ${classes.meeting_room_1}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('meeting_room_1')) })}">
          <rect id="shape1-13" data-name="shape1" x="6" y="711" width="113" height="109"/>
        </g>
        <g id="meeting_room_2" class="${classes.areas} ${classes.meeting_room_2}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('meeting_room_2')) })}">
          <rect id="shape1-14" data-name="shape1" x="118" y="709" width="188" height="114"/>
        </g>
        <g id="sound_proof_room" class="${classes.areas} ${classes.sound_proof_room}" style="${styleMap({ fill: interpolateRdYlGn(this._getRatio('sound_proof_room')) })}">
          <path id="形狀_7" data-name="形狀 7" d="M674,519l124-37-2,132H705Z"/>
        </g>
        <rect id="grey10" class="cls-1" x="304" y="610" width="112" height="210"/>
        <rect id="grey9" class="cls-1" x="416" y="516" width="129" height="308"/>
        <rect id="grey8" class="cls-1" x="548" y="680" width="234" height="144"/>
        <path id="grey7" class="cls-2" d="M521.937,310.506l-99.815-1.782,5.1-298.356Z"/>
        <rect id="grey6" class="cls-1" x="320" y="9" width="113" height="305"/>
        <rect id="grey5" class="cls-1" x="1163" y="407" width="106" height="205"/>
        <rect id="grey2" data-name="矩形 1" class="cls-2" x="798" y="408" width="270" height="206"/>
        <path id="grey1" data-name="形狀 6" class="cls-1" d="M678,420l-23,45,16,53,125-37,1-73Z"/>
        <image id="lift" x="447" y="637" width="67" height="67" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABDCAYAAADHyrhzAAACVElEQVR4nO2cvYsTQRiHn8SD86O5QrG4awQbRbBTRNBGxWsEK0ERY2knilXQQrBURBD/APEa/wG5QsROq6goCNFKEUHEEwQvqJE9JvAjZGG/xjPM74Epdpj33Xef7O5kJ2xawBHgBjBLuqwC3UzGM2BfwiJGPG8nfkYos+3/p5b1xzIEyxBiy3gC7AAWge8lYzvAPPBQ+j4CB4BdwPuGa12jBwwjtMfAZtnPfmCl4H6+StwG4AHwAdgp/bcarrkXS8a4iCpCzo8JmZftBeDTNMh4OSbiKLBNtg8Cfwrk+Q2cmSA0E9GP8AFGkXFHCj8BDIBXIqQVLoMiucaFxBIRTcY34BxwKYgY9b8GTgJ3S+bLhFwFToWbZgwRazJaQcbeCadjarzw9wxhpkLMl/Bw9ytaVfWZCTPX1jKZysr4AewBPv/DA6vKduAdsKVofNnLpD8lIgh19ssEVLlMRuwGjtWIH3EvLK5kSwkXGsi3DLypGlxmau1JXKehKW0u5JtrKF+n6rF5NhEsQ7AMwTIEyxAsQ7AMwTIEyxAsQ0hJxiPgcFhpn0hKMq4BT4HLeQNSknEa2AiczRtQ5xF+2rgYWi6+gQqWIaQk4zawCbiSNyAlGUvAT+B+3oCUZFwHDgE38wakNJscDy0X30AFyxAsQ7AMwTIEyxAsQ7AMwTIEyxAsQ7AMwTIEyxAsQ7AMwTIEyxAsQ7AMwTIEyxAsQ7AMoc6PSIPwWmZdhiF+2FC+QdXAOjKWQmuKFXnDYF1oh3c9kifzkJ0Z3RL/rPJ2yqwVrXcV6P4Fuz6EXMbS9KQAAAAASUVORK5CYII="/>
        <image id="male" x="336" y="670" width="48" height="94" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAABeCAYAAABl/JetAAADZUlEQVR4nO2cPWgUQRTH/3OIWkSdxg+IhaCFokWanE0qtRYbSZE0AS2s/ChsdKptRQNCJIiFoKQQQUghBGMjCFpYiB8hIohEIgZkgqJGxZF3eZfP+9idmeTdwfzgYLM37837MXvZj9ldhYjozG0EcJI/hwHs4uyfATwDcI8+1qjfsXqNJqAzdwzATQB7mjT9AOC0NepRjH5LMZLozJ0FMJajeHCbMY4JJngEdOb6ANzxDO+3Rt0N6T9IQGeuE8AEgA7PFN8B7LdGffKtIXQTuhRQPNHBObzxHgGduU0AZgBsCSkAwDcA261Rcz7BISPQHaF4cI5u3+AQgX0BsdFyhQhsC4iNlitEYCYgNlquEIE3AbHRcoUIvAQwHRBfZZpzeeEtYI36B2A4gsAw51pfAeYqgKmA+CnO4U2QgDWKdkK9AH56hFNML+eQEcC8xFMAx2mxSBjFcGwQUQ6n+di+C8CDHM2pTVes84GoZ2SYP0Y6wGdkZQC7eTVt68/5bOxt7D4TkjTchPgkfQeADUI1/gXwpdFFgFUCOnO03Z4DcALA3jUvMR/v+cc/aI1att9ZJqAzd4Z3LJtbpPCV/AJwwRp1o7p+4d+oztxlAEMtXDy4tiGutUJlBHTmjgAYFy2tOEetUY+rI3ClnSpnKjUrnbmDAF61QkUeHKIR6Gm7shfpIYHOVqnGg50ksLXtyl6kFOVoVJIihwizS5ZjXlIJ6iOvwKw1Slf/0JlzhUvLwYo+bB6Jtt+EkoA0SUCaJCBNEpAmCUiTBKRJAtIkAWmSgDQlvumoGV63wgSSp09HAq9zNJwQEMjT5yQJjNIsSJOGMWbki9KsT6p5tGSNok2or8Fk9W0AIwICI9x3LajWPqq98iPmOdsy35j6lbe/F3R/J4ABa9SaXAdqBPc5AOAU1zLHtVGN5eo8s9c8cc4LW+etUYPcnubcruUounA9aT8gTRKQJglIkwSkSQLSJAFpkoA0SUCaJCBNEpAmCUiTBKRJAtIkAWmSgDS+An9ytHF1lkNyrsJXYDJHm3d1lkNyrsJX4FaT7z+ueCJknNeF5KyJr8B1AA/rfPeDX3ixME3Ky/38XS0oF+VcHwFrFD3fRQ+AXlwy9DRZeJ/eUGCNelIjhtbR2wuoTXVummIpBz0YSjmLAeA/FpPWFJyWylQAAAAASUVORK5CYII="/>
        <image id="female" x="695" y="705" width="60" height="94" xlink:href="data:img/png;base64,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"/>
        <image id="wheelchair" x="597" y="687" width="30" height="43" xlink:href="data:img/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAArCAYAAABvhzi8AAACm0lEQVRYhcWXX4hPQRTHP/gtfvugkH8tassmtGyeJGkVD/LOZt/kQVIr7Cpv24aXTUptKUlE4YFS++TvluVlyxZtRGmRpBUPyGr9dLZzub8xM3fude/+vnUe7szc87l3zsw5M2TQcqAPeKbWp22FqhkYAyqGjWlfYRqyQCMbKgra5IFG1hTqbHoK8JKcxqRWQ8AfNxQBFvV7oP1FQdHpHrFARwJD8UfTMsDLwB5gsz4PAOeB7xl8Tb1mZCSWgJXAIuAz8Gsqvnw38D4W349AR8awBWunZ1WfKwouyWY0YR+fKAK8NiCBiB3IG9waCJ4A2msBjuD7agGO7DqwtBbgima0s8DGlNUwFfhFQv8X4DFwJm/wFuAQ8C1h3JOkX69PeZYSp6eA1cAVfbbKBV4BXNBDXE8KcKTXuqXkKNSrKbZKJeNZUt5hzUB1GYCmXgGdQJcmoA36MV/jYKlUF7UI5C2Z8mG1ScWnuqcgqFXRH28CjloG3AaOp/DX4mj/qXF/Z3YMWJZ8t1HmsiaQuN0FGiOH6ywDLlm+en0OYLG3wHxxeMzo+AEstIAlLB9ygk/W7ZtG4y1PDNtzAj+SVb3YcD7sgIouA7t0ofyPyjJ9sw0HEwkOr2m5WwbMC4TLTB2JN5Q0LcbVaH21WhU9f40GglvNBpnqp0bbdmBWoENRG3A/ZveAOSEv7rAEvzMQWq/xrip5lnEHbWOkGLwxOsaBrQnQOo21+dEdoWD0YGY6GNc0ai4+0SrggSM5lNOAJdZ3HHvuE3AVOAmcBh46xsn9aZtjdpxg0QJdaFmTQpcnLF5wBLdNoc/kfLXXAw0Ci+RAsN+4Ebqm9oZeV5P0D9h3u5upe1ritgaYq38nNXVQc/rLAKhIMtffLQrPfwMQ9KEGd8DSNgAAAABJRU5ErkJggg=="/>
        <use id="handrail" x="1185" y="471" xlink:href="#image"/>
        <use id="handrail-2" data-name="handrail" x="360" y="163" xlink:href="#image"/>
        <text id="Event_Hall_A-2" data-name="Event Hall A" class="cls-3" x="520.169" y="183.135">Event Hall A</text>
        <text id="Event_Hall_B-2" data-name="Event Hall B" class="cls-3" x="829.872" y="182.704">Event Hall B</text>
        <text id="Open_Event_Area-2" data-name="Open Event Area" class="cls-4" x="176.503" y="157.85"><tspan x="176.503">Open Event</tspan><tspan x="176.503" dy="51.2">Area</tspan></text>
        <text id="Workshop_6-2" data-name="Workshop 6" class="cls-4" x="1412.77" y="121.399"><tspan x="1412.77">Workshop 6</tspan></text>
        <text id="Workshop_7-2" data-name="Workshop 7" class="cls-4" x="1413.585" y="416.278"><tspan x="1413.585">Workshop 7</tspan></text>
        <text id="Digital_Learning_Lab" data-name="Digital Learning Lab" class="cls-5" x="1411.142" y="708.786"><tspan x="1411.142">Digital</tspan><tspan x="1411.142" dy="44.8">Learning Lab</tspan></text>
        <text id="Multi-Purpose_Room" data-name="Multi-Purpose Room" class="cls-6" x="425.271" y="459.954"><tspan x="425.271">Multi-Purpose</tspan><tspan x="425.271" dy="32">Room</tspan></text>
        <text id="Brainstorming_Area-2" data-name="Brainstorming Area" class="cls-7" x="157.895" y="460.352"><tspan x="157.895">Brainstorming</tspan><tspan x="157.895" dy="38.4">Area</tspan></text>
        <text id="Meeting_Room_1-2" data-name="Meeting Room 1" class="cls-8" x="63.849" y="754.244"><tspan x="63.849">Meeting</tspan><tspan x="63.849" dy="25.6">Room 1</tspan></text>
        <text id="Meeting_Room_2-2" data-name="Meeting Room 2" class="cls-8" x="217.194" y="754.059"><tspan x="217.194">Meeting</tspan><tspan x="217.194" dy="25.6">Room 2</tspan></text>
        <text id="Workshop_9-2" data-name="Workshop 9" class="cls-8" x="961.897" y="749.873"><tspan x="961.897">Workshop 9</tspan></text>
        <text id="Workshop_8-2" data-name="Workshop 8" class="cls-8" x="1195.879" y="750.43"><tspan x="1195.879">Workshop 8</tspan></text>
        <text id="Workshop_5-2" data-name="Workshop 5" class="cls-8" x="1193.506" y="79.425"><tspan x="1193.506">Workshop 5</tspan></text>
        <text id="Workshop_4-2" data-name="Workshop 4" class="cls-8" transform="matrix(0, -1, 1, 0, 1166.898, 239.159)"><tspan x="0">Workshop 4</tspan></text>
        <text id="Sound_Proof_Room-2" data-name="Sound Proof Room" class="cls-8" x="744.434" y="539.073"><tspan x="744.434">Sound</tspan><tspan x="744.434" dy="25.6">Proof</tspan><tspan x="744.434" dy="25.6">Room</tspan></text>
        <path id="border46" class="cls-9" d="M19,5H34V323H19V5Z"/>
        <path id="border45" class="cls-9" d="M30,308v15H0V308H30Z"/>
        <path id="border44" class="cls-9" d="M421.805,7.116L436.2,2.884l90,306-14.39,4.232Z"/>
        <path id="border43" class="cls-9" d="M789,407h15V614H789V407Z"/>
        <path id="border42" class="cls-9" d="M789,415V400h285v15H789Z"/>
        <path id="border41" class="cls-9" d="M1059,408h15V620h-15V408Z"/>
        <path id="border40" class="cls-9" d="M1067,605v15H698V605h369Z"/>
        <path id="border39" class="cls-9" d="M713.083,614.534l-14.166,4.932-55-158,14.166-4.932Z"/>
        <path id="border38" class="cls-9" d="M656.488,469.763l-12.976-7.526,29-50,12.976,7.526Z"/>
        <path id="border37" class="cls-9" d="M674.449,427.359l-2.9-14.718,66-13,2.9,14.718Z"/>
        <path id="border36" class="cls-9" d="M0,316H15V825H0V316Z"/>
        <path id="border35" class="cls-9" d="M0,831V816H1557v15H0Z"/>
        <path id="border34" class="cls-9" d="M1557,826h-15V28h15V826Z"/>
        <path id="border33" class="cls-9" d="M1518,40V25h39V40h-39Z"/>
        <path id="border32" class="cls-9" d="M1533,40h-15V0h15V40Z"/>
        <path id="border31" class="cls-9" d="M1533,0V15H19V0H1533Z"/>
        <path id="border30" class="cls-9" d="M8,717V702H307v15H8Z"/>
        <path id="border29" class="cls-9" d="M112,710h15V828H112V710Z"/>
        <path id="border28" class="cls-9" d="M314,825H299V409h15V825Z"/>
        <path id="border27" class="cls-9" d="M409,508h15V826H409V508Z"/>
        <path id="border26" class="cls-9" d="M308,617V602H418v15H308Z"/>
        <path id="border25" class="cls-9" d="M417,523V508H548v15H417Z"/>
        <path id="border24" class="cls-9" d="M552,825H537V409h15V825Z"/>
        <path id="border23" class="cls-9" d="M307,424V409H546v15H307Z"/>
        <path id="border22" class="cls-9" d="M546,686V671h730v15H546Z"/>
        <path id="border21" class="cls-9" d="M546,746V731H670v15H546Z"/>
        <path id="border20" class="cls-9" d="M661,678h15v68H661V678Z"/>
        <path id="border19" class="cls-9" d="M776,678h15V825H776V678Z"/>
        <path id="border18" class="cls-9" d="M1113,679h15V825h-15V679Z"/>
        <path id="border17" class="cls-9" d="M1278,824h-15V6h15V824Z"/>
        <path id="border16" class="cls-9" d="M1164,620V605h388v15H1164Z"/>
        <path id="border15" class="cls-9" d="M1156,406h15V620h-15V406Z"/>
        <path id="border14" class="cls-9" d="M1156,415V400h122v15H1156Z"/>
        <path id="border13" class="cls-9" d="M1271,215V200h282v15H1271Z"/>
        <path id="border12" class="cls-9" d="M1110,6h15V341h-15V6Z"/>
        <path id="border11" class="cls-9" d="M1118,341V326h92v15h-92Z"/>
        <path id="border10" class="cls-9" d="M1210,335h-15V133h15V335Z"/>
        <path id="border9" class="cls-9" d="M1118,148V133h154v15H1118Z"/>
        <path id="border8" class="cls-9" d="M1118,300v15h-58V300h58Z"/>
        <path id="border7" class="cls-9" d="M1068,326v15H555V326h513Z"/>
        <path id="border6" class="cls-9" d="M1060,306h15v35h-15V306Z"/>
        <path id="border5" class="cls-9" d="M787,5h15V336H787V5Z"/>
        <path id="border4" class="cls-9" d="M555,307h15v30H555V307Z"/>
        <path id="border3" class="cls-9" d="M570,301v15H309V301H570Z"/>
        <path id="border2" class="cls-9" d="M324,313H309V4h15V313Z"/>
        <path id="border1" class="cls-9" d="M798,400v15H737V400h61Z"/>
        <path id="border47" data-name="形狀 5" class="cls-9" d="M673.06,524.211l-4.12-14.422,126-36,4.12,14.422Z"/>
      </svg>
    `;
  }
}
