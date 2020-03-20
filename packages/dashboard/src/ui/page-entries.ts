export interface PageEntry {
  readonly name: string;
  readonly href: string;
  readonly pathRegExp: RegExp;
  readonly load: () => Promise<void>;
  readonly tagName: keyof HTMLElementTagNameMap;
}

export const pageEntries: ReadonlyArray<PageEntry> = [
  {
    name: 'Home',
    href: '/',
    pathRegExp: /^\/$/,
    load: async () => void import(
      /* webpackChunkName: 'home-page' */
      './home-page'
    ),
    tagName: 'inno-home-page'
  },
  {
    name: 'Users',
    href: '/users',
    pathRegExp: /^\/users$/,
    load: async () => void import(
      /* webpackChunkName: 'users-page' */
      './users-page'
    ),
    tagName: 'inno-users-page'
  },
  {
    name: 'Spaces',
    href: '/spaces',
    pathRegExp: /^\/spaces$/,
    load: async () => void import(
      /* webpackChunkName: 'spaces-page' */
      './spaces-page'
    ),
    tagName: 'inno-spaces-page'
  },
  {
    name: 'Machines',
    href: '/machines',
    pathRegExp: /^\/machines$/,
    load: async () => void import(
      /* webpackChunkName: 'machines-page' */
      './machines-page'
    ),
    tagName: 'inno-machines-page'
  },
  {
    name: 'About',
    href: '/about',
    pathRegExp: /^\/about$/,
    load: async () => void import(
      /* webpackChunkName: 'about-page' */
      './about-page'
    ),
    tagName: 'inno-about-page'
  }
];
