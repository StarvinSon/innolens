import { createToken } from '@innolens/resolver/lib-web';


export interface DashboardOptions {
  readonly clientId: string;
}

export const DashboardOptions = createToken<DashboardOptions>('DashboardOptions');
