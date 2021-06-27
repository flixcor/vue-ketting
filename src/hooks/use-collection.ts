import { Resource, State as ResourceState } from 'ketting';
import type { ResourceLike } from '../util'
import { watch, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { useReadResource } from './use-read-resource';

/**
 * The result of a useCollection hook.
 */
type UseCollectionResponse<T> = {

  /**
   * True if there is no data or no error yet
   */
  loading: Readonly<Ref<boolean>>;

  /**
   * Will contain an Error object if an error occurred anywhere in the
   */
  error: Readonly<Ref<Readonly<Error> | null>>;

  /**
   * List of collection members.
   *
   * This starts off as an empty array.
   */
  items: Readonly<Ref<Readonly<Array<Resource<T>>>>>;

}

/**
 * Options that may be given to useCollection
 */
export type UseCollectionOptions = {

  /**
   * By default useCollection will follow the 'item' relation type to find
   * collection members.
   *
   * Change this option to follow a list of other links.
   */
  rel?: string;

  /**
   * If the collection receives 'stale' events and this is set to true,
   * this will automatically grab the latest version from the server.
   *
   * 'stale' events are emitted by a number of different processes, such as
   * unsafe methods on the collection, or even manually triggered.
   */
  refreshOnStale?: boolean;
}

/**
 * The useCollection hook allows you to get a list of resources
 * inside a collection.
 *
 * This hook makes a few assumptions:
 *
 * 1. The collection is some hypermedia document, such as HAL, HTML, Siren,
 *    or anything Ketting supports.
 * 2. The collection lists its members via 'item' web links.
 *
 * Example call:
 *
 * <pre>
 *   const {
 *     loading,
 *     error,
 *     items
 *  } = useResource<Article>(resource);
 * </pre>
 *
 * The resource may be passed as a Resource object, a Promise<Resource>, or a
 * uri string.
 *
 * Returned properties:
 *
 * * loading - will be true as long as the result is still being fetched from
 *             the server.
 * * error - Will be null or an error object.
 * * items - Will contain an array of resources, each typed Resource<T> where
 *           T is the passed generic argument.
 */
export function useCollection<T = any>(resourceLike: ResourceLike<any>, options?: UseCollectionOptions): UseCollectionResponse<T> {

  const rel = options?.rel || 'item';

  const { resourceState, loading, error } = useReadResource({
    resource: resourceLike,
    refreshOnStale: options?.refreshOnStale,
    initialGetRequestHeaders: {
      Prefer: 'transclude=' + rel,
    }
  })

  const items = shallowRef<Resource<T>[]>([]);

  watch(resourceState, val => {
    if (!val) return
    items.value = val.followAll(rel)
  }, {
    immediate: true
  })

  return {
    loading,
    error,
    items,
  };

}
