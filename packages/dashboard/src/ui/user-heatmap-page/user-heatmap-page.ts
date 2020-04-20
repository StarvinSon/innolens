import {
  customElement, LitElement, TemplateResult,
  html, property, PropertyValues
} from 'lit-element';

import { SpaceService, Space } from '../../services/space';
import '../heatmap'; // eslint-disable-line import/no-duplicates
import { HeatmapData, HeatmapSpaceData } from '../heatmap'; // eslint-disable-line import/no-duplicates

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
  private _spaces: ReadonlyArray<Space> | null = null;

  // @property({ attribute: false })
  // private _selectedGroupBy: SpaceCountHistoryGroupBy = 'department';

  // @property({ attribute: false })
  // private _selectedPastDays = 1;

  // @property({ attribute: false })
  // private _countHistory: { readonly [spaceId: string]: SpaceCount } = {};

  @property({ attribute: false })
  private _heatmapData: HeatmapData | null = null;


  private _spaceFetched = false;

  private _heatmapDataFetched = false;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.spaceService === null) return;

    if (!this._spaceFetched) {
      this.spaceService
        .fetchSpaces()
        .then((data) => {
          this._spaces = data;
        });
      this._spaceFetched = true;
    }

    if (!this._heatmapDataFetched && this._spaces !== null) {
      const time = new Date();
      const spaceCountPromises = this._spaces
        .filter((space) => space.spaceId !== 'inno_wing')
        .map(
          async (space): Promise<HeatmapSpaceData> => {
            const countData = await this.spaceService!.fetchCount(
              time,
              [space.spaceId],
              'uniqueMember',
              null
            );
            return {
              spaceId: space.spaceId,
              value: countData.counts[countData.groups[0]]
            };
          }
        );
      Promise.all(spaceCountPromises).then((spaceData) => {
        this._heatmapData = {
          spaces: spaceData
        };
      });
      this._heatmapDataFetched = true;
    }
  }

  // private _convertData(): void {
  //   const heatmapData: Array<{ spaceId: string; value: number }> = [];
  //   for (const [space, records] of Object.entries(this._countHistory)) {
  //     if (space !== 'inno_wing' && records !== null) {
  //       const latest = records.counts;
  //       let stayCounts = 0;
  //       let exitCounts = 0;
  //       for (const group of records.groups) {
  //         stayCounts += latest[group];
  //       }
  //       for (const group of records.groups) {
  //         exitCounts += latest.uniqueExitCounts[group];
  //       }
  //       heatmapData.push({ spaceId: space, value: stayCounts - exitCounts });
  //     }
  //   }
  //   this._heatmapData = { spaces: heatmapData };
  // }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">User density at ${this.floor === 'gf' ? 'G/F' : 'LG/F'}</h4>
        <inno-heatmap .floor="${this.floor}" .data=${this._heatmapData}></inno-heatmap>
      </div>
    `;
  }
}
