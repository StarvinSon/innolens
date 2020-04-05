import { AggregationCursor } from 'mongodb';


export interface TypedAggregationCursor<T> extends AggregationCursor<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
