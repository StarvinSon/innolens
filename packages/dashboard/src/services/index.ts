import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { MemberCompositionService, MemberCompositionServiceImpl } from './member-composition';
import { OAuth2Service, OAuth2ServiceImpl } from './oauth2';
import { PathService, PathServiceImpl } from './path';
import { ServerClient, ServerClientImpl } from './server-client';
import { Store, StoreImpl } from './store';


// eslint-disable-next-line max-len
export const serviceCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [MemberCompositionService, MemberCompositionServiceImpl],
  [OAuth2Service, OAuth2ServiceImpl],
  [PathService, PathServiceImpl],
  [ServerClient, ServerClientImpl],
  [Store, StoreImpl]
];
