export type PromiseValue<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : never;
