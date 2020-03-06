import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { ClientService, ClientServiceImpl } from './client';
import { ExpendableInventoryStockRecordService, ExpendableInventoryStockRecordServiceImpl } from './expendable-inventory-stock-record';
import { InventoryService, InventoryServiceImpl } from './inventory';
import { MachineService, MachineServiceImpl } from './machine';
import { MachineUsageService, MachineUsageServiceImpl } from './machine-usage';
import { MemberService, MemberServiceImpl } from './member';
import { MemberCompositionService, MemberCompositionServiceImpl } from './member-composition';
import { OAuth2Service, OAuth2ServiceImpl } from './oauth2';
import { UserService, UserServiceImpl } from './user';


// eslint-disable-next-line max-len
export const serviceCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [ClientService, ClientServiceImpl],
  [ExpendableInventoryStockRecordService, ExpendableInventoryStockRecordServiceImpl],
  [InventoryService, InventoryServiceImpl],
  [MachineService, MachineServiceImpl],
  [MachineUsageService, MachineUsageServiceImpl],
  [MemberService, MemberServiceImpl],
  [MemberCompositionService, MemberCompositionServiceImpl],
  [OAuth2Service, OAuth2ServiceImpl],
  [UserService, UserServiceImpl]
];
