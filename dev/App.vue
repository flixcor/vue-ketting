<template>
  <KettingProvider :client="client">
    <ArticleCollection />
    <!-- <ArticleCollection /> -->
    <ArticleCollectionItem collection-uri="/api/article" />
  </KettingProvider>
</template>

<script setup lang="ts">
import { KettingProvider } from '../src/index'
import { Client } from 'ketting'
import ArticleCollection from './ArticleCollection.vue'
import ArticleCollectionItem from './ArticleCollectionItem.vue'
const client = new Client('/api')
</script>