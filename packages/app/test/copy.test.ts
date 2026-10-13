// Guards the app's visible copy: no old-chain wording, no claims we have not verified.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
  });
}
const src = files(join(import.meta.dirname, "..", "src")).concat(files(join(import.meta.dirname, "..", "..", "ui", "src"))).map((f) => [f, readFileSync(f, "utf8")] as const);

describe("app copy", () => {
  it("never mentions the old chain or its tokens", () => {
    for (const [f, text] of src) {
      expect(text, f).not.toMatch(/monad|kuru|privy/i);
      expect(text, f).not.toMatch(/\bAUSD\b|\bMON\b/);
    }
  });
  it("makes no audit or production claims", () => {
    for (const [f, text] of src) expect(text.replace(/Is this audited\?|not audited|No\. It is a beta[^"]*/g, ""), f).not.toMatch(/\baudited\b|production-ready|battle-tested/i);
  });
});
