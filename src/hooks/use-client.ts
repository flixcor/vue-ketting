import { Client } from 'ketting';
import { KettingClientKey } from '../utils/config';
import { getCurrentInstance  } from 'vue'

export function useClient(): Client {
    const instance = getCurrentInstance() as any
    const client = instance?.provides[KettingClientKey]
    
    if (client instanceof Client) {
        return client
    }

    throw new Error('To use useClient, you must have a <KettingProvider> component set up');
}
