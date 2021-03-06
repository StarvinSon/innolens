import * as CommonResponse from '../common-response';


export const path = '/api/members/affiliated-student-interest-group';


type ResponseData = ReadonlyArray<string>;

export interface ResponseBody extends CommonResponse.ResponseBody<ResponseData> {}

export const responseBodyJsonSchema = CommonResponse.responseBodyJsonSchema({
  type: 'array',
  items: {
    type: 'string'
  }
});

export const toResponseBodyJson =
  CommonResponse.toResponseBodyJson<ResponseData>((obj) => obj);

export const fromResponseBodyJson =
  CommonResponse.fromResponseBodyJson<ResponseData>((json) => json);
