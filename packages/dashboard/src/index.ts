/// <reference types="reflect-metadata" />

import './ui/app';
import {
  createResolver, Token, FactoryOrConstructor,
  decorate, injectableFactory, singleton, name
} from '@innolens/resolver';
import { render, html } from 'lit-html';
import { installRouter } from 'pwa-helpers/router';

import { DashboardOptions } from './dashboard-options';
import { serviceCreators } from './services';
import { PathService } from './services/path';
import { css, classes } from './style.scss';
import { injectTemplate } from './ui/element-property-injector';
import { addRootStyle } from './ui/root-style';


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
    pathService.set(location.pathname);
  });

  addRootStyle(css);

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
