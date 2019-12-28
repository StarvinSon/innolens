export interface ErrorOptions {
  readonly statusCode?: number;
  readonly headers?: { readonly [key: string]: string; };
  readonly errorCode?: string;
  readonly description: string;
}

export const createError = (options: ErrorOptions): Error =>
  Object.assign(new Error(options.description), options);
