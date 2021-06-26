import type { Client, State as ResourceState, } from 'ketting';
import { HalState, Links, Resource, isState } from 'ketting'
import { watch, computed, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { useClient } from './use-client'
import type { ResourceLike } from '../util'
import { useReadResource } from './use-read-resource';



type UseResourceResponse<T> = Readonly<{
    // True if there is no data yet
    loading: Readonly<Ref<boolean>>,
    error: Readonly<Ref<Readonly<Error> | null>>;
    // A full Ketting State object
    resourceState: Readonly<Ref<Readonly<ResourceState<Readonly<T>>> | undefined>>;
    // Update the state
    setResourceState: (newState: ResourceState<T>) => void;
    // Send the state to the server via a PUT or POST request.
    submit: () => Promise<void>;
    // The 'data' part of the state.
    data: Readonly<Ref<Readonly<T> | undefined>>;
    // Update the data from the state.
    setData: (newData: T) => void;
    // The 'real' resource.
    resource: Readonly<Ref<Readonly<Resource<T>> | undefined>>;
}>

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
export function useResource<T>(resource: ResourceLike<T> | string): UseResourceResponse<T>;
export function useResource<T>(options: UseResourceOptions<T>): UseResourceResponse<T>;
export function useResource<T>(arg1: ResourceLike<T> | UseResourceOptions<T> | string): UseResourceResponse<T> {
    const [resourceLike, mode, initialData, refreshOnStale] = getUseResourceOptions(arg1);
    const client = useClient();
    const initialState = useResourceState(resourceLike, initialData, client);
    const { resource, resourceState, loading, error } = useReadResource({
        mode,
        initialState,
        resource: resourceLike,
        refreshOnStale
    })
    const data = computed(() => resourceState.value?.data)
    const modeVal = shallowRef(mode);

    function setResourceState(newState: ResourceState<T>) {
        resourceState.value = newState.clone()
    }

    watch(error, () => {
        loading.value = false
    })

    watch(data, () => {
        loading.value = false
    })


    return {
        async submit() {
            const stateVal = resourceState.value, resourceVal = resource.value
            
            if (!stateVal || !resourceVal) {
                throw new Error('Too early to call submit()');
            }
    
            if (modeVal.value === 'POST') {
                const newResource = await resourceVal.postFollow(stateVal);
                resource.value = newResource;
                modeVal.value = 'PUT';
            } else {
                await resourceVal.put(stateVal as any);
            }
        },
        setData(newData: T) {
            const stateVal = resourceState.value,
                resourceVal = resource.value
    
            if (!stateVal || !resourceVal) {
                throw new Error('Too early to call setData, we don\'t have a current state to update');
            }
            stateVal.data = newData
            if (modeVal.value === 'PUT') {
                resourceVal.updateCache(stateVal as any);
            } else {
                resourceState.value = stateVal
            }
        },
        setResourceState(newState: ResourceState<T>) {
            const resourceVal = resource.value
            if (!resourceVal) {
                throw new Error('Too early to call setResourceState, we don\'t have a current state to update');
            }
            if (modeVal.value === 'PUT') {
                resourceVal.updateCache(newState);
            } else {
                setResourceState(newState)
            }
        },
        data,
        resourceState,
        loading,
        resource,
        error
    }
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
function useResourceState<T>(resourceLike: ResourceLike<T>, initialData: undefined | T | ResourceState<T>, client: Client): ResourceState<T> | undefined {


    if (initialData) {
        return isState(initialData) ? initialData : dataToState(initialData, client);
    } else if (resourceLike instanceof Resource) {
        return client.cache.get(resourceLike.uri) || undefined;
    } else if (typeof resourceLike === 'string') {
        return client.cache.get(resourceLike) || undefined
    }


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


