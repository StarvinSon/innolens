import { svg, SVGTemplateResult } from 'lit-html';

import { svgClassMap, SvgClassInfo } from './svg-class-map';


// https://fonts.gstatic.com/s/i/materialiconsoutlined/menu/v4/24px.svg
export const menuIcon = (classInfo: SvgClassInfo = ''): SVGTemplateResult => svg`
  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" class="${svgClassMap(classInfo)}">
    <path d="M0 0h24v24H0V0z" fill="none"/>
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
`;
