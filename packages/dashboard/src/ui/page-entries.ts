export interface PageEntry {
  readonly type: 'pageEntry';
  readonly name: string;
  readonly href: string;
  readonly pathRegExp: RegExp;
  readonly load: () => Promise<void>;
  readonly tagName: keyof HTMLElementTagNameMap;
}

export interface PageGroupEntry {
  readonly type: 'pageGroupEntry';
  readonly name: string;
  readonly pages: ReadonlyArray<PageEntry | PageGroupEntry>;
}

export const pageEntries: ReadonlyArray<PageEntry | PageGroupEntry> = [
  {
    type: 'pageEntry',
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
    type: 'pageGroupEntry',
    name: 'Members',
    pages: [
      {
        type: 'pageEntry',
        name: 'Overall',
        href: '/members/overall',
        pathRegExp: /^\/members\/overall$/,
        load: async () => void import(
          /* webpackChunkName: 'members-overall-page' */
          './members-overall-page'
        ),
        tagName: 'inno-members-overall-page'
      },
      {
        type: 'pageEntry',
        name: 'Groups',
        href: '/members/groups',
        pathRegExp: /^\/members\/groups$/,
        load: async () => void import(
          /* webpackChunkName: 'members-groups-page' */
          './members-groups-page'
        ),
        tagName: 'inno-members-groups-page'
      }
    ]
  },
  {
    type: 'pageGroupEntry',
    name: 'Users',
    pages: [
      {
        type: 'pageEntry',
        name: 'Registered users',
        href: '/users/registered',
        pathRegExp: /^\/users\/registered$/,
        load: async () => void import(
          /* webpackChunkName: 'users-registered-page' */
          './users-registered-page'
        ),
        tagName: 'inno-users-registered-page'
      },
      {
        type: 'pageEntry',
        name: 'Current users',
        href: '/users/current',
        pathRegExp: /^\/users\/current$/,
        load: async () => void import(
          /* webpackChunkName: 'users-current-page' */
          './users-current-page'
        ),
        tagName: 'inno-users-current-page'
      }
    ]
  },
  {
    type: 'pageEntry',
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
    type: 'pageGroupEntry',
    name: 'Machines',
    pages: [
      {
        type: 'pageEntry',
        name: 'All machines',
        href: '/machines',
        pathRegExp: /^\/machines$/,
        load: async () => void import(
          /* webpackChunkName: 'machines-page' */
          './machines-page'
        ),
        tagName: 'inno-machines-page'
      },
      {
        type: 'pageEntry',
        name: 'Waterjet cutting machine',
        href: '/machines/waterjet-cutting-machine',
        pathRegExp: /^\/machines\/waterjet-cutting-machine$/,
        load: async () => void import(
          /* webpackChunkName: 'machines-single-page' */
          './machines-single-page'
        ),
        tagName: 'inno-machines-single-page'
      },
      {
        type: 'pageEntry',
        name: 'CNC milling machine',
        href: '/machines/cnc-milling-machine',
        pathRegExp: /^\/machines\/cnc-milling-machine$/,
        load: async () => void import(
          /* webpackChunkName: 'machines-single-page' */
          './machines-single-page'
        ),
        tagName: 'inno-machines-single-page'
      },
      {
        type: 'pageEntry',
        name: 'Acrylic laser cut machine',
        href: '/machines/acrylic-laser-cut-machine',
        pathRegExp: /^\/machines\/acrylic-laser-cut-machine$/,
        load: async () => void import(
          /* webpackChunkName: 'machines-single-page' */
          './machines-single-page'
        ),
        tagName: 'inno-machines-single-page'
      },
      {
        type: 'pageEntry',
        name: 'Metal laser cut machine',
        href: '/machines/metal-laser-cut-machine',
        pathRegExp: /^\/machines\/metal-laser-cut-machine$/,
        load: async () => void import(
          /* webpackChunkName: 'machines-single-page' */
          './machines-single-page'
        ),
        tagName: 'inno-machines-single-page'
      }
    ]
  },
  {
    type: 'pageEntry',
    name: 'Import Center',
    href: '/import',
    pathRegExp: /^\/import$/,
    load: async () => void import(
      /* webpackChunkName: 'import-page' */
      './import-page'
    ),
    tagName: 'inno-import-page'
  },
  {
    type: 'pageEntry',
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
