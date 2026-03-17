declare module 'rrweb' {
  export function record(options: { emit: (event: unknown) => void }): () => void;
}
