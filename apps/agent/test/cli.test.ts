import { describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.ts";

describe("agent cli main", () => {
  it("--help / -h / help prints usage to stdout and returns 0 (#29)", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const flag of ["--help", "-h", "help"]) {
      expect(await main([flag])).toBe(0); // an explicit help request is not an error
    }
    expect(log.mock.calls.flat().join("\n")).toContain("usage:");
    expect(err).not.toHaveBeenCalled(); // nothing on stderr
    log.mockRestore();
    err.mockRestore();
  });

  it("returns 1 with usage on an unknown command (#29)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["frobnicate"])).toBe(1);
    expect(err.mock.calls.flat().join("\n")).toContain("usage:");
    err.mockRestore();
  });
});
