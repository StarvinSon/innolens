import { createToken } from '@innolens/resolver';


export interface DashboardOptions {
  readonly clientId: string;
}

export const DashboardOptions = createToken<DashboardOptions>('DashboardOptions');
