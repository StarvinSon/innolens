import { HierarchyNode, stratify } from 'd3-hierarchy';
import { subDays, startOfWeek, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import {
  LitElement, TemplateResult, html,
  customElement, PropertyValues, property
} from 'lit-element';

import '../chart-card';
import '../choice-chip';
import '../choice-chips';
import '../line-chart'; // eslint-disable-line import/no-duplicates
import '../member-cluster-dendrogram';
import { generateKey } from '../../services/key';
import { MemberClusterService, MemberClusterResult } from '../../services/member-cluster';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { LineChartData, LineChartLineData } from '../line-chart'; // eslint-disable-line import/no-duplicates

import { css, classes } from './member-clusters-page.scss';


interface MemberClusterResultWithHierarchicalNode extends MemberClusterResult {
  readonly rootHierarchicalNode: HierarchyNode<MemberClusterResult['clusters'][number]>;
}


interface FlatMemberClusterResult extends MemberClusterResultWithHierarchicalNode {
  readonly flatClusters: ReadonlyArray<{
    readonly memberIds: ReadonlyArray<string>;
  }>;
}


const pastDaysChoices: ReadonlyArray<number> = [
  1,
  2,
  3,
  7,
  14,
  30,
  60,
  90,
  180,
  360
];


const TAG_NAME = 'inno-member-clusters-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MemberClustersPage;
  }
}

