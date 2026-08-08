import nextJs from "@handicraft/eslint-config/next";

export default [
  ...nextJs,
  // The ramps govern shipped component source — and, from cycle 012, the
  // marketing surface. DESIGN-SYSTEM.md §2's own amendment names the hazard
  // it exists to close: a landing shipping `text-5xl` would lint green while
  // fracturing the scale in the one place nobody watches. The scale was
  // extended so this page could stay on it; extending it and leaving the
  // rule off delivers exactly the fracture the amendment prevents.
  { files: ["**/*.tsx"], rules: { "hc/no-off-scale-class": "error" } },
];
