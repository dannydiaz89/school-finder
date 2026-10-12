/**
 * `import.meta.glob` is a Vite feature the test runner provides. Declared
 * here so a test can hand the Convex function modules to the in-memory
 * harness without pulling Vite's whole client type set into the project.
 */
interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>;
}
