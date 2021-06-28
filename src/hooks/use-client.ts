import { Client } from 'ketting'
import { KettingClientKey } from '../config'
import { inject } from 'vue'

export function useClient(): Readonly<Client> {
    const client = inject(KettingClientKey)

    if (client instanceof Client) {
        return client
    }

    throw new Error('To use useClient, you must have a <KettingProvider> component set up')
}
