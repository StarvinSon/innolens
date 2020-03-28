import { ToJson } from '../conversion';

export const path = '/api/spaces';


export type Response = ReadonlyArray<{
  readonly spaceId: string;
  readonly spaceName: string;
}>;

export type ResponseJson = ToJson<Response>;

export const responseJsonSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['spaceId', 'spaceName'],
    properties: {
      spaceId: {
        type: 'string'
      },
      spaceName: {
        type: 'string'
      }
    }
  }
};

export const fromResponseJson = (json: ResponseJson): Response => json;

export const toResponseJson = (res: Response): ResponseJson => res;
