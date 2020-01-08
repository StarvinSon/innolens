import { TokenOrCreator, ResolverFunction } from '../../resolver';
import { bindProxy } from '../../utils/bind-proxy';


export const bindController =
  <T extends object>(token: TokenOrCreator<T>): ResolverFunction<T> =>
    (resolver) => {
      const val = resolver.resolve(token);
      return bindProxy(val);
    };

export const bindAsyncController =
  <T extends object>(token: TokenOrCreator<T | Promise<T>>): ResolverFunction<Promise<T>> =>
    async (resolver) => {
      const val = await resolver.resolve(token);
      return bindProxy(val);
    };
