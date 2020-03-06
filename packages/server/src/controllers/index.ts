import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { ExpendableInventoryStockRecordController, ExpendableInventoryStockRecordControllerImpl } from './expendable-inventory-stock-record';
import { InventoryController, InventoryControllerImpl } from './inventory';
import { MachineController, MachineControllerImpl } from './machine';
import { MachineUsageController, MachineUsageControllerImpl } from './machine-usage';
import { MemberController, MemberControllerImpl } from './member';
import { MemberCompositionController, MemberCompositionControllerImpl } from './member-composition';
import { OAuth2Controller, OAuth2ControllerImpl } from './oauth2';
import { ReusableInventoryController, ReusableInventoryControllerImpl } from './reusable-inventory';
import { ReusableInventoryUsageController, ReusableInventoryUsageControllerImpl } from './reusable-inventory-usage';
import { SpaceController, SpaceControllerImpl } from './space';
import { SpaceAccessController, SpaceAccessControllerImpl } from './space-access';
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

  [ExpendableInventoryStockRecordController, ExpendableInventoryStockRecordControllerImpl],
  [InventoryController, InventoryControllerImpl],
  [MachineController, MachineControllerImpl],
  [MachineUsageController, MachineUsageControllerImpl],
  [MemberController, MemberControllerImpl],
  [MemberCompositionController, MemberCompositionControllerImpl],
  [OAuth2Controller, OAuth2ControllerImpl],
  [StaticController, StaticControllerImpl],
  [ReusableInventoryController, ReusableInventoryControllerImpl],
  [ReusableInventoryUsageController, ReusableInventoryUsageControllerImpl],
  [SpaceController, SpaceControllerImpl],
  [SpaceAccessController, SpaceAccessControllerImpl],
  [UserController, UserControllerImpl]
];
