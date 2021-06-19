import type { Client, State as ResourceState, } from 'ketting';
import { HalState, Links, Resource, isState } from 'ketting'
import { watch, readonly, ref, shallowRef } from 'vue'
import { useClient } from './use-client'

type ResourceLike<T> = Resource<T> | PromiseLike<Resource<T>> | string;

const wrapped = 'wrapped'

class Wrapper<T> {
    // wrapped has no explicit return type so we can infer it
    [wrapped](e: T) {
      return readonly(shallowRef(e || undefined))
    }
  }
  
type ReadonlyRef<T> = ReturnType<Wrapper<T>[typeof wrapped]>

type UseResourceResponse<T> = {
    // True if there is no data yet
    loading: ReadonlyRef<boolean>,
    error: ReadonlyRef<Error | null>;
    // A full Ketting State object
    resourceState: ReadonlyRef<ResourceState<T>>;
    // Update the state
    setResourceState: (newState: ResourceState<T>) => void;
    // Send the state to the server via a PUT or POST request.
    submit: () => Promise<void>;
    // The 'data' part of the state.
    data: ReadonlyRef<T>;
    // Update the data from the state.
    setData: (newData: T) => void;
    // The 'real' resource.
    resource: ReadonlyRef<Resource<T>>;
}

export type UseResourceOptions<T> = {
    mode: 'PUT',
    resource: ResourceLike<T>,
    initialState?: T | ResourceState<T>,
    refreshOnStale?: boolean,
} | {
    mode: 'POST',
    resource: ResourceLike<T>,
    initialState: T | ResourceState<T>,
    refreshOnStale?: boolean,
}

/**
 * The useResource hook allows you to GET and PUT the state of
 * a resource.
 *
 * Example call:
 *
 * <pre>
 *   const {
 *     loading,
 *     error,
 *     resourceState,
 *     setResourceState,
 *     submit
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
 * * setResourceState - Update the local cache of the resource.
 * * submit - Send a PUT request to the server.
 *
 * If you don't need the full resourceState, you can also use the `data` and
 * `setData` properties instead of `resourceState` or `useResourceState`.
 *
 * It's also possible to use useResource for making new resources. In this case
 * a POST request will be done instead on a 'collection' resource.
 *
 * If the response to the POST request is 201 Created and has a Location header,
 * subsequent calls to `submit()` turn into `PUT` requests on the new resource,
 * fully managing the lifecycle of creation, and subsequent updates to the
 * resource.
 *
 * Example call:
 *
 * <pre>
 *   const {
 *     loading,
 *     error,
 *     data,
 *     setData,
 *     submit
 *  } = useResource({
 *    resource: resource,
 *    mode: 'POST',
 *    initialState: { foo: bar, title: 'New article!' }
 *  });
 * </pre>
 *
 * To do POST requests you must specifiy initialState with the state the user starts
 * off with.
 */
