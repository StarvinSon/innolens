import * as CommonResponse from '../common-response';


export const path = '/api/spaces';


type ResponseData = ReadonlyArray<{
  readonly spaceId: string;
  readonly spaceName: string;
  readonly spaceCapacity: number;
}>;

export interface ResponseBody extends CommonResponse.ResponseBody<ResponseData> {}

export const responseBodyJsonSchema = CommonResponse.responseBodyJsonSchema({
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['spaceId', 'spaceName', 'spaceCapacity'],
    properties: {
      spaceId: {
        type: 'string'
      },
      spaceName: {
        type: 'string'
      },
      spaceCapacity: {
        type: 'integer'
      }
    }
  }
});

export const fromResponseBodyJson =
  CommonResponse.fromResponseBodyJson<ResponseData>((json) => json);

export const toResponseBodyJson =
  CommonResponse.toResponseBodyJson<ResponseData>((obj) => obj);
