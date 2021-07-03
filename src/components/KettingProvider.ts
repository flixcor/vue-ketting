import { provide, defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { Client } from 'ketting'
import { KettingClientKey } from '../config'

export default defineComponent({
  name: 'KettingProvider',
  props: {
    client: {
      type: Object as PropType<Client>,
      required: true,
    },
  },
  setup: (props, ctx) => {
    provide(KettingClientKey, props.client)
    return () => {
      const slot = Object.values(ctx.slots)[0]
      return slot
        ? slot()
        : []
    }
  },
})
