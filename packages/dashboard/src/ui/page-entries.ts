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
