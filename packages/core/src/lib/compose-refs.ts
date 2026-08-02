import type { Ref } from "react";

/**
 * Merge the frame's internal measuring ref with a ref the consumer passed in.
 * Without this, spreading `frameProps` would silently overwrite the caller's
 * `ref` and break anything that needs the DOM node (focus management,
 * positioning, form libraries).
 */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as { current: T | null }).current = node;
      }
    }
  };
}
