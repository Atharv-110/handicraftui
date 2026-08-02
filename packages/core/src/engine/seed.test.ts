import { describe, expect, it } from "vitest";
import { hashString, SEED_BUCKETS, seedBucket, seedFrom } from "./seed";

describe("hashString", () => {
  it("is stable for the same input", () => {
    expect(hashString("«r1»")).toBe(hashString("«r1»"));
  });

  it("separates similar inputs", () => {
    expect(hashString("«r1»")).not.toBe(hashString("«r2»"));
  });

  it("stays inside unsigned 32-bit range", () => {
    for (const s of ["", "a", "«r17»", "a".repeat(500)]) {
      const h = hashString(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("seedFrom", () => {
  it("never returns 0", () => {
    // rough.js treats a falsy seed as 'unseeded' and silently falls back to
    // Math.random(), which would reintroduce the hydration mismatch.
    for (let i = 0; i < 5000; i++) {
      expect(seedFrom(`«r${i}»`)).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    expect(seedFrom("button-1")).toBe(seedFrom("button-1"));
  });
});

describe("seedBucket", () => {
  it("stays within the authored variant count", () => {
    for (let i = 0; i < 2000; i++) {
      const b = seedBucket(`«r${i}»`);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(SEED_BUCKETS);
    }
  });

  it("spreads across every bucket", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(seedBucket(`«r${i}»`));
    // A hash that collapsed to a couple of buckets would make every component
    // on the page share the same wobble.
    expect(seen.size).toBe(SEED_BUCKETS);
  });

  it("spreads real React useId values evenly", () => {
    // The synthetic «r0», «r1» ids above are far too kind. React actually emits
    // base-32 tree positions — short strings where siblings differ by a single
    // character — and an unmixed hash clusters badly on them. This is the shape
    // that matters, so it is the shape under test.
    // React encodes tree position with bit shifts, so a sibling list does not
    // step by 1 — it steps by 8. Observed on a real page: _R_9_, _R_h_, _R_p_,
    // _R_11_, _R_19_ decodes to 9, 17, 25, 33, 41. Feeding stride-8 values into
    // `% 8` is precisely what collapses onto a few variants, and a test built
    // from consecutive integers never sees it.
    const B32 = "0123456789abcdefghijklmnopqrstuv";
    const encode = (n: number) => {
      let s = "";
      while (n > 0) {
        s = B32[n % 32] + s;
        n = Math.floor(n / 32);
      }
      return `_R_${s}_`;
    };

    const ids: string[] = [];
    for (let group = 0; group < 4; group++) {
      for (let sibling = 0; sibling < 6; sibling++) {
        ids.push(encode(9 + group + 8 * sibling));
      }
    }

    const counts = new Array<number>(SEED_BUCKETS).fill(0);
    for (const id of ids) counts[seedBucket(id)]! += 1;
    const used = counts.filter((c) => c > 0).length;

    // Raw FNV-1a scores 5 used / 6 in one bucket on this input. Anything at or
    // below that means the low bits are not being mixed.
    expect(used).toBeGreaterThanOrEqual(7);
    expect(Math.max(...counts)).toBeLessThanOrEqual(5);
  });
});
