import next from "@next/eslint-plugin-next";
import { reactLibrary } from "./react-library.js";

export const nextJs = [
  ...reactLibrary,
  next.flatConfig.coreWebVitals,
  { ignores: ["**/next-env.d.ts"] },
];

export default nextJs;
