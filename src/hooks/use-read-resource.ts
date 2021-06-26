import { Resource, State as ResourceState } from 'ketting';
import { shallowRef, watch, computed } from 'vue';
import type { Ref } from 'vue'
import { ResourceLike } from '../util';
import { useClient } from './use-client';
import { Client } from 'ketting';
import { useResolveResource } from './use-resolve-resource';

type UseReadResourceResponse<T> = {

  // True if there is no data yet
  loading: Ref<boolean>;
  error: Ref<Error | null>;

  /**
   * The ResourceState.
   *
   * Note that this will be `null` until loading is "false".
   */
  resourceState: Ref<ResourceState<T> | undefined>;

  /**
   * The 'real' resource.
   *
   * This will be `null` until we have it. It's not typed null because it
   * makes it very clumsy to work with the hook.
   */
  resource: Ref<Resource<T> | undefined>;
}

export type UseReadResourceOptions<T> = {
  resource: ResourceLike<T>,
  initialState?: ResourceState<T>,
  refreshOnStale?: boolean,
  mode?: 'PUT' | 'POST' | 'GET'

  /**
   * HTTP headers to include if there was no existing cache, and the initial
   * GET request must be done to get the state.
   *
   * These headers are not used on subsequent refreshes/stale cases.
   */
  initialGetRequestHeaders?: Record<string, string>;

};

/**
 * The useReadResource hook is an internal hook that helps setting up a lot of
 * the plumbing for dealing with resources and state.
 *
 * It's not recommended for external users to use this directly, instead use
 * one of the more specialized hooks such as useResource or useCollection.
 *
 * Example call:
 *
 * <pre>
 *   const {
 *     loading,
 *     error,
 *     resourceState,
 *  } = useResource(resource);
 * </pre>
 *
 * Returned properties:
 *
 * * loading - will be true as long as the result is still being fetched from
 *             the server.
 * * error - Will be null or an error object.
 * * resourceState - A state object. The `.data` property of this object will
 *                   contain the parsed JSON from the server.
 */
export function useReadResource<T>(options: UseReadResourceOptions<T>): UseReadResourceResponse<T> {

  const {resource} = useResolveResource(options.resource);
  const { initialState, refreshOnStale, mode } = options
  const client = useClient();

  const {resourceState, loading} = useResourceState(resource, initialState, client);
  const error = shallowRef<null|Error>(null);

  watch(resource, (val, _oldVal, onInvalidate) => {
      // This effect is for setting up the onUpdate event
      if(!val || mode === 'POST') return

      const onUpdate = (newState: ResourceState<T>) => {
        resourceState.value = newState.clone()
        loading.value = false
      };

      const onStale = () => {
        if (refreshOnStale) {
          val
            .refresh()
            .catch(err => {
              error.value = err;
            });
        }
      };

      val.on('update', onUpdate);
      val.on('stale', onStale);

      onInvalidate(function unmount() {
        val.off('update', onUpdate);
        val.off('stale', onStale);
      })
  }, {immediate: true})

  watch(resource, val => {
      // This effect is for fetching the initial ResourceState
      if(!val) return
      const state = resourceState.value

      // Don't do anything if we already have a resourceState, and the
      // resourceState's uri matches what we got.
      //
      // This likely means we got the resourceState from the initial
      // useResourceState hook.
      if(state && state.uri === val.uri) return

      // The 'resource' property has changed, so lets get the new resourceState and data.
      const cachedState = val.client.cache.get(val.uri);
        if (cachedState) {
            resourceState.value = cachedState
            loading.value = false
            return;
        } 
        
        resourceState.value = undefined;
        loading.value = true

        val.get({ headers: options.initialGetRequestHeaders })
            .then(newState => {
                resourceState.value = newState.clone()
                loading.value = false
            })
            .catch(err => {
                error.value = err
                loading.value = false
            });
  }, {immediate: true})

  const result: UseReadResourceResponse<T> = {
    loading,
    error,
    resourceState,
    resource,
  };

  return result;

}

/**
 * Internal helper hook to deal with setting up the resource state, and
 * populate the cache.
 */
function useResourceState<T>(
  resource: Ref<Resource<T> | undefined>,
  initialData: undefined | ResourceState<T>,
  client: Client,
) {

  const data = 
    initialData || 
    (resource instanceof Resource && client.cache.get(resource.uri)) || 
    undefined

  const loading = shallowRef(!data)

  const theRef = shallowRef<ResourceState<T>| undefined>(data)

  watch(resource, val => {
      if(!val) return
      theRef.value = client.cache.get(val.uri) || initialData
  })

  return {resourceState: theRef, loading}
}
