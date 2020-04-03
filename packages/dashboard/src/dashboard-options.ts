import { createToken } from '@innolens/resolver/web';


export interface DashboardOptions {
  readonly clientId: string;
}

export const DashboardOptions = createToken<DashboardOptions>('DashboardOptions');
