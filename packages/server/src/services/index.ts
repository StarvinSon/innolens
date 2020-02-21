import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { ClientService, ClientServiceImpl } from './client';
import { MemberService, MemberServiceImpl } from './member';
import { MemberCompositionService, MemberCompositionServiceImpl } from './member-composition';
import { OAuth2Service, OAuth2ServiceImpl } from './oauth2';
import { UserService, UserServiceImpl } from './user';


// eslint-disable-next-line max-len
export const serviceCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [ClientService, ClientServiceImpl],
  [MemberService, MemberServiceImpl],
  [MemberCompositionService, MemberCompositionServiceImpl],
  [OAuth2Service, OAuth2ServiceImpl],
  [UserService, UserServiceImpl]
];
