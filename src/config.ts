import type {InjectionKey} from 'vue'
import type {Client} from 'ketting'
export const KettingClientKey: InjectionKey<Client> = Symbol('kettingClient')