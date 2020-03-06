import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { ClientCollection, createClientCollection } from './client';
import { Db, DbImpl } from './db';
import { createDbClient, DbClient } from './db-client';
import { createExpendableInventoryStockRecordCollection, ExpendableInventoryStockRecordCollection } from './expendable-inventory-stock-record';
import { createInventoryCollection, InventoryCollection } from './inventory';
import { createMachineCollection, MachineCollection } from './machine';
import { createMachineUsageCollection, MachineUsageCollection } from './machine-usage';
import { createMemberCollection, MemberCollection } from './member';
import { createMemberCompositionCollection, MemberCompositionCollection } from './member-composition';
import { createOAuth2Collection, OAuth2Collection } from './oauth2';
import { createReusableInventoryCollection, ReusableInventoryCollection } from './reusable-inventory';
import { createReusableInventoryUsageCollection, ReusableInventoryUsageCollection } from './reusable-inventory-usage';
import { createSpaceCollection, SpaceCollection } from './space';
import { createSpaceAccessCollection, SpaceAccessCollection } from './space-access';
import { createUserCollection, UserCollection } from './user';


export const dbCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [ClientCollection, createClientCollection],
  [Db, DbImpl],
  [DbClient, createDbClient],
  [ExpendableInventoryStockRecordCollection, createExpendableInventoryStockRecordCollection],
  [InventoryCollection, createInventoryCollection],
  [MachineCollection, createMachineCollection],
  [MachineUsageCollection, createMachineUsageCollection],
  [MemberCollection, createMemberCollection],
  [MemberCompositionCollection, createMemberCompositionCollection],
  [OAuth2Collection, createOAuth2Collection],
  [ReusableInventoryCollection, createReusableInventoryCollection],
  [ReusableInventoryUsageCollection, createReusableInventoryUsageCollection],
  [SpaceCollection, createSpaceCollection],
  [SpaceAccessCollection, createSpaceAccessCollection],
  [UserCollection, createUserCollection]
];
