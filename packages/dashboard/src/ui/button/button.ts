import {
  LitElement, TemplateResult, html,
  customElement,
  property
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../elevation';
import '../theme';
import '../typography';
import '../ripple'; // eslint-disable-line import/no-duplicates
import { RippleController } from '../ripple'; // eslint-disable-line import/no-duplicates

import { css, classes } from './button.scss';


const TAG_NAME = 'inno-button';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Button;
  }
}

@customElement(TAG_NAME)
export class Button extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  public theme: 'flat' | 'raised' = 'flat';

  private readonly _rippleController = new RippleController();

  protected createRenderRoot(): Element | ShadowRoot {
    return this.attachShadow({
      mode: 'open',
      delegatesFocus: true
    });
  }

  protected render(): TemplateResult {
    const {
      theme,
      _rippleController: rippleCtr
    } = this;

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <button
        class="${classMap({
          [classes.button]: true,
          [classes.button_$raised]: theme === 'raised'
        })}"
        data-ripple-host="${rippleCtr.bindHost()}">
        <inno-ripple
          class="${classMap({
            [classes.button_ripple]: true,
            [classes.button_ripple_$raised]: theme === 'raised'
          })}"
          data-ripple="${rippleCtr.bindRipple()}"></inno-ripple>
        <div
          class="${classMap({
            [classes.button_content]: true,
            [classes.button_content_$raised]: theme === 'raised'
          })}"><slot></slot></div>
      </button>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
