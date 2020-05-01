import {
  customElement, LitElement, TemplateResult,
  html, property
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../theme';
import '../ripple'; // eslint-disable-line import/no-duplicates
import { RippleController } from '../ripple'; // eslint-disable-line import/no-duplicates

import { css, classes } from './choice-chip.scss';


const TAG_NAME = 'inno-choice-chip';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ChoiceChip;
  }
}

@customElement(TAG_NAME)
export class ChoiceChip extends LitElement {
  public static readonly styles = css;


  @property({ type: Boolean })
  public selected = false;

  @property({ type: Boolean })
  public disabled = false;


  private readonly _rippleController = new RippleController();


  protected createRenderRoot(): ShadowRoot | Element {
    return this.attachShadow({
      mode: 'open',
      delegatesFocus: true
    });
  }

  protected render(): TemplateResult {
    const {
      selected,
      disabled,
      _rippleController: rippleCtr
    } = this;

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <button
        class="${classMap({
          [classes.button]: true,
          [classes.button_$selected]: selected
        })}"
        data-ripple-host="${rippleCtr.bindHost()}"
        .disabled="${disabled}">
        <div
          class="${classMap({
            [classes.button_background]: true,
            [classes.button_background_$hide]: !selected
          })}"></div>
        <inno-ripple
          class="${classMap({
            [classes.button_ripple]: true,
            [classes.button_ripple_$selected]: selected
          })}"
          data-ripple="${rippleCtr.bindRipple()}"></inno-ripple>
        <div
          class="${classMap({
            [classes.button_border]: true,
            [classes.button_border_$selected]: selected
          })}"></div>
        <slot></slot>
      </button>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
