import { Resource } from 'ketting';
export type ResourceLike<T> = Resource<T> | PromiseLike<Resource<T>> | string;