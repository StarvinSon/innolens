import {
  customElement, LitElement, TemplateResult,
  html,
  property
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '../theme';
import '../typography';
import '../ripple'; // eslint-disable-line import/no-duplicates
import { ifString } from '../directives/if-string';
import { RippleController } from '../ripple'; // eslint-disable-line import/no-duplicates

import { css, classes } from './item.scss';


const TAG_NAME = 'inno-drawer-item';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: DrawerItem;
  }
}

@customElement(TAG_NAME)
export class DrawerItem extends LitElement {
  public static readonly styles = css;

  @property({ type: String })
  public href: string | null = null;

  @property({ type: Boolean })
  public highlight = false;


  private readonly _rippleController = new RippleController();

  protected createRenderRoot(): Element | ShadowRoot {
    return this.attachShadow({
      mode: 'open',
      delegatesFocus: true
    });
  }

  protected render(): TemplateResult {
    const {
      href,
      highlight,
      _rippleController: rippleCtr
    } = this;

    /* eslint-disable @typescript-eslint/indent */
    return html`
      <a
        class="${classMap({
          [classes.link]: true,
          [classes.link_$highlight]: highlight
        })}"
        href="${ifString(href)}"
        data-ripple-host=${rippleCtr.bindHost()}>
        <inno-ripple
          class="${classMap({
            [classes.link_ripple]: true,
            [classes.link_ripple_$highlight]: highlight
          })}"
          data-ripple="${rippleCtr.bindRipple()}"></inno-ripple>
        <div class="${classes.link_content}"><slot></slot></div>
      </a>
    `;
    /* eslint-enable @typescript-eslint/indent */
  }
}
