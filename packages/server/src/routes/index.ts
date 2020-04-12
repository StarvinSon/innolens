import * as Api from '@innolens/api/legacy/node';
import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import KoaRouter from '@koa/router';
import { DefaultState, DefaultContext } from 'koa';

import { FileController } from '../controllers/file';
import { MachineController } from '../controllers/machine';
import { MemberController } from '../controllers/member';
import { OAuth2Controller } from '../controllers/oauth2';
import { ReusableInventoryController } from '../controllers/reusable-inventory';
import { SpaceController } from '../controllers/space';
import { StaticController } from '../controllers/static';
import { bindMethods } from '../utils/method-binder';

import { glueRoutes } from './glue';


const bindControllerMethods = <T extends Readonly<Record<string, object>>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj)
    .map(([key, controller]) => [key, bindMethods(controller)]));


export interface Router extends KoaRouter<DefaultState, DefaultContext> {}

export const Router = decorate(
  name('Router'),
  injectableFactory({
    file: FileController,
    member: MemberController,
    oauth2: OAuth2Controller,
    space: SpaceController,
    machine: MachineController,
    reusableInventory: ReusableInventoryController,
    static: StaticController
  }),
  singleton(),
  (_controllers: {
    file: FileController,
    member: MemberController,
    oauth2: OAuth2Controller,
    space: SpaceController,
    static: StaticController,
    machine: MachineController,
    reusableInventory: ReusableInventoryController
  }): Router => {
    const controllers = bindControllerMethods(_controllers);
    const router: Router = new KoaRouter();
    /* eslint-disable max-len */

    // file
    router.post(Api.Files.PostFile.path, controllers.file.postFile);

    // member
    router.get(Api.Members.GetDepartments.path, controllers.member.getDepartments);
    router.get(Api.Members.GetTypesOfStudy.path, controllers.member.getTypesOfStudy);
    router.get(Api.Members.GetStudyProgrammes.path, controllers.member.getStudyProgrammes);
    router.get(Api.Members.GetYearsOfStudy.path, controllers.member.getYearsOfStudy);
    router.get(Api.Members.GetAffiliatedStudentInterestGroups.path, controllers.member.getAffiliatedStudentInterestGroups);
    router.post(Api.Members.PostMembers.path, controllers.member.postMembers);

    router.get(Api.Members.GetCount.path, controllers.member.getCount);
    router.get(Api.Members.GetCountHistory.path, controllers.member.getCountHistory);

    // oauth2
    router.post(Api.OAuth2.PostToken.path, controllers.oauth2.postToken);

    // space
    router.get(Api.Spaces.GetSpaces.path, controllers.space.getSpaces);
    router.post(Api.Spaces.PostSpaces.path, controllers.space.postSpaces);
    router.post(Api.Spaces.PostSpaceAccessRecords.path(':spaceId'), controllers.space.postSpaceAccessRecords);

    router.get(Api.Spaces.GetSpaceMemberCountHistory.path(':spaceId'), controllers.space.getSpaceMemberCountHistory);

    // Register auto generated routes
    glueRoutes(router, controllers);

    // fallback
    router.get(':subPath(.*)', controllers.static.get);

    /* eslint-enable max-len */
    return router;
  }
);
