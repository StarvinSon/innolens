import { Task } from '../utils/scheduler/task';
import { IntervalSchedule } from '../utils/scheduler/schedules/interval';
import { ServerClient } from '../server-client';
import { Logger } from '../logger';
import { depend } from '../resolver';


export type MemberCompositionTask = Task;


interface Member {
  readonly memberId: string;
  readonly name: string;
  readonly department: string;
  readonly typeOfStudy: string;
  readonly yearOfStudy: string;
  readonly studyProgramme: string;
  readonly affiliatedStudentInterestGroup: string;
}

interface Perspective {
  readonly type: string;
  readonly groups: ReadonlyArray<Group>;
}

interface Group {
  readonly type: string;
  readonly count: number;
}


const countGroup = (
  members: ReadonlyArray<Member>,
  getGroupType: (member: Member) => string
): ReadonlyArray<Group> => {
  const map = new Map<string, {
    readonly type: string;
    count: number
  }>();

  for (const member of members) {
    const groupType = getGroupType(member);
    let group = map.get(groupType);
    if (group === undefined) {
      group = {
        type: groupType,
        count: 0
      };
      map.set(groupType, group);
    }
    group.count += 1;
  }

  return Array.from(map.values());
};

const countDepartment = (members: ReadonlyArray<Member>): Perspective => ({
  type: 'DEPARTMENT',
  groups: countGroup(members, (member) => member.department)
});

const countTypeOfStudy = (members: ReadonlyArray<Member>): Perspective => ({
  type: 'TYPE_OF_STUDY',
  groups: countGroup(members, (member) => member.typeOfStudy)
});

const countYearOfStudy = (members: ReadonlyArray<Member>): Perspective => ({
  type: 'YEAR_OF_STUDY',
  groups: countGroup(members, (member) => member.yearOfStudy)
});

const countStudyProgramme = (members: ReadonlyArray<Member>): Perspective => ({
  type: 'STUDY_PROGRAMME',
  groups: countGroup(members, (member) => member.studyProgramme)
});

const countAffiliatedStudentInterestGroup = (members: ReadonlyArray<Member>): Perspective => ({
  type: 'AFFILIATED_STUDENT_INTEREST_GROUP',
  groups: countGroup(members, (member) => member.affiliatedStudentInterestGroup)
});

export class MemberCompositionAnalyzerImpl {
  private readonly _logger: Logger;
  private readonly _serverClient: ServerClient;

  public constructor(options: {
    logger: Logger;
    serverClient: ServerClient;
  }) {
    ({
      logger: this._logger,
      serverClient: this._serverClient
    } = options);
  }

  public async execute(): Promise<void> {
    this._logger.info('Downloading members');
    const members = await this._serverClient
      .authenticatedFetchOk('/api/members')
      .then<ReadonlyArray<Member>>((res) => res.json());

    this._logger.info('Analyzing member composition');
    const result = {
      time: new Date().toISOString(),
      perspectives: [
        countDepartment(members),
        countTypeOfStudy(members),
        countYearOfStudy(members),
        countStudyProgramme(members),
        countAffiliatedStudentInterestGroup(members)
      ]
    };

    this._logger.info('Uploading member composition');
    await this._serverClient
      .authenticatedFetchOk('/api/member-compositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });

    this._logger.info('Finished analyzing member composition');
  }
}

export const createMemberCompositionTask = (
  options: ConstructorParameters<typeof MemberCompositionAnalyzerImpl>[0]
): MemberCompositionTask => {
  const analyzer = new MemberCompositionAnalyzerImpl(options);
  return new Task(
    'Add Member',
    new IntervalSchedule(0, 10 * 1000 /* 1min */),
    async () => analyzer.execute()
  );
};


export const MemberCompositionTask = depend(
  {
    logger: Logger,
    serverClient: ServerClient
  },
  createMemberCompositionTask
);
