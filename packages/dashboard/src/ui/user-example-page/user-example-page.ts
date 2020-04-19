import {
  customElement, LitElement, TemplateResult,
  html
} from 'lit-element';

import { css, classes } from './user-example-page.scss';

import '../button';


const TAG_NAME = 'inno-user-example-page';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UserExamplePage;
  }
}

@customElement(TAG_NAME)
export class UserExamplePage extends LitElement {
  public static readonly styles = css;

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <h4 class="${classes.title}">This is an example</h4>
      </div>
    `;
  }
}
