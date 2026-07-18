import { it, expect } from "vitest";
import { hello } from "./index.ts";
it("greets", () => expect(hello()).toBe("hi"));
