import { Token, FactoryOrConstructor } from '@innolens/resolver';

import { ClientCollection, createClientCollection } from './client';
import { Db, DbImpl } from './db';
import { createDbClient, DbClient } from './db-client';
import { createEquipmentBookingCollection, EquipmentBookingCollection } from './equipment-booking';
import { createEquipmentLoginRecordCollection, EquipmentLoginRecordCollection } from './equipment-login-record';
import { createEquipmentLogoutRecordCollection, EquipmentLogoutRecordCollection } from './equipment-logout-record';
import { createMemberCollection, MemberCollection } from './member';
import { createMemberCompositionCollection, MemberCompositionCollection } from './member-composition';
import { createOAuth2Collection, OAuth2Collection } from './oauth2';
import { createUserCollection, UserCollection } from './user';


export const dbCreators: ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> = [
  [ClientCollection, createClientCollection],
  [Db, DbImpl],
  [DbClient, createDbClient],
  [EquipmentBookingCollection, createEquipmentBookingCollection],
  [EquipmentLoginRecordCollection, createEquipmentLoginRecordCollection],
  [EquipmentLogoutRecordCollection, createEquipmentLogoutRecordCollection],
  [MemberCollection, createMemberCollection],
  [MemberCompositionCollection, createMemberCompositionCollection],
  [OAuth2Collection, createOAuth2Collection],
  [UserCollection, createUserCollection]
];
