import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import '../bar-chart';// eslint-disable-line import/no-duplicates
import '../line-chart'; // eslint-disable-line import/no-duplicates
import '../pie-chart'; // eslint-disable-line import/no-duplicates
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

  private readonly _sampleLineChartData: LineChartData<string> = {
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


  protected render(): TemplateResult {
    return html`
      <h4>Bar Chart Sample</h4>
      <inno-bar-chart
        .data="${this._sampleBarChartData}"></inno-bar-chart>
      <inno-line-chart
        .data="${this._sampleLineChartData}">
        <span slot="title">Line Chart Sample</span>
      </inno-line-chart>
      <inno-pie-chart
        .data="${this._samplePieChartData}">
        <span slot="title">Pie Chart Sample</span>
      </inno-pie-chart>
    `;
  }
}
