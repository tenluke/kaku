import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

// Downloads are kept in .cache/ (not committed), so re-running the build is fast and
// does not hit the source servers again.
const CACHE_DIR = join(import.meta.dirname, '..', '..', '.cache', 'data');

/** Returns the file's bytes, from the cache if present, else downloaded and cached. */
export async function downloadCached(url: string, cacheName: string): Promise<Buffer> {
  const cachePath = join(CACHE_DIR, cacheName);
  try {
    return await readFile(cachePath);
  } catch {
    // Not cached yet: download below.
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, bytes);
  return bytes;
}

export async function downloadText(url: string, cacheName: string): Promise<string> {
  return (await downloadCached(url, cacheName)).toString('utf8');
}

export async function downloadGzipText(url: string, cacheName: string): Promise<string> {
  return gunzipSync(await downloadCached(url, cacheName)).toString('utf8');
}

/**
 * Downloads many URLs, a few at a time, so we are quick without flooding the server.
 * Returns the results in the same order as the input.
 */
export async function downloadMany<Result>(
  items: readonly string[],
  downloadOne: (item: string) => Promise<Result>,
  parallelDownloads = 16,
): Promise<Result[]> {
  const results: Result[] = new Array(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await downloadOne(items[index] as string);
    }
  }
  await Promise.all(Array.from({ length: parallelDownloads }, worker));
  return results;
}
