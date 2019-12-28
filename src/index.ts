import './components/app';
import { supportsAdoptingStyleSheets } from 'lit-element';
import { render, html } from 'lit-html';
import { installRouter } from 'pwa-helpers/router';

import { createContext } from './context-impl';
import { styleCss, styleClasses } from './index.scss';
import { PathActions } from './state/path';


const context = createContext();

const pathActions = context.resolve(PathActions);
installRouter((location) => {
  pathActions.set(location.href);
});


if (supportsAdoptingStyleSheets) {
  document.adoptedStyleSheets = [
    ...document.adoptedStyleSheets,
    styleCss.styleSheet!
  ];
} else {
  const styleElem = document.createElement('style');
  styleElem.textContent = styleCss.cssText;
  document.head.appendChild(styleElem);
}

render(
  html`<inno-app class="${styleClasses.app}" .context="${context}"></inno-app>`,
  document.body
);
