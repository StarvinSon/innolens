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
import '../line-chart-2';
import '../member-cluster-dendrogram';
import { MemberClusterService, MemberClustersResult } from '../../services/member-cluster';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';

import { css, classes } from './member-clusters-page.scss';


interface MemberClusterResultWithHierarchicalNode extends MemberClustersResult {
  readonly rootHierarchicalNode: HierarchyNode<MemberClustersResult['clusters'][number]>;
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
  public memberClusterService: MemberClusterService | null = null;


  @property({ attribute: false })
  private _selectedPastDays = 14;

  @property({ attribute: false })
  private _distanceThreshold: number | null = null;

  @property({ attribute: false })
  private _selectedFeature: string | null = null;


  @property({ attribute: false })
  private _fromTime: Date | null = null;

  @property({ attribute: false })
  private _toTime: Date | null = null;

  @property({ attribute: false })
  private _timeStepMS = 30 * 60 * 1000; // 30mins


  private _clusterResultKey: string | null = null;

  @property({ attribute: false })
  private _clusterResult: MemberClusterResultWithHierarchicalNode | null = null;


  private _flatClustersDeps: readonly [
    MemberClusterResultWithHierarchicalNode | null,
    number | null
  ] = [null, null];

  @property({ attribute: false })
  private _flatClusterResult: FlatMemberClusterResult | null = null;


  private _clusterLineChartPropsDeps: readonly [
    FlatMemberClusterResult | null,
    string | null
  ] = [null, null];

  private _clusterLineChartProps: ReadonlyArray<{
    readonly name: string;
    readonly ys: ReadonlyArray<ReadonlyArray<number>>;
    readonly xLabels: ReadonlyArray<Date>;
  }> | null = null;


  public constructor() {
    super();
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

    const clusterResultKey = JSON.stringify({
      fromTime: this._fromTime,
      toTime: this._toTime,
      timeStepMs: this._timeStepMS,
      filterMemberIds: null,
      filterSpaceIds: null
    });
    if (this._clusterResultKey !== clusterResultKey) {
      if (this._fromTime === null || this._toTime === null) {
        this._clusterResult = null;
      } else {
        this.memberClusterService
          .fetchMemberClusters({
            fromTime: this._fromTime,
            toTime: this._toTime,
            timeStepMs: this._timeStepMS,
            filterMemberIds: null,
            filterSpaceIds: null
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
            console.error(err);
            if (this._clusterResultKey === clusterResultKey) {
              this._clusterResult = null;
            }
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
          node: HierarchyNode<MemberClustersResult['clusters'][number]>
        ): ReadonlyArray<FlatMemberClusterResult['flatClusters'][number]> => {
          if (node.data.distance <= this._distanceThreshold!) {
            const memberIds = node.leaves().map((leaf) => leaf.data.memberId!);
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
      this._clusterLineChartPropsDeps[0] !== this._flatClusterResult
      || this._clusterLineChartPropsDeps[1] !== this._selectedFeature
    ) {
      if (this._flatClusterResult === null || this._selectedFeature === null) {
        this._clusterLineChartProps = null;
      } else {
        const outlierMemberIds: Array<string> = [];
        const allClusters: Array<readonly [string, ReadonlyArray<string>]> = [];
        for (const flatCluster of this._flatClusterResult.flatClusters) {
          if (flatCluster.memberIds.length < 2) {
            outlierMemberIds.push(...flatCluster.memberIds);
          } else {
            allClusters.push([
              `Cluster ${allClusters.length + 1}`,
              flatCluster.memberIds
            ]);
          }
        }
        if (outlierMemberIds.length > 0) {
          allClusters.push([
            'Outliers',
            outlierMemberIds
          ]);
        }

        this._clusterLineChartProps = allClusters.map(([clusterName, clusterMemberIds]) => ({
          name: clusterName,
          ys: clusterMemberIds.map((memberId) => {
            const memberIdx = this._flatClusterResult!.memberIds.indexOf(memberId);
            const featureIdx = this._flatClusterResult!.features.indexOf(this._selectedFeature!);
            return this._flatClusterResult!.values[memberIdx][featureIdx];
          }),
          xLabels: this._flatClusterResult!.timeSpans.map(([, endTime]) => endTime)
        }));
      }
      this._clusterLineChartPropsDeps = [this._flatClusterResult, this._selectedFeature];
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
      ${this._clusterLineChartProps === null
        ? []
        : this._clusterLineChartProps.map((chartProps) => html`
          <inno-chart-card>
            <inno-line-chart-2
              class="${classes.featureChart}"
              .ys="${chartProps.ys}"
              .xLabels="${chartProps.xLabels}"
              .formatXLabel="${this._formatLineChartLabel}"
            >
              <span slot="title">${chartProps.name} (${chartProps.ys.length} members)</span>
            </inno-line-chart-2>
          </inno-chart-card>
        `)}
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _formatLineChartLabel(date: Date, i: number): string {
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
