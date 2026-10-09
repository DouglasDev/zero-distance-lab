import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const runtime = dirname(require.resolve('@mediapipe/tasks-vision'));
const destination = new URL('../public/tracking/wasm/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ['vision_wasm_module_internal.js', 'vision_wasm_module_internal.wasm']) {
  await cp(join(runtime, 'wasm', name), new URL(name, destination));
}
