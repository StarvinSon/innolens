import { createToken } from './context';


export interface CrawlerOptions {
  readonly serverHost: string;
  readonly clientId: string;
  readonly username: string;
  readonly password: string;
}

export const CrawlerOptions = createToken<CrawlerOptions>(__filename, 'CrawerOptions');
