import { Resource } from 'ketting';
import { shallowRef, readonly } from 'vue';

const readonlyRef = 'readonlyRef'

class Wrapper<T> {
    // wrapped has no explicit return type so we can infer it
    [readonlyRef](e: T) {
        return readonly(shallowRef(e))
    }
}

export type ReadonlyRef<T> = ReturnType<Wrapper<T>[typeof readonlyRef]>
export type ResourceLike<T> = Resource<T> | PromiseLike<Resource<T>> | string;