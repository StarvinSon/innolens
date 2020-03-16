import { CSSResult, supportsAdoptingStyleSheets } from 'lit-element';


export const addRootStyle = (cssResult: CSSResult): void => {
  if (supportsAdoptingStyleSheets) {
    document.adoptedStyleSheets = [
      ...document.adoptedStyleSheets,
      cssResult.styleSheet!
    ];
  } else {
    const styleElem = document.createElement('style');
    styleElem.textContent = cssResult.cssText;
    document.head.appendChild(styleElem);
  }
};
