<template>
    <div v-if="error">{{ error.message }}</div>
    <ul v-else-if="items">
        <li v-for="(item, i) in items" :key="i">
            <article-collection-item :resource="item" />
        </li>
    </ul>
    <p v-if="loading">Loading...</p>
    <button v-else-if="hasNextPage" type="button" @click="loadNextPage">Next page</button>
</template>

<script setup lang="ts">
import { usePagedCollection } from '../src'
import type { Article } from './types'
import ArticleCollectionItem from './ArticleCollectionItem.vue'

const { error, loading, items, hasNextPage, loadNextPage } = usePagedCollection<Article>('/api/article')
</script>