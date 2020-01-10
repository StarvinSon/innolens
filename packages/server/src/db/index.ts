import { ResolverFunction } from '../resolver';

import { registerClientCollection } from './client';
import { registerDb } from './db';
import { registerDbClient } from './db-client';
import { registerEquipmentBookingCollection } from './equipment-booking';
import { registerEquipmentLoginRecordCollection } from './equipment-login-record';
import { registerEquipmentLogoutRecordCollection } from './equipment-logout-record';
import { registerMemberCollection } from './member';
import { registerMemberCompositionCollection } from './member-composition';
import { registerOAuth2Collection } from './oauth2';
import { registerUserCollection } from './user';


const registrants: ReadonlyArray<ResolverFunction> = [
  registerClientCollection,
  registerDb,
  registerDbClient,
  registerEquipmentBookingCollection,
  registerEquipmentLoginRecordCollection,
  registerEquipmentLogoutRecordCollection,
  registerMemberCollection,
  registerMemberCompositionCollection,
  registerOAuth2Collection,
  registerUserCollection
];

export const registerDbAndCollections: ResolverFunction = (resolver) => {
  for (const register of registrants) {
    register(resolver);
  }
};
