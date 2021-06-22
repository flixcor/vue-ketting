<template>
  <KettingProvider :client="client">
    <Test />
    <Test />
  </KettingProvider>
</template>

<script setup lang="ts">
import { KettingProvider } from '../src/index'
import { Client } from 'ketting'
import Test from './Test.vue';
const client = new Client('/api')
</script>