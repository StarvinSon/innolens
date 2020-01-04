import { DependencyRegistrant } from '../app-context';

import { registerClientCollection } from './client';
import { registerDb } from './db';
import { DbClientOptions, registerDbClient } from './db-client';
import { registerEquipmentBookingCollection } from './equipment-booking';
import { registerEquipmentLoginRecordCollection } from './equipment-login-record';
import { registerEquipmentLogoutRecordCollection } from './equipment-logout-record';
import { registerMemberGroupCollection } from './member-group';
import { registerMemberCollection } from './member';
import { registerOAuth2Collection } from './oauth2';
import { registerUserCollection } from './user';


export type DbAndCollectionsOptions = DbClientOptions;

// eslint-disable-next-line max-len
export const registerDbAndCollections: DependencyRegistrant<[DbAndCollectionsOptions]> = (appCtx, options) => {
  const registrants: ReadonlyArray<DependencyRegistrant> = [
    registerClientCollection,
    registerDb,
    (c) => registerDbClient(c, options),
    registerEquipmentBookingCollection,
    registerEquipmentLoginRecordCollection,
    registerEquipmentLogoutRecordCollection,
    registerMemberGroupCollection,
    registerMemberCollection,
    registerOAuth2Collection,
    registerUserCollection
  ];
  registrants.forEach((register) => {
    register(appCtx);
  });
};
