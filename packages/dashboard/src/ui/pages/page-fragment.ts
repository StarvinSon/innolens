import { Resolver } from '@innolens/resolver/web';
import { TemplateResult, html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';

import { injectTemplate } from '../element-property-injector';
import { Fragment, FragmentAnimationType } from '../fragment';

import { classes } from './pages.scss';


interface TemplateCache {
  readonly strings: TemplateStringsArray;
}


export class PageFragment extends Fragment {
  public readonly tagName: keyof HTMLElementTagNameMap;
  public readonly getResolver: () => Resolver | null;

  private _templateCache: TemplateCache | null = null;

  public constructor(tagName: keyof HTMLElementTagNameMap, getResolver: () => Resolver | null) {
    super();
    this.tagName = tagName;
    this.getResolver = getResolver;
  }

  protected render(): TemplateResult {
    const { visible, interactable } = this;

    /* eslint-disable @typescript-eslint/indent */
    return this._processTemplate(html`
      <div
        class="${classMap({
          [classes.page]: true,
          [classes.page_$hide]: !visible,
          [classes.page_$freeze]: !interactable
        })}">
        <!-- @ts-ignore -->
        <TAG
          class="${classes.page_content}"
          .visible="${visible}"
          .interactable="${interactable}"></TAG>
      </div>
    `);
    /* eslint-enable @typescript-eslint/indent */
  }

  private _processTemplate(result: TemplateResult): TemplateResult {
    return injectTemplate(this.getResolver(), this._injectTag(result));
  }

  private _injectTag(result: TemplateResult): TemplateResult {
    if (this._templateCache === null) {
      const strings = result.strings.map((s) => s.replace(/TAG/g, this.tagName));
      this._templateCache = {
        strings: Object.freeze(Object.assign(strings.slice(), {
          raw: Object.freeze(strings.slice())
        })) as TemplateStringsArray
      };
    }

    return new TemplateResult(
      this._templateCache.strings,
      result.values,
      result.type,
      result.processor
    );
  }

  protected makeAnimations(type: FragmentAnimationType): ReadonlyArray<Animation> {
    const pageElem = this.getRootElement();
    const pageContentElem = pageElem?.querySelector(this.tagName) ?? null;
    if (pageElem !== null && pageContentElem !== null && type === 'showing') {
      return [
        new Animation(
          new KeyframeEffect(
            pageElem,
            [
              { opacity: 0, zIndex: 1 },
              { opacity: 1, zIndex: 1 }
            ],
            {
              duration: 150,
              fill: 'forwards'
            }
          ),
          document.timeline
        ),
        new Animation(
          new KeyframeEffect(
            pageContentElem,
            [
              { transform: 'translateY(10%)' },
              { transform: 'translateY(0%)' }
            ],
            {
              duration: 300,
              fill: 'forwards',
              easing: 'cubic-bezier(0.33, 1, 0.68, 1)'
            }
          ),
          document.timeline
        )
      ];
    }
    return [];
  }
}
