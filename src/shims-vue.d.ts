declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    export * from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
  }
