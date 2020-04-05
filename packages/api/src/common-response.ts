import { ToJson } from './conversion';


export interface ResponseBody<T> {
  readonly data: T;
}

export const responseBodyJsonSchema = (
  dataSchema: object,
  definitions?: Readonly<Record<string, object>>
): object => ({
  type: 'object',
  additionalProperties: false,
  required: ['data'],
  properties: {
    data: dataSchema
  },
  definitions: definitions ?? {}
});

export const toResponseBodyJson = <T>(toJsonData: (data: T) => ToJson<T>) =>
  (obj: ResponseBody<T>): ResponseBody<ToJson<T>> => ({
    data: toJsonData(obj.data)
  });

export const fromResponseBodyJson = <T>(fromJsonData: (data: ToJson<T>) => T) =>
  (json: ResponseBody<ToJson<T>>): ResponseBody<T> => ({
    data: fromJsonData(json.data)
  });
