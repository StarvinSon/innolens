import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { ClientService, ClientServiceImpl } from './client';
import { ExpendableInventoryStockRecordService, ExpendableInventoryStockRecordServiceImpl } from './expendable-inventory-stock-record';
import { InventoryService, InventoryServiceImpl } from './inventory';
import { MachineService, MachineServiceImpl } from './machine';
import { MachineUsageService, MachineUsageServiceImpl } from './machine-usage';
import { MemberCompositionService, MemberCompositionServiceImpl } from './member-composition';
import { OAuth2Service, OAuth2ServiceImpl } from './oauth2';
import { ReusableInventoryService, ReusableInventoryServiceImpl } from './reusable-inventory';
import { ReusableInventoryUsageRecordService, ReusableInventoryUsageRecordServiceImpl } from './reusable-inventory-usage-record';
import { SpaceService, SpaceServiceImpl } from './space';
import { SpaceAccessRecordService, SpaceAccessRecordServiceImpl } from './space-access-record';
import { UserService, UserServiceImpl } from './user';


// eslint-disable-next-line max-len
export const serviceCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [ClientService, ClientServiceImpl],
  [ExpendableInventoryStockRecordService, ExpendableInventoryStockRecordServiceImpl],
  [InventoryService, InventoryServiceImpl],
  [MachineService, MachineServiceImpl],
  [MachineUsageService, MachineUsageServiceImpl],
  [MemberCompositionService, MemberCompositionServiceImpl],
  [OAuth2Service, OAuth2ServiceImpl],
  [ReusableInventoryService, ReusableInventoryServiceImpl],
  [ReusableInventoryUsageRecordService, ReusableInventoryUsageRecordServiceImpl],
  [SpaceService, SpaceServiceImpl],
  [SpaceAccessRecordService, SpaceAccessRecordServiceImpl],
  [UserService, UserServiceImpl]
];
