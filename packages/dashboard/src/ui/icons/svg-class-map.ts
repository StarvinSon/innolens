export type SvgClassInfo = string | SvgClassInfoMap;

export interface SvgClassInfoMap {
  readonly [name: string]: boolean;
}

export const svgClassMap = (classInfo: SvgClassInfo): string =>
  typeof classInfo === 'string'
    ? classInfo
    : Object
      .entries(classInfo)
      .filter(([, val]) => val)
      .map(([key]) => key)
      .join(' ');
