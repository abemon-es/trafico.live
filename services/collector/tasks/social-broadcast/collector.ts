// The dispatcher resolves tasks via `./tasks/${TASK}/collector.js`. This
// shim re-exports `run` from index.ts so `TASK=social-broadcast` works
// without renaming the entry file (index.ts is referenced internally).
export { run } from "./index.js";
