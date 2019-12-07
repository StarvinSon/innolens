import { INTERNAL_SERVER_ERROR, getStatusText } from 'http-status-codes';


export interface ErrorOptions {
  readonly statusCode: number;
  readonly headers?: { readonly [key: string]: string; };
  readonly errorCode: string;
  readonly description?: string;
}

export const createError = (options: ErrorOptions): Error => {
  const statusCode = options?.statusCode ?? INTERNAL_SERVER_ERROR;
  const headers = options?.headers ?? {};
  const errorCode = options?.errorCode ?? 'internal_error';
  const description = options?.description ?? '';
  return Object.assign(
    new Error(`${statusCode} ${getStatusText(statusCode)}, ${errorCode}, ${description}`),
    {
      statusCode,
      headers,
      errorCode,
      description
    }
  );
};
