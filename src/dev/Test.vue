<template>
    <p v-if="loading">Loading...</p>
    <template v-else-if="data">
        <label>
            Title
            <input :value="data.title" @change="handleChange($event, 'title')">
        </label>
        <label>
            Body
            <textarea @change="handleChange($event, 'body')" :value="data.body" />
        </label>
        <button type="button" @click="submit">Save</button>
        <button v-if="resource" type="button" @click="resource?.refresh()">Undo</button>
    </template>
    <div v-else-if="error">{{ error?.message }}</div>
</template>
  
<script setup lang="ts"> 
import { useResource } from '..'
import type { Article } from './types'

const { error, loading, setData, submit, data, resource, resourceState } = useResource<Article>('/api/article/1')

const handleChange = (ev: Event, prop: keyof Article) => {
    const value = data.value
    if(!value) return
    const input = ev.target as HTMLInputElement
    setData({
        ...value,
        [prop]: input.value
    })
}
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