import { createApp } from 'vue'
import App from './App.vue'
import useApiStub from './api'
useApiStub()
createApp(App).mount('#app')