@customElement(TAG_NAME)
export class MemberClustersPage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(MemberClusterService)
  @observeProperty('_onServiceInjected')
  public memberClusterService: MemberClusterService | null;


  @property({ attribute: false })
  private _selectedPastDays = 14;

  @property({ attribute: false })
  private _fromTime: Date | null = null;

  @property({ attribute: false })
  private _toTime: Date | null = null;

  @property({ attribute: false })
  private _timeStepMS = 30 * 60 * 1000; // 30mins

  @property({ attribute: false })
  private _distanceThreshold: number | null = null;

  @property({ attribute: false })
  private _selectedFeature: string | null = null;


  private _clusterResultKey: string | null = null;

  @property({ attribute: false })
  private _clusterResult: MemberClusterResultWithHierarchicalNode | null = null;


  private _flatClustersDeps: readonly [
    MemberClusterResultWithHierarchicalNode | null,
    number | null
  ] = [null, null];

  private _flatClusterResult: FlatMemberClusterResult | null = null;


  private _clusterLineChartDatasDeps: readonly [
    FlatMemberClusterResult | null,
    string | null
  ] = [null, null];

  private _clusterLineChartDatas: ReadonlyArray<{
    readonly lineChartData: LineChartData<Date>;
  }> | null = null;


  public constructor() {
    super();
    this.memberClusterService = null;
    this._formatLineChartLabel = this._formatLineChartLabel.bind(this);
  }


  private _onServiceInjected(): void {
    this.requestUpdate();
  }


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.memberClusterService === null) return;

    if (this._toTime === null) {
      let toTime = new Date();
      toTime = utcToZonedTime(toTime, 'Asia/Hong_Kong');
      toTime = startOfWeek(toTime);
      toTime = zonedTimeToUtc(toTime, 'Asia/Hong_Kong');
      this._toTime = toTime;
    }
    if (this._toTime !== null) {
      const fromTime = subDays(this._toTime, this._selectedPastDays);
      if (this._fromTime === null || this._fromTime.getTime() !== fromTime.getTime()) {
        this._fromTime = fromTime;
      }
    }

    const clusterResultKey = generateKey({
      fromTime: this._fromTime?.toISOString(),
      toTime: this._toTime?.toISOString(),
      timeStepMs: String(this._timeStepMS)
    });
    if (this._clusterResultKey !== clusterResultKey) {
      if (
        this._fromTime === null
        || this._toTime === null
      ) {
        this._clusterResult = null;
      } else {
        this.memberClusterService
          .fetchMemberCluster({
            fromTime: this._fromTime,
            toTime: this._toTime,
            timeStepMs: this._timeStepMS
          })
          .then((data) => {
            if (this._clusterResultKey === clusterResultKey) {
              const rootNode = stratify<MemberClusterResultWithHierarchicalNode['clusters'][number]>()
                .id((c) => String(c.clusterId))
                .parentId((c, i, clusters) => clusters.find((pc) =>
                  pc.childClusterIds.includes(c.clusterId))?.clusterId.toString())
                .call(undefined, data.clusters.slice());

              this._clusterResult = {
                ...data,
                rootHierarchicalNode: rootNode
              };
            }
          })
          .catch((err) => {
            if (this._clusterResultKey === clusterResultKey) {
              this._clusterResultKey = null;
            }
            console.error(err);
          });
      }
      this._clusterResultKey = clusterResultKey;
    }

    if (
      this._flatClustersDeps[0] !== this._clusterResult
      || this._flatClustersDeps[1] !== this._distanceThreshold
    ) {
      if (this._clusterResult === null || this._distanceThreshold === null) {
        this._flatClusterResult = null;
      } else {
        const findClusters = (
          node: HierarchyNode<MemberClusterResult['clusters'][number]>
        ): ReadonlyArray<FlatMemberClusterResult['flatClusters'][number]> => {
          if (node.data.distance <= this._distanceThreshold!) {
            const memberIds = node.leaves().flatMap((leaf) => leaf.data.memberId ?? []);
            return [{
              memberIds
            }];
          }
          if (node.children === undefined) {
            return [];
          }
          return node.children.flatMap(findClusters);
        };

        this._flatClusterResult = {
          ...this._clusterResult,
          flatClusters: findClusters(this._clusterResult.rootHierarchicalNode)
        };
      }
      this._flatClustersDeps = [this._clusterResult, this._distanceThreshold];
    }

    if (
      this._clusterLineChartDatasDeps[0] !== this._flatClusterResult
      || this._clusterLineChartDatasDeps[1] !== this._selectedFeature
    ) {
      if (this._flatClusterResult === null || this._selectedFeature === null) {
        this._clusterLineChartDatas = null;
      } else {
        this._clusterLineChartDatas = this._flatClusterResult.flatClusters.map((cluster, i) => {
          const lines = cluster.memberIds.map((memberId): LineChartLineData => {
            const values = this._flatClusterResult!.values[memberId][this._selectedFeature!];
            return {
              name: `Member ${i}`,
              values
            };
          });
          return {
            lineChartData: {
              lines,
              labels: this._flatClusterResult!.timeSpans.map((ts) => ts[1])
            }
          };
        });
      }
      this._clusterLineChartDatasDeps = [this._flatClusterResult, this._selectedFeature];
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this._renderOptions()}
      ${this._renderCharts()}
    `;
  }

  private _renderOptions(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.options}">

        ${this._renderChipOptions({
          title: 'Past Days',
          items: pastDaysChoices,
          selectItem: (item) => item === this._selectedPastDays,
          formatItem: (item) => html`${item} Days`,
          onClick: (item) => this._onPastDaysChipClick(item)
        })}

        ${this._renderChipOptions({
          title: 'Features',
          items: this._clusterResult?.features ?? [],
          selectItem: (feature) => feature === this._selectedFeature,
          onClick: (feature) => this._onFeatureChipClick(feature)
        })}

      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderChipOptions<T>(options: {
    readonly title: unknown,
    readonly items: ReadonlyArray<T>,
    readonly selectItem: (item: T) => boolean,
    readonly formatItem?: (item: T) => unknown,
    readonly onClick: (item: T) => void
  }): TemplateResult {
    return html`
      <div class="${classes.option}">
        <div class="${classes.option_label}">${options.title}</div>
        <inno-choice-chips
          class="${classes.option_chips}"
        >
          ${options.items.map((item) => html`
            <inno-choice-chip
              .selected="${options.selectItem(item)}"
              @click="${() => options.onClick(item)}">
              ${options.formatItem === undefined ? item : options.formatItem(item)}
            </inno-choice-chip>
          `)}
        </inno-choice-chips>
      </div>
    `;
  }

  private _renderCharts(): TemplateResult {
    return html`
      <div class="${classes.charts}">
        ${this._renderDendrogram()}
        ${this._renderClusterFeatureCharts()}
      </div>
    `;
  }

  private _renderDendrogram(): TemplateResult {
    return html`
      <inno-chart-card class="${classes.dendrogramCard}">
        <inno-member-clusters-dendrogram
          class="${classes.dendrogram}"
          .rootNode="${this._clusterResult?.rootHierarchicalNode ?? null}"
          .markDistance="${this._distanceThreshold}"
          @handle-moved="${this._onDendrogramHandleMoved}"
        >
          <span slot="title">Dendrogram</span>
        </inno-member-clusters-dendrogram>
      </inno-chart-card>
    `;
  }

  private _renderClusterFeatureCharts(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      ${this._clusterLineChartDatas === null
        ? []
        : this._clusterLineChartDatas.map((clusterLineChartData, i) => html`
          <inno-chart-card>
            <inno-line-chart
              class="${classes.featureChart}"
              .data="${clusterLineChartData.lineChartData}"
              .formatLabel="${this._formatLineChartLabel}"
              no-legend
            >
              <span slot="title">Cluster ${i + 1} (${clusterLineChartData.lineChartData.lines.length} members)</span>
            </inno-line-chart>
          </inno-chart-card>
        `)}
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _formatLineChartLabel(date: Date): string {
    return format(date, 'd/M');
  }


  private _onPastDaysChipClick(day: number): void {
    this._selectedPastDays = day;
  }

  private _onFeatureChipClick(feature: string): void {
    this._selectedFeature = feature;
  }

  private _onDendrogramHandleMoved(event: import('../member-cluster-dendrogram').HandleMovedEvent): void {
    this._distanceThreshold = event.distance;
  }
}
