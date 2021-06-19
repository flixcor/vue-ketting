<template>
    <p v-if="loading">Loading...</p>
    <div v-else-if="error">{{ error.message }}</div>
    <template v-else-if="data">
        <h1>{{ data.title }}</h1>
        <textarea @change="handleChangeBody" :value="data.body" />
        <button type="button" @click="submit">Save</button>
    </template>
    <p v-else>Something went horribly wrong</p>
</template>
  
<script setup lang="ts">
import { useResource } from '..'
import type { Article } from './types'
const { error, loading, data, setData, submit } = useResource<Article>('/api/article/1')
const handleChangeBody = (ev: Event) => {
    const input = ev.target as HTMLInputElement
    setData({
        ...data.value!,
        body: input.value
    })
}
</script>