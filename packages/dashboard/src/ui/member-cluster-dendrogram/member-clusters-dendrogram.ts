import {
  cluster as d3Cluster,
  HierarchyPointNode,
  HierarchyNode
} from 'd3-hierarchy';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import {
  LitElement, TemplateResult, html,
  customElement, PropertyValues, property, query
} from 'lit-element';
import { nothing, svg } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map';

import { MemberClustersResult } from '../../services/member-cluster';

import { css, classes } from './member-clusters-dendrogram.scss';


export class HandleMovedEvent extends Event {
  public readonly distance: number;

  public constructor(distancee: number) {
    super('handle-moved');
    this.distance = distancee;
  }
}


const TAG_NAME = 'inno-member-clusters-dendrogram';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MemberClustersDendrogram;
  }
}

/**
 * @fires handle-moved
 */
@customElement(TAG_NAME)
export class MemberClustersDendrogram extends LitElement {
  public static readonly styles = css;


  @property({ attribute: false })
  public rootNode: HierarchyNode<MemberClustersResult['clusters'][number]> | null = null;

  @property({ type: Number })
  public markDistance: number | null = null;


  private _rootPointNodeDeps: readonly [HierarchyNode<MemberClustersResult['clusters'][number]> | null] = [null];
  private _rootPointNode: HierarchyPointNode<MemberClustersResult['clusters'][number]> | null = null;
  private _scaleX: ScaleLinear<number, number> | null = null;
  private _scaleY: ScaleLinear<number, number> | null = null;


  @query(`.${classes.handleBox}`)
  private readonly _handleBoxElement!: HTMLElement;


  protected update(changedProps: PropertyValues): void {
    this._updateProperties();
    super.update(changedProps);
  }

  private _updateProperties(): void {
    if (this._rootPointNodeDeps[0] !== this.rootNode) {
      if (this.rootNode === null) {
        this._rootPointNode = null;
        this._scaleX = null;
        this._scaleY = null;
      } else {
        this._rootPointNode = d3Cluster<MemberClustersResult['clusters'][number]>()
          .separation(() => 1)
          .call(undefined, this.rootNode.copy());

        this._scaleX = scaleLinear<number>()
          .domain([this._rootPointNode.data.distance, 0])
          .range([0, 1]);

        this._scaleY = scaleLinear<number>()
          .domain([1, 0])
          .range([0, 1]);

        this._rootPointNode.each((node) => {
          const x = this._scaleX!(node.data.distance);
          const y = this._scaleY!(node.x);
          node.x = x;
          node.y = y;
        });
      }
      this._rootPointNodeDeps = [this.rootNode];
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this._renderTitle()}
      ${this._renderSvg()}
      ${this._renderDistanceLabels()}
      ${this._renderHandle()}
    `;
  }

  private _renderTitle(): TemplateResult {
    return html`
      <h4 class="${classes.title}"><slot name="title"></slot></h4>
    `;
  }

  private _renderSvg(): TemplateResult {
    const renderPointNode = (node: HierarchyPointNode<MemberClustersResult['clusters'][number]>): ReadonlyArray<TemplateResult> => [
      ...(node.height > 0 ? [] : [svg`
        <line
          class="${classes.labelTick}"
          x1="${node.x}" y1="${node.y}"
          x2="${node.x + 0.01}" y2="${node.y}"></line>
      `]),
      ...(node.children === undefined ? [] : node.children.map((child) => svg`
        <polyline
          class="${classes.link}"
          points="${node.x},${node.y} ${node.x},${child.y} ${child.x},${child.y}"
        ></polyline>
      `)),
      // eslint-disable-next-line max-len
      ...(node.children === undefined ? [] : node.children.flatMap((child) => renderPointNode(child)))
    ];

    return html`
      <svg class="${classes.svg}" viewBox="0 0 1 1" preserveAspectRatio="none">
        ${this._rootPointNode === null ? nothing : renderPointNode(this._rootPointNode)}
      </svg>
    `;
  }

  private _renderClusterLabels(): TemplateResult {
    return html`
      ${this._rootPointNode === null ? [] : this._rootPointNode.leaves().map((node) => svg`
        <div class="${classes.clusterLabelBox}">
          <span
            class="${classes.clusterLabel}"
            style="${styleMap({ top: `${node.y * 100}%` })}"
          >${node.data.memberId}</span>
        </div>
      `)}
    `;
  }

  private _renderDistanceLabels(): TemplateResult {
    return html`
      ${this._scaleX === null ? [] : this._scaleX.ticks().map((dist) => svg`
        <div class="${classes.distanceLabelBox}">
          <span
            class="${classes.distanceLabel}"
            style="${styleMap({ left: `${this._scaleX!(dist) * 100}%` })}"
          >${dist}</span>
        </div>
      `)}
    `;
  }

  private _renderHandle(): TemplateResult {
    return html`
      <div class="${classes.handleBox}" @click="${this._onHandleBoxClick}">
        ${this.markDistance === null || this._scaleX === null ? nothing : html`
          <div class="${classes.handle}"
            style="${styleMap({ left: `${this._scaleX(this.markDistance) * 100}%` })}"
          ></div>
        `}
      </div>
    `;
  }

  private _onHandleBoxClick(event: MouseEvent): void {
    if (this._scaleX === null) return;

    const box = this._handleBoxElement.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const dist = this._scaleX.invert(x);
    this.dispatchEvent(new HandleMovedEvent(dist));
  }

}
