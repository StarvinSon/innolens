import { createToken } from './resolver';


export interface AnalyzerOptions {
  readonly serverHost: string;
  readonly clientId: string;
  readonly username: string;
  readonly password: string;
}


export const AnalyzerOptions = createToken<AnalyzerOptions>(__filename, 'AnalyzerOptions');
