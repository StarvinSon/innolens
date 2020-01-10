import {
  uniqueNamesGenerator, adjectives, names,
  animals
} from 'unique-names-generator';

import { ContextFunction } from '../context';
import { Task } from '../utils/scheduler/task';
import { IntervalSchedule } from '../utils/scheduler/schedules/interval';
import { Scheduler } from '../scheduler';
import { ServerClient } from '../server-client';
import { Logger } from '../logger';


interface MemberCreateData {
  readonly memberId: string;
  readonly name: string;
  readonly department: string;
  readonly typeOfStudy: string;
  readonly yearOfStudy: string;
  readonly studyProgramme: string;
  readonly affiliatedStudentInterestGroup: string;
}


const namesAndAnimals = names.concat(animals);

const departments: ReadonlyArray<string> = [
  'Civil Engineering',
  'Computer Science',
  'Electrical and Electronic Engineering',
  'Industrial and Manufacturing Systems Engineering',
  'Mechanical Engineering'
].map((d) => d.toUpperCase().replace(/ /g, '_'));

const typeOfStudies: ReadonlyArray<string> = [
  'Undergraduate',
  'Taught Postgraduate',
  'Research postgraduate'
].map((d) => d.toUpperCase().replace(/ /g, '_'));

const yearOfStudies: ReadonlyArray<string> = [
  '1',
  '2',
  '3',
  '4',
  '5'
];

const studyProgrammes: ReadonlyArray<string> = [
  'BEng in Civil Engineering',
  'BEng in Computer Science',
  'BEng in Computer Engineering',
  'BEng in Electrical Engineering',
  'BEng in Electronic Engineering',
  'BEng in Industrial Engineering and Logistics Management',
  'BEng in Mechanical Engineering',
  'BEng in Engineering Science',
  'BEng in Biomedical Engineering'
].map((d) => d.toUpperCase().replace(/ /g, '_'));

const affiliatedStudentInterestGroups: ReadonlyArray<string> = [
  'COMP1000',
  'COMP2000',
  'COMP3000',
  'COMP4000'
];


let lastTime = 0;
let lastIncrement = 0;
const randomMemberId = (): string => {
  const time = Date.now();
  if (time === lastTime) {
    lastIncrement += 1;
  } else {
    lastTime = time;
    lastIncrement = 0;
  }
  if (lastIncrement >= 100) {
    throw new Error('Increment overflow');
  }
  return String(lastTime * 100 + lastIncrement);
};

const randomElement = <T>(list: ReadonlyArray<T>): T => {
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
};

const randomName = (): string => uniqueNamesGenerator({
  dictionaries: [adjectives, namesAndAnimals],
  length: 2,
  separator: ' ',
  style: 'capital'
});

const randomDepartment = (): string => randomElement(departments);

const randomTypeOfStudy = (): string => randomElement(typeOfStudies);

const randomYearOfStudy = (): string => randomElement(yearOfStudies);

const randomStudyProgramme = (): string => randomElement(studyProgrammes);

const randomAffiliatedStudentInterestGroup = (): string =>
  randomElement(affiliatedStudentInterestGroups);


export const initMemberTask: ContextFunction = (ctx) => {
  const [
    logger,
    scheduler,
    serverClient
  ] = ctx.resolveAll(
    Logger,
    Scheduler,
    ServerClient
  );

  scheduler.addTask(new Task(
    'Add Member',
    new IntervalSchedule(0, 10 * 1000 /* 10s */),
    async () => {
      const members: ReadonlyArray<MemberCreateData> = [...Array(Math.floor(Math.random() * 3))]
        .map(() => ({
          memberId: randomMemberId(),
          name: randomName(),
          department: randomDepartment(),
          typeOfStudy: randomTypeOfStudy(),
          yearOfStudy: randomYearOfStudy(),
          studyProgramme: randomStudyProgramme(),
          affiliatedStudentInterestGroup: randomAffiliatedStudentInterestGroup()
        }));

      logger.info('Uploading members');
      await serverClient
        .authenticatedFetchOk('/api/members', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(members)
        });

      logger.info('Members uploaded');
    }
  ));
};
