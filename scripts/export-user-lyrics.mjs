import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = path.resolve("src/userLyrics.ts");
const outputDir = path.resolve("lyrics/processed");
const source = fs.readFileSync(sourcePath, "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const sandbox = {
  exports: {},
  module: { exports: {} },
  require() {
    return {};
  },
};

vm.runInNewContext(js, sandbox, { filename: sourcePath });
const libraries = sandbox.exports.userLyricsLibraries ?? sandbox.module.exports.userLyricsLibraries;

fs.mkdirSync(outputDir, { recursive: true });
for (const library of libraries) {
  const filename = `${library.id}.training.json`;
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(library, null, 2)}\n`, "utf8");
}

console.log(`Exported ${libraries.length} lyric libraries to ${outputDir}`);
