import { app } from 'electron';
import { writeFile, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { WorkbenchState } from '@rwp2/contracts';
import { toDurableSlice, type DurableSlice } from './durable';

function statePath(): string {
  return join(app.getPath('userData'), 'state.json');
}

/** Load the persisted durable slice, or null (corrupt/missing → start clean). */
export async function loadPersistedSlice(): Promise<DurableSlice | null> {
  try {
    return JSON.parse(await readFile(statePath(), 'utf8')) as DurableSlice;
  } catch {
    return null;
  }
}

/**
 * Debounced (500ms) atomic write of the durable slice (04 §7). Atomicity via
 * write-to-temp + rename so a crash mid-write never corrupts state.json.
 */
export class Persistence {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: DurableSlice | null = null;

  schedule(state: WorkbenchState): void {
    this.pending = toDurableSlice(state);
    if (this.timer) return;
    this.timer = setTimeout(() => void this.flush(), 500);
  }

  async flush(): Promise<void> {
    this.timer = null;
    const slice = this.pending;
    if (!slice) return;
    this.pending = null;
    const target = statePath();
    const tmp = `${target}.tmp`;
    try {
      await writeFile(tmp, JSON.stringify(slice), 'utf8');
      await rename(tmp, target);
    } catch (e) {
      console.warn(`[persistence] write failed: ${(e as Error).message}`);
    }
  }
}
