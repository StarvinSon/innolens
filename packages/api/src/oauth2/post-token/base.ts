import { ToJson } from '../../conversion';


export interface RequestBody {
  readonly grant_type: string;
}

export const requestBodySchema: object = {
  type: 'object',
  required: ['grant_type'],
  properties: {
    grant_type: {
      type: 'string'
    }
  }
};

export const fromRequestBodyJson = (json: ToJson<RequestBody>): RequestBody => json;
