export interface PageEntry {
  readonly type: 'pageEntry';
  readonly name: string;
  readonly href: string;
  readonly pathRegExp?: RegExp;
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
    load: async () => {
      await import(
        /* webpackChunkName: 'home-page' */
        './user-pages'
      );
    },
    tagName: 'inno-user-pages'
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
        load: async () => {
          await import(
            /* webpackChunkName: 'members-overall-page' */
            './members-overall-page'
          );
        },
        tagName: 'inno-members-overall-page'
      },
      {
        type: 'pageEntry',
        name: 'Groups',
        href: '/members/groups',
        pathRegExp: /^\/members\/groups$/,
        load: async () => {
          await import(
            /* webpackChunkName: 'members-groups-page' */
            './members-groups-page'
          );
        },
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
        load: async () => {
          await import(
            /* webpackChunkName: 'users-registered-page' */
            './users-registered-page'
          );
        },
        tagName: 'inno-users-registered-page'
      },
      {
        type: 'pageEntry',
        name: 'Current users',
        href: '/users/current',
        pathRegExp: /^\/users\/current$/,
        load: async () => {
          await import(
            /* webpackChunkName: 'users-current-page' */
            './users-current-page'
          );
        },
        tagName: 'inno-users-current-page'
      }
    ]
  },
  {
    type: 'pageEntry',
    name: 'Spaces',
    href: '/spaces',
    pathRegExp: /^\/spaces$/,
    load: async () => {
      await import(
        /* webpackChunkName: 'spaces-page' */
        './spaces-page'
      );
    },
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
        load: async () => {
          await import(
            /* webpackChunkName: 'machines-page' */
            './machines-page'
          );
        },
        tagName: 'inno-machines-page'
      },
      {
        type: 'pageEntry',
        name: 'Waterjet cutting machine',
        href: '/machines/waterjet-cutting-machine',
        pathRegExp: /^\/machines\/waterjet-cutting-machine$/,
        load: async () => {
          await import(
            /* webpackChunkName: 'machines-single-page' */
            './machines-single-page'
          );
        },
        tagName: 'inno-machines-single-page'
      },
      {
        type: 'pageEntry',
        name: 'CNC milling machine',
        href: '/machines/cnc-milling-machine',
        pathRegExp: /^\/machines\/cnc-milling-machine$/,
        load: async () => {
          await import(
            /* webpackChunkName: 'machines-single-page' */
            './machines-single-page'
          );
        },
        tagName: 'inno-machines-single-page'
      },
      {
        type: 'pageEntry',
        name: 'Acrylic laser cut machine',
        href: '/machines/acrylic-laser-cut-machine',
        pathRegExp: /^\/machines\/acrylic-laser-cut-machine$/,
        load: async () => {
          await import(
            /* webpackChunkName: 'machines-single-page' */
            './machines-single-page'
          );
        },
        tagName: 'inno-machines-single-page'
      },
      {
        type: 'pageEntry',
        name: 'Metal laser cut machine',
        href: '/machines/metal-laser-cut-machine',
        pathRegExp: /^\/machines\/metal-laser-cut-machine$/,
        load: async () => {
          await import(
            /* webpackChunkName: 'machines-single-page' */
            './machines-single-page'
          );
        },
        tagName: 'inno-machines-single-page'
      }
    ]
  },
  {
    type: 'pageEntry',
    name: 'Reusable Inventory',
    href: '/reusable-inventories',
    load: async () => {
      await import(
        /* webpackChunkName: 'reusable-inventories-page' */
        './reusable-inventories-page'
      );
    },
    tagName: 'inno-reusable-inventories-page'
  },
  {
    type: 'pageEntry',
    name: 'Expendable Inventory',
    href: '/expendable-inventories',
    load: async () => {
      await import(
        /* webpackChunkName: 'expendable-inventories-page' */
        './expendable-inventories-page'
      );
    },
    tagName: 'inno-expendable-inventories-page'
  },
  {
    type: 'pageEntry',
    name: 'Import Center',
    href: '/import',
    pathRegExp: /^\/import$/,
    load: async () => {
      await import(
        /* webpackChunkName: 'import-page' */
        './import-page'
      );
    },
    tagName: 'inno-import-page'
  },
  {
    type: 'pageEntry',
    name: 'About',
    href: '/about',
    pathRegExp: /^\/about$/,
    load: async () => {
      await import(
        /* webpackChunkName: 'about-page' */
        './about-page'
      );
    },
    tagName: 'inno-about-page'
  }
];
