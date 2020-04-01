import * as CommonResponse from '../common-response';


export const path = '/api/spaces';


type ResponseData = ReadonlyArray<{
  readonly spaceId: string;
  readonly spaceName: string;
}>;

export interface ResponseBody extends CommonResponse.ResponseBody<ResponseData> {}

export const responseBodySchema = CommonResponse.responseBodySchema({
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
});

export const fromResponseBodyJson =
  CommonResponse.fromResponseBodyJson<ResponseData>((json) => json);

export const toResponseBodyJson =
  CommonResponse.toResponseBodyJson<ResponseData>((obj) => obj);
