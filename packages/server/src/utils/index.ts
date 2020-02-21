import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { InjectedValidatorFactory, createInjectedValidatorFactory } from './validator';


// eslint-disable-next-line max-len
export const utilCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [InjectedValidatorFactory, createInjectedValidatorFactory]
];
