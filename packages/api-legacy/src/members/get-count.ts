import * as CommonResponse from '../common-response';


export const path = '/api/members/count';


type ResponseData = number;

export interface ResponseBody extends CommonResponse.ResponseBody<ResponseData> {}

export const responseBodyJsonSchema = CommonResponse.responseBodyJsonSchema({
  type: 'integer'
});

export const toResponseBodyJson =
  CommonResponse.toResponseBodyJson<ResponseData>((obj) => obj);

export const fromResponseBodyJson =
  CommonResponse.fromResponseBodyJson<ResponseData>((json) => json);
