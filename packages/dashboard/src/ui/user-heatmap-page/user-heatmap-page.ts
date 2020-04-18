import {
  customElement, LitElement, TemplateResult,
  html,
  property,
  PropertyValues
} from 'lit-element';

import {
  SpaceService, Space,
  SpaceMemberCountHistoryGroupByValues, SpaceMemberCountHistory
} from '../../services/space';
import '../heatmap'; // eslint-disable-line import/no-duplicates
import { HeatmapData } from '../heatmap'; // eslint-disable-line import/no-duplicates

import { css, classes } from './user-heatmap-page.scss';

// import {
//   MemberService, MemberCountFilter, MemberCountHistory,
//   MemberCountHistoryCategory, MemberCountHistoryRange
// } from '../../services/member';

const spaceMemberCountTypes = [
  'enterCounts',
  'uniqueEnterCounts',
  'exitCounts',
  'uniqueExitCounts',
  'stayCounts',
  'uniqueStayCounts'
] as const;

type SpaceMemberCountType = (typeof spaceMemberCountTypes)[number];


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

  @property({ attribute: false })
  private _selectedGroupBy: SpaceMemberCountHistoryGroupByValues = 'department';

  @property({ attribute: false })
  private _selectedPastDays = 1;

  @property({ attribute: false })
  private _countHistory: { [spaceId: string]: SpaceMemberCountHistory | null } = {};

  @property({ attribute: false })
  private _heatmapData: HeatmapData | null = null;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.spaceService === null) return;

    this._spaces = this.spaceService.spaces;
    if (this._spaces === null) {
      this.spaceService.updateSpaces().then(() => this.requestUpdate());
      return;
    }

    for (const space of this._spaces) {
      if (this._countHistory[space.spaceId] === undefined) {
        this.spaceService
          .updateSpaceMemberCountHistory(
            space.spaceId,
            this._selectedGroupBy,
            this._selectedPastDays * 24
          )
          .then((result) => {
            this._countHistory[space.spaceId] = result;
            this.requestUpdate();
          });
        return;
      }
    }
  }

  private _convertData(): void {
    const heatmapData: Array<{ spaceId: string; value: number }> = [];
    for (const [space, records] of Object.entries(this._countHistory)) {
      if (space !== 'inno_wing' && records !== null) {
        const latest = records.records[records.records.length - 1];
        let stayCounts = 0;
        let exitCounts = 0;
        for (const group of records.groups) {
          stayCounts += latest.uniqueStayCounts[group];
        }
        for (const group of records.groups) {
          exitCounts += latest.uniqueExitCounts[group];
        }
        heatmapData.push({ spaceId: space, value: stayCounts - exitCounts });
      }
    }
    this._heatmapData = { spaces: heatmapData };
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">User density at ${this.floor === 'gf' ? 'G/F' : 'LG/F'}</h4>
        <inno-heatmap floor="${this.floor}" .data=${this._heatmapData}></inno-heatmap>
      </div>
    `;
  }
}
