import { useClient } from './use-client';
import type { ResourceLike } from '../util';
import { Resource, Client } from 'ketting';
import { shallowRef } from 'vue'
import type { Ref } from 'vue'

type UseResolveResourceResult<T> = {
  error: Ref<Error | null>,
  resource: Ref<Resource<T> | undefined>,
}

/**
 * This is an internal hook that takes a 'ResourceLike', and turns it into
 * a real materialized resource.
 */
export function useResolveResource<T>(resourceLike: ResourceLike<T> | string): UseResolveResourceResult<T> {

  const client = useClient();
  const quick = quickResolve(client, resourceLike)
  const resource = shallowRef<Resource<T> | undefined>();
  const error = shallowRef<Error | null>(null);

  if (quick) {
    setTimeout(() => {
      resource.value = quick
    })
  } else {
    Promise.resolve(resourceLike as PromiseLike<Resource<T>>)
      .then(newVal => {
        resource.value = newVal
      })
      .catch(err => {
        error.value = err
      })
  }

  return {
    resource,
    error
  };
}

/**
 * Helper function that will immediately return a resource for a resourcelike,
 * but only if this can be done synchronously.
 */
function quickResolve<T>(client: Client, resourceLike: ResourceLike<T>): Resource<T> | undefined {

  if (typeof resourceLike === 'string') {
    return client.go(resourceLike);
  }
  if (resourceLike instanceof Resource) {
    return resourceLike;
  }

}
