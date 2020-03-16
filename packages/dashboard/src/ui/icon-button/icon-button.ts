import {
  LitElement, TemplateResult, html,
  customElement
} from 'lit-element';

import '../theme';
import '../ripple'; // eslint-disable-line import/no-duplicates
import { RippleController } from '../ripple'; // eslint-disable-line import/no-duplicates

import { css, classes } from './icon-button.scss';


const TAG_NAME = 'inno-icon-button';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: IconButton;
  }
}

@customElement(TAG_NAME)
export class IconButton extends LitElement {
  public static readonly styles = css;

  private readonly _rippleController = new RippleController();

  protected createRenderRoot(): Element | ShadowRoot {
    return this.attachShadow({
      mode: 'open',
      delegatesFocus: true
    });
  }

  protected render(): TemplateResult {
    const { _rippleController: rippleCtr } = this;

    return html`
      <button
        class="${classes.button}"
        data-ripple-host="${rippleCtr.bindHost()}">
        <inno-ripple
          class="${classes.button_ripple}"
          data-ripple="${rippleCtr.bindRipple()}"></inno-ripple>
        <slot></slot>
      </button>
    `;
  }
}
