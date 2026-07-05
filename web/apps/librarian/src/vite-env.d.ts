/// <reference types="vite/client" />

// Fallback in case an installed vite version's client types don't cover this
// asset extension yet; harmless if it duplicates an upstream declaration.
declare module '*.wasm?url' {
  const src: string;
  export default src;
}
