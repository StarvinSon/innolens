import { Logger } from 'winston';

import { AppDbClient } from '../db';


export interface CommonServiceOptions<T> {
  readonly logger: Logger;
  readonly appDbClient: AppDbClient<T>;
}
