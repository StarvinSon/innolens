import { MembersService, createMembersService, MembersServiceCollectionMap } from './members';
import { CommonServiceOptions } from './common';


export type AppService<T> = T;


export type AppServiceCollectionMap = MembersServiceCollectionMap;

export interface DefaultAppServiceMap {
  members: MembersService;
}

export const createAppService = (
  options: CommonServiceOptions<AppServiceCollectionMap>
): AppService<DefaultAppServiceMap> => ({
  members: createMembersService(options)
});
