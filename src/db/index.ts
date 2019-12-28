import { DependencyRegistrant } from '../app-context';

import { registerClientsCollection } from './clients';
import { DbClientOptions, registerDbClient, registerDb } from './db';
import { registerMemberGroupsCollection } from './member-groups';
import { registerMembersCollection } from './members';
import { registerOAuth2Collection } from './oauth2';
import { registerUsersCollection } from './users';


export type DbAndCollectionsOptions = DbClientOptions;

// eslint-disable-next-line max-len
export const registerDbAndCollections: DependencyRegistrant<[DbAndCollectionsOptions]> = (appCtx, options) => {
  const registrants: ReadonlyArray<DependencyRegistrant> = [
    registerClientsCollection,
    registerDb,
    (c) => registerDbClient(c, options),
    registerMemberGroupsCollection,
    registerMembersCollection,
    registerOAuth2Collection,
    registerUsersCollection
  ];
  registrants.forEach((register) => {
    register(appCtx);
  });
};
