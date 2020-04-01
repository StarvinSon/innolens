import * as CommonResponse from '../common-response';


export const path = '/api/members/departments';


type ResponseData = ReadonlyArray<string>;

export interface ResponseBody extends CommonResponse.ResponseBody<ResponseData> {}

export const responseBodySchema = CommonResponse.responseBodySchema({
  type: 'array',
  items: {
    type: 'string'
  }
});

export const toResponseBodyJson =
  CommonResponse.toResponseBodyJson<ResponseData>((obj) => obj);

export const fromResponseBodyJson =
  CommonResponse.fromResponseBodyJson<ResponseData>((json) => json);
