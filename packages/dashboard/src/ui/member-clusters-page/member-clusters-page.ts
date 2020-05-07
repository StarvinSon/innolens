import { HierarchyNode, stratify } from 'd3-hierarchy';
import { subDays, startOfWeek, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import {
  LitElement, TemplateResult, html,
  customElement, PropertyValues, property
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../chart-card';
import '../choice-chip';
import '../choice-chips';
import '../line-chart-2';
import '../member-cluster-dendrogram';
import '../pie-chart'; // eslint-disable-line import/no-duplicates
import { Member, MemberService } from '../../services/member';
import { MemberClusterService, MemberClustersResult } from '../../services/member-cluster';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { PieChartData } from '../pie-chart'; // eslint-disable-line import/no-duplicates

import { css, classes } from './member-clusters-page.scss';


interface ExtendedMemberClusterResult extends MemberClustersResult {
  readonly members: Readonly<Record<string, Member>>;
  readonly rootHierarchicalNode: HierarchyNode<MemberClustersResult['clusters'][number]>;
}


interface FlatMemberClusterResult extends ExtendedMemberClusterResult {
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


type ChartType =
  'department'
  | 'typeOfStudy'
  | 'yearOfStudy'
  | 'studyProgramme'
  | 'affiliatedStudentInterestGroup'
  | 'access';

const chartTypeChoices: ReadonlyArray<{
  readonly type: ChartType;
  readonly name: string;
}> = [
  {
    type: 'department',
    name: 'Department'
  },
  {
    type: 'typeOfStudy',
    name: 'Type of Study'
  },
  {
    type: 'yearOfStudy',
    name: 'Year of Study'
  },
  {
    type: 'studyProgramme',
    name: 'Study Programme'
  },
  {
    type: 'affiliatedStudentInterestGroup',
    name: 'Affiliated Student Interest Group'
  },
  {
    type: 'access',
    name: 'Access'
  }
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

  @injectableProperty(MemberService)
  @observeProperty('_onServiceInjected')
  public memberService: MemberService | null;


  @property({ attribute: false })
  private _selectedPastDays = 14;

  @property({ attribute: false })
  private _distanceThreshold: number | null = null;

  @property({ attribute: false })
  private _selectedChartType: ChartType = 'department';

  @property({ attribute: false })
  private _selectedAccessFeature: string | null = null;


  @property({ attribute: false })
  private _fromTime: Date | null = null;

  @property({ attribute: false })
  private _toTime: Date | null = null;

  @property({ attribute: false })
  private _timeStepMS = 30 * 60 * 1000; // 30mins


  private _clusterResultKey: string | null = null;

  @property({ attribute: false })
  private _clusterResult: ExtendedMemberClusterResult | null = null;


  private _flatClustersDeps: readonly [
    ExtendedMemberClusterResult | null,
    number | null
  ] = [null, null];

  @property({ attribute: false })
  private _flatClusterResult: FlatMemberClusterResult | null = null;


  private _clustersChartPropsDeps: readonly [
    FlatMemberClusterResult | null,
    ChartType | null,
    string | null // selected feature, only applicable to chartType=access
  ] = [null, null, null];

  private _clustersChartProps: ReadonlyArray<{
    readonly type: Exclude<ChartType, 'access'>;
    readonly name: string;
    readonly size: number;
    readonly data: PieChartData;
  } | {
    readonly type: 'access';
    readonly name: string;
    readonly size: number;
    readonly ys: ReadonlyArray<ReadonlyArray<number>>;
    readonly xLabels: ReadonlyArray<Date>;
  }> | null = null;


  public constructor() {
    super();
    this._formatLineChartLabel = this._formatLineChartLabel.bind(this);
    this.memberClusterService = null;
    this.memberService = null;
  }


  private _onServiceInjected(): void {
    this.requestUpdate();
  }


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this.memberClusterService === null || this.memberService === null) return;

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
          .then(async (data) => {
            const memberIds = data.clusters
              .map((c) => c.memberId)
              .filter((id): id is Exclude<typeof id, null> => id !== null);
            const members = await this.memberService!.fetchMembers({ memberIds });
            return {
              ...data,
              members: Object.fromEntries(members.map((m) => [m.memberId, m]))
            };
          })
          .then((data) => {
            if (this._clusterResultKey === clusterResultKey) {
              const rootNode = stratify<ExtendedMemberClusterResult['clusters'][number]>()
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

    if (this._flatClusterResult === null) {
      this._selectedAccessFeature = null;
    } else if (
      this._selectedChartType === 'access'
      && (
        this._selectedAccessFeature === null
        || (
          this._selectedAccessFeature !== null
          && !this._flatClusterResult.features.includes(this._selectedAccessFeature)
        )
      )
    ) {
      this._selectedAccessFeature = this._flatClusterResult.features[0] ?? null;
    }

    if (
      this._clustersChartPropsDeps[0] !== this._flatClusterResult
      || this._clustersChartPropsDeps[1] !== this._selectedChartType
      || this._clustersChartPropsDeps[2] !== this._selectedAccessFeature
    ) {
      if (
        this._flatClusterResult === null
        || (this._selectedChartType === 'access' && this._selectedAccessFeature === null)
      ) {
        this._clustersChartProps = null;
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

        this._clustersChartProps = allClusters.map(([clusterName, clusterMemberIds]) => {
          if (this._selectedChartType !== 'access') {
            const groups = new Map<string, number>();
            for (const memberId of clusterMemberIds) {
              const group = this._flatClusterResult!.members[memberId][this._selectedChartType];
              groups.set(group, (groups.get(group) ?? 0) + 1);
            }
            return {
              type: this._selectedChartType,
              name: clusterName,
              size: clusterMemberIds.length,
              data: {
                pies: Array.from(groups).map(([group, count]) => ({
                  name: group,
                  value: count
                }))
              }
            };
          }
          return {
            type: this._selectedChartType,
            name: clusterName,
            size: clusterMemberIds.length,
            ys: clusterMemberIds.map((memberId) => {
              const memberIdx = this._flatClusterResult!.memberIds.indexOf(memberId);
              const featureIdx = this._flatClusterResult!.features.indexOf(this._selectedAccessFeature!); // eslint-disable-line max-len
              return this._flatClusterResult!.values[memberIdx][featureIdx];
            }),
            xLabels: this._flatClusterResult!.timeSpans.map(([, endTime]) => endTime)
          };
        });
      }
      this._clustersChartPropsDeps = [
        this._flatClusterResult,
        this._selectedChartType,
        this._selectedAccessFeature
      ];
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
          title: 'Chart Type',
          items: chartTypeChoices,
          selectItem: (item) => item.type === this._selectedChartType,
          formatItem: (item) => item.name,
          onClick: (item) => this._onChartTypeChipClick(item.type)
        })}

        ${this._renderChipOptions({
          title: 'Access Features',
          items: this._clusterResult?.features ?? [],
          selectItem: (item) => item === this._selectedAccessFeature,
          onClick: (item) => this._onAccessFeatureChipClick(item),
          hide: this._selectedChartType !== 'access'
        })}

      </div>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }

  private _renderChipOptions<T>(options: {
    readonly title: unknown;
    readonly items: ReadonlyArray<T>;
    readonly selectItem: (item: T) => boolean;
    readonly formatItem?: (item: T) => unknown;
    readonly onClick: (item: T) => void;
    readonly hide?: boolean;
  }): TemplateResult {
    return html`
      <div class="${classMap({ [classes.option]: true, [classes.option_$hide]: options.hide ?? false })}">
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
        ${this._renderClusterCharts()}
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

  private _renderClusterCharts(): TemplateResult {
    /* eslint-disable @typescript-eslint/indent */
    return html`
      <div class="${classes.clusterCharts}">
        ${this._clustersChartProps === null
          ? []
          : this._clustersChartProps.map((clusterChartProps) => html`
            <inno-chart-card>
              ${clusterChartProps.type !== 'access'
                ? html`
                  <inno-pie-chart
                    class="${classes.clusterPieChart}"
                    .data="${clusterChartProps.data}"
                  >
                    <span slot="title">${clusterChartProps.name} (${clusterChartProps.size} members)</span>
                  </inno-pie-chart>
                `
                : html`
                  <inno-line-chart-2
                    class="${classes.clusterLineChart}"
                    .ys="${clusterChartProps.ys}"
                    .xLabels="${clusterChartProps.xLabels}"
                    .formatXLabel="${this._formatLineChartLabel}"
                  >
                    <span slot="title">${clusterChartProps.name} (${clusterChartProps.size} members)</span>
                  </inno-line-chart-2>
                `}
            </inno-chart-card>
          `)}
      </div>
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

  private _onChartTypeChipClick(type: ChartType): void {
    this._selectedChartType = type;
  }

  private _onAccessFeatureChipClick(feature: string): void {
    this._selectedAccessFeature = feature;
  }

  private _onDendrogramHandleMoved(event: import('../member-cluster-dendrogram').HandleMovedEvent): void {
    this._distanceThreshold = event.distance;
  }
}
