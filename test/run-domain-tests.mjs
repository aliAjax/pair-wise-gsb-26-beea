// 用 esbuild（vite 自带依赖）把 TS 测试转成 ESM 后运行，无需额外安装
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const outfile = join("test", ".domain.test.mjs");
await build(
  {
    entryPoints: ["test/domain.test.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "silent",
  },
  null
);

try {
  await import(pathToFileURL(join(process.cwd(), outfile)).href);
} finally {
  await rm(outfile, { force: true });
}
