<template>
  <p v-if="loading">
    Loading...
  </p>
  <template v-else-if="data">
    <label>
      Id
      <span>{{ data.id }}</span>
    </label>
    <label>
      Title
      <input
        :value="data.title"
        @change="handleTitle"
      >
    </label>
    <label>
      Body
      <textarea
        :value="data.body"
        @change="handleBody"
      />
    </label>
    <button
      type="button"
      @click="submit"
    >
      Save
    </button>
    <button
      type="button"
      @click="resource?.refresh()"
    >
      Undo
    </button>
  </template>
  <div v-else>
    {{ error?.message || 'something went horribly wrong' }}
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import type { PropType } from 'vue'
import type { Resource } from 'ketting'
import { useResource } from '../src'
import type { UseResourceOptions } from '../src'
import type { Article } from './types'

const props = defineProps({
  collectionUri: {
    type: String,
    required: true,
  },
  resource: {
    default: undefined,
    type: Object as PropType<Resource<Article> | undefined>,
  },
})

const options: UseResourceOptions<Article> = props.resource
  ? {
    mode: 'PUT',
    resource: props.resource,
    refreshOnStale: true,
  }
  : {
    resource: props.collectionUri,
    mode: 'POST',
    refreshOnStale: true,
    initialState: { title: '', body: '' },
  }

const { error, loading, setData, submit, data, resource, resourceState } = useResource(options)

function handleChange(ev: Event, prop: keyof Article) {
  const value = data.value
  if (!value) return
  const input = ev.target as HTMLInputElement
  setData({
    ...value,
    [prop]: input.value,
  })
}

const handleTitle = (ev: Event) => handleChange(ev, 'title')
const handleBody = (ev: Event) => handleChange(ev, 'body')
</script>

<style>
    label {
        display: block;
        margin-bottom: 10px;
    }
    input, textarea {
        display: block;
        min-width: 20em;
        min-height: 1em;
    }
    button {
        margin-bottom: 50px;
    }
</style>
