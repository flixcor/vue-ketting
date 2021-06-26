<template>
  <KettingProvider :client="client">
    <!-- <ArticleCollection /> -->
    <ArticleCollection />
  </KettingProvider>
</template>

<script setup lang="ts">
import { KettingProvider } from '../src/index'
import { Client } from 'ketting'
import ArticleCollection from './ArticleCollection.vue';
const client = new Client('/api')
</script>