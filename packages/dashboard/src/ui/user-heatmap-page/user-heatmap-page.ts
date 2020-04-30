import {
  customElement, LitElement, TemplateResult,
  html, property, PropertyValues
} from 'lit-element';

import { SpaceService, Space } from '../../services/space';
import '../heatmap'; // eslint-disable-line import/no-duplicates
import { HeatmapData } from '../heatmap'; // eslint-disable-line import/no-duplicates

import { css, classes } from './user-heatmap-page.scss';


const TAG_NAME = 'inno-user-heatmap-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserHeatMapPage;
  }
}

@customElement(TAG_NAME)
export class UserHeatMapPage extends LitElement {
  public static readonly styles = css;


  @property({ type: String })
  public floor: import('../heatmap').HeatmapSpaceFloor = 'gf';

  @property({ attribute: false })
  public spaceService: SpaceService | null = null;

  @property({ attribute: false })
  public spaces: ReadonlyArray<Space> | null = null;

  @property({ attribute: false })
  private _heatmapData: HeatmapData | null = null;

  private _heatmapDataFetched = false;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.spaceService === null) return;

    if (!this._heatmapDataFetched && this.spaces !== null) {
      const time = new Date();
      this.spaceService!
        .fetchMemberCountLegacy(
          time,
          this.spaces!.map((space) => space.spaceId),
          'total',
          'space'
        )
        .then((result) => {
          this._heatmapData = {
            spaces: result.groups.map((group, i) => ({
              spaceId: group,
              spaceCapacity: this.spaces![i].spaceCapacity,
              currentUserCount: result.counts[group] ?? 0
            }))
          };

          this._heatmapDataFetched = true;
        });
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">User density at ${this.floor === 'gf' ? 'G/F' : 'LG/F'}</h4>
        <inno-heatmap .floor="${this.floor}" .data=${this._heatmapData}></inno-heatmap>
      </div>
    `;
  }
}
