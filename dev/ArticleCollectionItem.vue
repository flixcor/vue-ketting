<template>
    <p v-if="loading">Loading...</p>
    <template v-else-if="data">
        <label>
            Id
            <span>{{ data.id }}</span>
        </label>
        <label>
            Title
            <input :value="data.title" @change="handleTitle" >
        </label>
        <label>
            Body
            <textarea :value="data.body" @change="handleBody" />
        </label>
        <button type="button" @click="submit">Save</button>
        <button type="button" @click="resource?.refresh()">Undo</button>
    </template>
    <div v-else>{{ error?.message || 'something went horribly wrong' }}</div>
</template>
  
<script setup lang="ts"> 
import { defineProps } from 'vue'
import { useResource } from '../src'
import type { PropType } from 'vue'
import type { Article } from './types'
import type { Resource } from 'ketting'

const props = defineProps({
    resource: {
        required: true,
        type: Object as PropType<Resource<Article>>
    }
})

const { error, loading, setData, submit, data, resource } = useResource(props.resource)

function handleChange (ev: Event, prop: keyof Article) {
    const value = data.value
    if(!value) return
    const input = ev.target as HTMLInputElement
    setData({
        ...value,
        [prop]: input.value
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