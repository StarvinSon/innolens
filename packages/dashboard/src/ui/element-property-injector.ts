import { Resolver } from '@innolens/resolver';
import { UpdatingElement } from 'lit-element';
import {
  directive, DirectiveFn, TemplateResult,
  html, AttributePart, PropertyPart
} from 'lit-html';

import { injectProperties, injectableProperty } from '../utils/property-injector';


const injectElementProperty =
  directive((resolver: Resolver | null): DirectiveFn =>
    (attrPart) => {
      if (!(attrPart instanceof AttributePart) || attrPart instanceof PropertyPart) {
        throw new TypeError('injectElementProperty directive can only be used in attribute binding');
      }

      if (resolver !== null) {
        injectProperties(attrPart.committer.element, resolver);
      }
    });


interface InjectedTemplate {
  readonly strings: TemplateStringsArray;
  readonly valueIndices: ReadonlyArray<number>;
}

const injectedTemplateCache = new WeakMap<TemplateStringsArray, InjectedTemplate>();

export const injectTemplate = (
  resolver: Resolver | null,
  tempResult: TemplateResult
): TemplateResult => {
  let injectedTemplate = injectedTemplateCache.get(tempResult.strings);
  if (injectedTemplate === undefined) {
    let valPlaceholder: string;
    do {
      valPlaceholder = `{{placeholder-${Math.random().toString().slice(2)}}}`;
    // eslint-disable-next-line no-loop-func
    } while (tempResult.strings.some((s) => s.includes(valPlaceholder)));

    let attrNamePlaceholder: string;
    do {
      attrNamePlaceholder = `attr-name-holder-${Math.random().toString().slice(2)}`;
    // eslint-disable-next-line no-loop-func
    } while (tempResult.strings.some((s) => s.includes(attrNamePlaceholder)));

    let attrValuePlaceholder: string;
    do {
      attrValuePlaceholder = `{{attr-value-holder-${Math.random().toString().slice(2)}}}`;
    // eslint-disable-next-line no-loop-func
    } while (tempResult.strings.some((s) => s.includes(attrValuePlaceholder)));

    const tempElem = document.createElement('template');
    tempElem.innerHTML = tempResult.strings.join(valPlaceholder);

    const treeWalker = document.createTreeWalker(
      tempElem.content,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) =>
          (node as Element).tagName.includes('-')
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP
      }
    );

    for (
      let currElem = treeWalker.nextNode() as Element | null;
      currElem !== null;
      currElem = treeWalker.nextNode() as Element | null
    ) {
      currElem.setAttribute(attrNamePlaceholder, attrValuePlaceholder);
    }

    let valIdx = 0;
    const injectedStrings: Array<string> = [];
    const injectedValIdxs: Array<number> = [];
    for (const string of tempElem.innerHTML.split(valPlaceholder)) {
      const [beforeAttrString, afterAttrString] = string.split(attrValuePlaceholder);
      injectedStrings.push(beforeAttrString);
      if (afterAttrString !== undefined) {
        injectedValIdxs.push(-1);
        injectedStrings.push(afterAttrString);
      }
      if (valIdx < tempResult.values.length) {
        injectedValIdxs.push(valIdx);
        valIdx += 1;
      }
    }

    injectedTemplate = {
      strings: Object.freeze(Object.assign(injectedStrings, {
        raw: Object.freeze(injectedStrings.slice())
      })) as TemplateStringsArray,
      valueIndices: injectedValIdxs
    };
    injectedTemplateCache.set(tempResult.strings, injectedTemplate);
  }

  return new TemplateResult(
    injectedTemplate.strings,
    injectedTemplate.valueIndices.map((idx) => idx < 0
      ? injectElementProperty(resolver)
      : tempResult.values[idx]),
    tempResult.type,
    tempResult.processor
  );
};


interface CustomElement extends HTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  readonly isConnected: boolean;
}

// eslint-disable-next-line max-len, @typescript-eslint/explicit-function-return-type
export const PropertyInjectorElement = <T extends (new (...args: Array<any>) => CustomElement)>(base: T) => {
  class PropertyInjectorElementMixin extends base {
    private _resolver: Resolver | null = null;

    @injectableProperty(Resolver)
    public get resolver(): Resolver | null {
      return this._resolver;
    }

    public set resolver(newVal: Resolver | null) {
      const oldVal = this._resolver;
      this._resolver = newVal;
      if (this instanceof UpdatingElement) {
        this.requestUpdate('resolver', oldVal);
      }
    }

    /**
     * Inject element properties.
     */
    protected html(
      strings: TemplateStringsArray,
      ...values: ReadonlyArray<unknown>
    ): TemplateResult {
      return injectTemplate(this.resolver, html(strings, ...values));
    }
  }

  return PropertyInjectorElementMixin;
};
