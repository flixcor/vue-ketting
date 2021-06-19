/* eslint-disable */
import type { App as Application, Plugin } from "vue";
import * as components from "./components/index";
import { setVueInstance } from "./utils/config/index";

export { useResource } from './hooks/use-resource';
export type { UseResourceOptions } from './hooks/use-resource';
export { useClient } from './hooks/use-client'

export const install: Exclude<Plugin["install"], undefined> = (
  instance: Application
) => {
  setVueInstance(instance);
  for (const componentKey in components) {
    instance.use((components as any)[componentKey]);
  }
};

export * from "./components";