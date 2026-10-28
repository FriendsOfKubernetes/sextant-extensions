#!/usr/bin/env node
// Writes index.json from the reviewed entries in extensions/ (ADR-0130 of Sextant). The rules are Sextant's SDK's
// (sdk/scripts/catalog.mjs, checked out by the workflow): this script only reads the entries, asks GitHub for each
// entry's releases, downloads the package and its signature from the address Sextant itself will use, and writes what
// passed.
//
//   node scripts/build-index.mjs --sdk <sextant>/sdk/scripts [--check]
//
// `--check` (pull requests) writes nothing and fails when an entry is invalid or has no release that passes; without
// it, a release that fails is only reported and the entry keeps the release it had.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const sdkAt = args.indexOf("--sdk");
if (sdkAt < 0 || !args[sdkAt + 1]) {
  process.stderr.write("usage: build-index.mjs --sdk <sextant>/sdk/scripts [--check]\n");
  process.exit(2);
}
const checkOnly = args.includes("--check");
const sdk = resolve(args[sdkAt + 1]);
const catalog = await import(pathToFileURL(join(sdk, "catalog.mjs")).href);
const { MAX_SIGNATURE_BYTES } = await import(pathToFileURL(join(sdk, "minisign.mjs")).href);

const root = resolve(import.meta.dirname, "..");
const token = process.env.GITHUB_TOKEN;
const TIMEOUT_MS = 60_000;

function annotate(level, message) {
  // GitHub Actions shows these on the run's page.
  process.stdout.write(`::${level}::${message.replace(/\r?\n/g, " ")}\n`);
}

async function download(url, limit, headers = {}) {
  const response = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > limit) throw new Error(`larger than ${limit} bytes`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error(`larger than ${limit} bytes`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function releasesOf(repository) {
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = await download(`https://api.github.com/repos/${repository}/releases?per_page=20`, 4 * 1024 * 1024, headers);
  return JSON.parse(body.toString("utf8"));
}

const entries = [];
let invalid = 0;
const files = readdirSync(join(root, "extensions")).filter((name) => name.endsWith(".json")).sort();
for (const file of files) {
  try {
    const value = JSON.parse(readFileSync(join(root, "extensions", file), "utf8"));
    entries.push(catalog.checkEntry(value, file));
  } catch (err) {
    invalid += 1;
    annotate("error", `extensions/${file}: ${err instanceof catalog.CatalogError ? err.message.replace(`${file}: `, "") : `not valid JSON (${err.message})`}`);
  }
}

const results = new Map();
for (const entry of entries) {
  try {
    const picked = catalog.pickRelease(entry, await releasesOf(entry.repository));
    if (!picked) continue;
    const url = catalog.releaseUrl(entry.repository, picked.tag, picked.asset);
    const packageBytes = await download(url, catalog.MAX_PACKAGE_BYTES);
    const signature = (await download(`${url}${catalog.SIGNATURE_SUFFIX}`, MAX_SIGNATURE_BYTES)).toString("utf8");
    results.set(entry.id, { latest: catalog.checkRelease(entry, picked, packageBytes, signature) });
  } catch (err) {
    results.set(entry.id, { error: err instanceof catalog.CatalogError ? err.message : `${entry.id}: ${err.message}` });
  }
}

let previous = null;
try {
  previous = JSON.parse(readFileSync(join(root, "index.json"), "utf8"));
} catch {
  // A first run, or an index that cannot be read: written anew.
}
const { index, notes } = catalog.buildIndex({ entries, results, previous });
for (const note of notes) annotate(checkOnly ? "error" : "warning", note);
for (const extension of index.extensions) {
  const latest = extension.latest ? `${extension.latest.version} (${extension.latest.asset}, key ${extension.latest.keyId})` : "no release";
  process.stdout.write(`${extension.id}: ${latest}${extension.withdrawn ? " — withdrawn" : ""}\n`);
}
if (checkOnly) {
  process.exitCode = invalid > 0 || notes.length > 0 ? 1 : 0;
} else {
  writeFileSync(join(root, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  process.exitCode = invalid > 0 ? 1 : 0;
}
