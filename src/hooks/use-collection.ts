import { Resource, State as ResourceState } from 'ketting';
import type { ReadonlyRef, ResourceLike  } from '../util'
import { useResolveResource } from './use-resolve-resource';
import { watch, shallowRef } from 'vue'

/**
 * The result of a useCollection hook.
 */
type UseCollectionResponse<T> = {

  /**
   * True if there is no data or no error yet
   */
  loading: ReadonlyRef<boolean>;

  /**
   * Will contain an Error object if an error occurred anywhere in the
   */
  error: ReadonlyRef<Error | null>;

  /**
   * List of collection members.
   *
   * This starts off as an empty array.
   */
  items: ReadonlyRef<Resource<T>[]>;

}

/**
 * Options that may be given to useCollection
 */
type UseCollectionOptions = {

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

  const { resource, error: resolveError } = useResolveResource(resourceLike);

  const loading = shallowRef(true);
  const error = shallowRef<null|Error>(null);
  const items = shallowRef<Resource<T>[]>([]);

  watch(resource, (val, _old, onInvalidate) => {
    if(!val) {
      loading.value = true
      items.value = []
      return
    }

    val.followAll(rel)
      .preferTransclude()
      .then(result => {
        items.value = result
        loading.value = false
      })
      .catch(err => {
        error.value = err
        loading.value = false
      });

    const updateHandler = (newState: ResourceState) => {
      const newItems = newState.links
        .getMany(rel)
        .map(link => val.go(link.href));

      items.value = newItems
    };

    const staleHandler = () => {
      if (options?.refreshOnStale) {
        val
          .refresh()
          .catch(err => {
            error.value = err
          })
      }
    };

    val.on('update', updateHandler);
    val.on('stale', staleHandler);

    onInvalidate(function cleanup() {
      val.off('update', updateHandler);
      val.off('stale', staleHandler);
    })
  }, { immediate: true })

  watch(resolveError, val => {
    error.value = val
    loading.value = false
  })

  return {
    loading,
    error,
    items,
  };

}
