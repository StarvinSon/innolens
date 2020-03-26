import { svg, SVGTemplateResult } from 'lit-html';

import { svgClassMap, SvgClassInfo } from './svg-class-map';


// https://fonts.gstatic.com/s/i/materialiconsoutlined/expand_more/v4/24px.svg
export const expandMoreIcon = (classInfo: SvgClassInfo = ''): SVGTemplateResult => svg`
  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" class="${svgClassMap(classInfo)}">
    <path d="M24 24H0V0h24v24z" fill="none" opacity=".87"/>
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/>
  </svg>
`;