export function useResource<T extends object>(resource: ResourceLike<T> | string): UseResourceResponse<T>;
export function useResource<T extends object>(options: UseResourceOptions<T>): UseResourceResponse<T>;
export function useResource<T extends object>(arg1: ResourceLike<T> | UseResourceOptions<T> | string): UseResourceResponse<T> {

    const [resourceLike, mode, initialData, refreshOnStale] = getUseResourceOptions(arg1);
    const resource = shallowRef(resourceLike instanceof Resource ? resourceLike : undefined);
    const client = useClient();
    const resourceState = useResourceState(resourceLike, initialData, client);
    const data = shallowRef(resourceState.value?.data)
    const loading = ref(resourceState.value === undefined);
    const error = ref<Error | null>(null)
    const modeVal = ref(mode);

    watch(resourceState, val => {
        data.value = val?.data
    })

    watch(resource, value => {
        // This effect is for setting up the onUpdate event
        if (!value || mode === 'POST') {
            return;
        }

        const onUpdate = (newState: ResourceState<T>) => {
            resourceState.value = newState.clone()
            loading.value = false;
        };

        const onStale = () => {
            if (refreshOnStale) {
                value && value
                    .refresh()
                    .catch(err => {
                        error.value = err
                    });
            }
        };

        value.on('update', onUpdate);
        value.on('stale', onStale);

        return function unmount() {
            value.off('update', onUpdate);
            value.off('stale', onStale);
        };
    })

    watch(resource, value => {
        // This effect is for fetching the initial ResourceState
        if (!value || modeVal.value === 'POST') {
            // No need to fetch resourceState for these cases.
            return;
        }

        const state = resourceState.value

        if (state && state.uri === value.uri) {
            // Don't do anything if we already have a resourceState, and the
            // resourceState's uri matches what we got.
            //
            // This likely means we got the resourceState from the initial
            // useResourceState hook.
            return;
        }

        // The 'resource' property has changed, so lets get the new resourceState and data.
        const cachedState = value.client.cache.get(value.uri);
        if (cachedState) {
            resourceState.value = cachedState;
            loading.value = false
            return;
        }

        resourceState.value = (undefined)
        loading.value = true

        value.get()
            .then(newState => {
                resourceState.value = (newState.clone());
                loading.value = false
            })
            .catch(err => {
                error.value = err
                loading.value = false
            });
    })

    if (resourceLike instanceof Resource) {
        resource.value = (resourceLike);
    } else if (typeof resourceLike === 'string') {
        try {
            resource.value = (client.go(resourceLike));
        } catch (err) {
            error.value = err
        }
    } else {
        Promise.resolve(resourceLike).then(newRes => {
            resource.value = (newRes);
        }).catch(err => {
            error.value = err
            loading.value = false
        });
    }

    const result: UseResourceResponse<T> = {
        loading,
        error,
        resourceState: readonly(resourceState),
        setResourceState: (newState: ResourceState<T>) => {
            if (!resource.value) {
                throw new Error('Too early to call setResourceState, we don\'t have a current state to update');
            }
            if (modeVal.value === 'POST') {
                resourceState.value = (newState);
            } else {
                resource.value.updateCache(newState);
            }
        },
        resource: readonly(resource),
        submit: async () => {
            if (!resourceState.value || !resource.value) {
                throw new Error('Too early to call submit()');
            }
            if (modeVal.value === 'POST') {
                const newResource = await resource.value.postFollow(resourceState.value as any);
                resource.value = (newResource);
                modeVal.value = ('PUT');
            } else {
                await resource.value.put(resourceState.value as any);
            }

        },
        data: readonly(data),
        setData: (d: T) => {
            const res = resource.value
            if (!resourceState.value || !res) {
                throw new Error('Too early to call setData, we don\'t have a current state to update');
            }
            resourceState.value.data = d
            if (modeVal.value !== 'POST') {
                res.updateCache(resourceState.value);
            }
        }

    };

    return result;

}

/**
 * A helper function to process the overloaded arguments of useResource, and return a consistent result
 */
function getUseResourceOptions<T>(arg1: ResourceLike<T> | UseResourceOptions<T> | string): [Resource<T> | PromiseLike<Resource<T>> | string, 'POST' | 'PUT', T | ResourceState<T> | undefined, boolean] {

    let mode: 'POST' | 'PUT';
    let initialState;
    let res;
    let refreshOnStale;

    if (isUseResourceOptions(arg1)) {
        mode = arg1.mode;
        initialState = arg1.initialState;
        res = arg1.resource;
        refreshOnStale = arg1.refreshOnStale ?? false;
    } else {
        mode = 'PUT';
        initialState = undefined;
        res = arg1;
        refreshOnStale = false;
    }

    return [
        res,
        mode,
        initialState,
        refreshOnStale,
    ];

}

/**
 * Internal helper hook to deal with setting up the resource state, and
 * populate the cache.
 */
function useResourceState<T>(resource: Resource<T> | PromiseLike<Resource<T>> | string, initialData: undefined | T | ResourceState<T>, client: Client) {

    let data: undefined | ResourceState<T> = undefined;
    if (initialData) {
        data = isState(initialData) ? initialData : dataToState(initialData, client);
    } else if (resource instanceof Resource) {
        data = client.cache.get(resource.uri) || undefined;
    } else if (typeof resource === 'string') {
        data = client.cache.get(resource) || undefined
    }

    return shallowRef(data)

}

function isUseResourceOptions<T>(input: any | UseResourceOptions<T>): input is UseResourceOptions<T> {

    return input.mode === 'PUT' || input.mode === 'POST';

}

/**
 * Take data and wraps it in a State object.
 *
 * For now this will always return a HalState object, because it's a
 * reasonable default, but this may change in the future.
 */
function dataToState<T>(data: T, client: Client): ResourceState<T> {

    return new HalState({
        uri: 'about:blank' + Math.random(),
        client,
        data,
        headers: new Headers(),
        links: new Links('about:blank'),
    });

}


