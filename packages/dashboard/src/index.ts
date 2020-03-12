/// <reference types="reflect-metadata" />

import './ui/app';
import {
  createResolver, Token, FactoryOrConstructor,
  decorate, injectableFactory, singleton, name
} from '@innolens/resolver';
import { supportsAdoptingStyleSheets } from 'lit-element';
import { render, html } from 'lit-html';
import { installRouter } from 'pwa-helpers/router';

import { DashboardOptions } from './dashboard-options';
import { css, classes } from './index.scss';
import { serviceCreators } from './services';
import { PathService } from './services/path';
import { injectTemplate } from './ui/utils/element-property-injector';


const getCreators = (
  dashboardOptions: DashboardOptions
): ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> => [
  ...serviceCreators,
  [DashboardOptions, decorate(
    name('createDashboardOptions'),
    injectableFactory(),
    singleton(),
    () => dashboardOptions
  )]
];

const start = async (options: DashboardOptions): Promise<void> => {
  const resolver = createResolver();
  for (const [token, creator] of getCreators(options)) {
    resolver.register(token, creator);
  }

  const pathService = await resolver.resolve(PathService);
  installRouter((location) => {
    pathService.set(location.href);
  });

  if (supportsAdoptingStyleSheets) {
    document.adoptedStyleSheets = [
      ...document.adoptedStyleSheets,
      css.styleSheet!
    ];
  } else {
    const styleElem = document.createElement('style');
    styleElem.textContent = css.cssText;
    document.head.appendChild(styleElem);
  }

  render(
    injectTemplate(resolver, html`
      <inno-app class="${classes.app}" ></inno-app>
    `),
    document.body
  );
};

start({
  clientId: 'default'
});
