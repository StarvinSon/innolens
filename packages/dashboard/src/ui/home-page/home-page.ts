import {
  customElement, LitElement, TemplateResult,
  html, property
} from 'lit-element';

import '../button';
import '../bar-chart';// eslint-disable-line import/no-duplicates
import '../line-chart'; // eslint-disable-line import/no-duplicates
import '../pie-chart'; // eslint-disable-line import/no-duplicates
import { MemberCompositionService, MemberCompositionState } from '../../services/member-composition';
import { injectableProperty } from '../../utils/property-injector';
import { observeProperty } from '../../utils/property-observer';
import { BarChartData } from '../bar-chart'; // eslint-disable-line import/no-duplicates
import { LineChartData } from '../line-chart'; // eslint-disable-line import/no-duplicates
import { PieChartData } from '../pie-chart'; // eslint-disable-line import/no-duplicates

import { css } from './home-page.scss';


const TAG_NAME = 'inno-home-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: HomePage;
  }
}

@customElement(TAG_NAME)
export class HomePage extends LitElement {
  public static readonly styles = css;


  @injectableProperty(MemberCompositionService)
  @observeProperty('_updateListeners')
  private _memberCompositionService: MemberCompositionService | null;

  @property({ attribute: false })
  private _memberComposition: MemberCompositionState = null;


  private readonly _sampleBarChartData: BarChartData = {
    bars: [
      {
        name: 'Bar 1',
        value: 1
      },
      {
        name: 'Bar 2',
        value: 4
      },
      {
        name: 'Bar 3',
        value: 10
      },
      {
        name: 'Bar 4',
        value: 3
      },
      {
        name: 'Bar 5',
        value: 6
      }
    ]
  };

  private readonly _sampleLineChartData: LineChartData = {
    labels: [...Array(51)].map((_, i) => String(i)),
    lines: [
      {
        name: 'Line 1',
        values: [...Array(51)].map((_, i) => 2 + 2 * Math.sin(i))
      },
      {
        name: 'Line 2',
        values: [...Array(51)].map((_, i) => 10 - (i - 5) ** 2)
      },
      {
        name: 'Line 3',
        values: [...Array(51)].map((_, i) => 4 + 2 * Math.sin(i))
      },
      {
        name: 'Line 4',
        values: [...Array(51)].map((_, i) => 8 - (i - 5) ** 2)
      },
      {
        name: 'Line 5',
        values: [...Array(51)].map((_, i) => 2 + 1 * Math.sin(i))
      }
    ]
  };

  private readonly _samplePieChartData: PieChartData = {
    pies: [
      {
        name: 'Pie 1',
        value: 10
      },
      {
        name: 'Pie 2',
        value: 2
      },
      {
        name: 'Pie 3',
        value: 5
      },
      {
        name: 'Pie 4',
        value: 10
      },
      {
        name: 'Pie 5',
        value: 11
      }
    ]
  };


  public constructor() {
    super();
    this._bindmemberComposition = this._bindmemberComposition.bind(this);
    this._memberCompositionService = null;
  }


  public connectedCallback(): void {
    super.connectedCallback();
    this._updateListeners();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._updateListeners();
  }


  private _updateListeners(): void {
    if (this.isConnected && this._memberCompositionService !== null) {
      if (this._memberCompositionService !== null) {
        this._memberCompositionService.addEventListener('changed', this._bindmemberComposition);
      }
      this._bindmemberComposition();
    } else if (this._memberCompositionService !== null) {
      this._memberCompositionService.removeEventListener('changed', this._bindmemberComposition);
    }
  }

  private _bindmemberComposition(): void {
    this._memberComposition = this._memberCompositionService?.memberComposition ?? null;
  }


  protected render(): TemplateResult {
    const { _memberComposition: memberComposition } = this;

    return html`
      <h4>Bar Chart Sample</h4>
      <inno-bar-chart
        .data="${this._sampleBarChartData}"></inno-bar-chart>
      <h4>Line Chart Sample</h4>
      <inno-line-chart
        .data="${this._sampleLineChartData}"></inno-line-chart>
      <h4>Pie Chart Sample</h4>
      <inno-pie-chart
        .data="${this._samplePieChartData}"></inno-pie-chart>
      <inno-button
        theme="raised"
        @click="${this._onUpdateButtonClick}">Update</inno-button>
      <pre>${JSON.stringify(memberComposition, undefined, 2)}</pre>
    `;
  }

  private _onUpdateButtonClick(): void {
    this._memberCompositionService?.update();
  }
}
