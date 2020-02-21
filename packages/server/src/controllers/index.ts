import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { MemberController, MemberControllerImpl } from './member';
import { MemberCompositionController, MemberCompositionControllerImpl } from './member-composition';
import { OAuth2Controller, OAuth2ControllerImpl } from './oauth2';
import { StaticController, StaticControllerImpl } from './static';
import { UserController, UserControllerImpl } from './user';
import { InjectedBodyParserFactory, createInjectedBodyParserFactory } from './utils/body-parser';
import { InjectedBodyValidatorFactory, createInjectedBodyValidatorFactory } from './utils/body-validator';
import { ClientAuthenticator, ClientAuthenticatorImpl } from './utils/client-authenticator';
import { UserAuthenticator, UserAuthenticatorImpl } from './utils/user-authenticator';


// eslint-disable-next-line max-len
export const controllerCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [InjectedBodyParserFactory, createInjectedBodyParserFactory],
  [InjectedBodyValidatorFactory, createInjectedBodyValidatorFactory],
  [ClientAuthenticator, ClientAuthenticatorImpl],
  [UserAuthenticator, UserAuthenticatorImpl],

  [MemberController, MemberControllerImpl],
  [MemberCompositionController, MemberCompositionControllerImpl],
  [OAuth2Controller, OAuth2ControllerImpl],
  [StaticController, StaticControllerImpl],
  [UserController, UserControllerImpl]
];
