// Vitest setup — runs before each test file.
//
// We don't load .env here on purpose. Each test sets only the env it needs
// via vi.stubEnv() so tests stay deterministic.
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
