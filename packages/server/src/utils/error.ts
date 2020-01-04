export interface HttpError extends Error {
  readonly statusCode?: number;
  readonly headers?: Readonly<Record<string, string>>;
}


export interface ErrorOptions {
  readonly statusCode?: number;
  readonly headers?: { readonly [key: string]: string; };
  readonly errorCode?: string;
  readonly description: string;
}

export const createError = (options: ErrorOptions): Error => {
  const error = Object.assign(new Error(options.description), options);
  Error.captureStackTrace(error, createError);
  return error;
};
