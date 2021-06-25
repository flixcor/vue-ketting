<template>
    <p v-if="loading">Loading...</p>
    <div v-else-if="error">{{ error.message }}</div>
    <ul v-else-if="items">
        <li v-for="(item, i) in items" :key="i">
            <article-collection-item :resource="item" />
        </li>
    </ul>
    <div v-else>{{ 'something went horribly wrong' }}</div>
</template>

<script setup lang="ts">
import { useCollection } from '../src'
import type { Article } from './types'
import ArticleCollectionItem from './ArticleCollectionItem.vue'

const { error, loading, items } = useCollection<Article>('/api/article')
</script>