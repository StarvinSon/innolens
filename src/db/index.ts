import { DependencyRegistrant } from '../app-context';

import { DbClientOptions, registerDbClient, registerDb } from './db';
import { registerClientsCollection } from './clients';
import { registerMembersCollection } from './members';
import { registerOAuth2Collection } from './oauth2';
import { registerUsersCollection } from './users';


export type DbAndCollectionsOptions = DbClientOptions;

// eslint-disable-next-line max-len
export const registerDbAndCollections: DependencyRegistrant<[DbAndCollectionsOptions]> = (appCtx, options) => {
  registerClientsCollection(appCtx);
  registerDbClient(appCtx, options);
  registerDb(appCtx);
  registerMembersCollection(appCtx);
  registerOAuth2Collection(appCtx);
  registerUsersCollection(appCtx);
};
