import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL(".", import.meta.url));
const output = join(siteRoot, "dist");
const source = join(siteRoot, "src");
const coreDist = join(siteRoot, "..", "packages", "core", "dist");

await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true, force: true });
await mkdir(join(output, "vendor", "core"), { recursive: true });
await cp(coreDist, join(output, "vendor", "core"), { recursive: true, force: true });
console.log(`Built static site in ${output}`);
