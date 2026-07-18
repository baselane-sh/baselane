import { describe, expect, it } from "vitest";
import { validateComponent } from "../src/validate.ts";

describe("validateComponent", () => {
  it("validates an agent payload and strips unknown fields", () => {
    const out = validateComponent("agent", {
      name: "code-reviewer",
      description: "Reviews the diff.",
      tools: ["Read", "Grep"],
      model: "sonnet",
      prompt: "Review it.",
      bogus: "dropme",
    });
    expect(out).toEqual({
      name: "code-reviewer",
      description: "Reviews the diff.",
      tools: ["Read", "Grep"],
      model: "sonnet",
      prompt: "Review it.",
    });
  });

  it("validates a command payload", () => {
    const out = validateComponent("command", { name: "ship", description: "Ships.", argument_hint: "[t]", prompt: "Ship $ARGUMENTS." });
    expect(out).toEqual({ name: "ship", description: "Ships.", argument_hint: "[t]", prompt: "Ship $ARGUMENTS." });
  });

  it("validates print-reminder and run-command hook payloads", () => {
    expect(validateComponent("hook", { event: "Stop", matcher: "", description: "d", action: "print-reminder", message: "hi" }))
      .toEqual({ event: "Stop", matcher: "", description: "d", action: "print-reminder", message: "hi" });
    expect(validateComponent("hook", { event: "PostToolUse", matcher: "Edit", description: "d", action: "run-command", command: "pnpm test" }))
      .toEqual({ event: "PostToolUse", matcher: "Edit", description: "d", action: "run-command", command: "pnpm test" });
  });

  it("validates a capability payload (type/store/method, optional config)", () => {
    expect(validateComponent("capability", { type: "graph", store: "repo", method: "imports" }))
      .toEqual({ type: "graph", store: "repo", method: "imports" });
    expect(validateComponent("capability", { type: "system-map", store: "repo", method: "analyze+llm" }))
      .toEqual({ type: "system-map", store: "repo", method: "analyze+llm" });
  });

  it("validates a rules payload as a non-empty markdown string (newlines allowed)", () => {
    const md = "## House rules\n\n- Keep functions small\n";
    expect(validateComponent("rules", md)).toBe(md);
  });

  it("throws on invalid payloads, reusing the pack field validators", () => {
    expect(() => validateComponent("agent", { name: "Bad Name", description: "d", tools: [], model: "sonnet", prompt: "p" })).toThrow(/name/);
    expect(() => validateComponent("capability", { type: "nope", store: "repo", method: "x" })).toThrow(/type/);
    expect(() => validateComponent("rules", "")).toThrow(/rules/);
    expect(() => validateComponent("rules", 123 as unknown)).toThrow(/rules/);
  });
});
