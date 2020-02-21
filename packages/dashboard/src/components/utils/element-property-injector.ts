import { Resolver } from '@innolens/resolver';
import { UpdatingElement } from 'lit-element';
import {
  directive, DirectiveFn, NodePart,
  TemplateResult
} from 'lit-html';

import { injectProperties, injectableProperty } from '../../utils/property-injector';


const partMap = new WeakMap<NodePart, NodePart>();

export const injectElementProperties =
  directive((resolver: Resolver | null, result: TemplateResult): DirectiveFn =>
    (containerPart) => {
      if (!(containerPart instanceof NodePart)) {
        throw new TypeError('injectElementProperties directive can only be used in node binding');
      }

      let part = partMap.get(containerPart);
      if (part === undefined) {
        part = new NodePart(containerPart.options);
        partMap.set(containerPart, part);
        part.appendIntoPart(containerPart);
      }

      part.setValue(result);
      part.commit();

      if (resolver !== null) {
        for (
          let node = part.startNode.nextSibling;
          node !== null && node !== part.endNode;
          node = node.nextSibling
        ) {
          if (node instanceof Element) {
            injectProperties(node, resolver);
          }
        }
      }
    });


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
    protected inject(result: TemplateResult): unknown {
      return injectElementProperties(this._resolver, result);
    }
  }

  return PropertyInjectorElementMixin;
};
