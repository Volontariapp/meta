import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * Intelligent Peer Dependency Fixer v3 (Smart Mode)
 */

const YARNRC_PATH = path.resolve(process.cwd(), ".yarnrc.yml");

function getPeerRequirements() {
  console.log(`🔍 Analyzing peer requirements in ${process.cwd()}...`);
  try {
    return execSync("yarn explain peer-requirements", {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    console.error("❌ Failed to run yarn explain peer-requirements.");
    return null;
  }
}

function parseOutput(output) {
  if (!output) return {};
  const extensions = {};
  const lines = output.split("\n");

  const regex = /→ ✘ (@?[\w\-/]+)@npm:.* provides .* to (@?[\w\-/]+)@npm:/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const provider = match[1];
      const consumer = match[2];

      if (!extensions[consumer]) {
        extensions[consumer] = new Set();
      }
      extensions[consumer].add(provider);
    }
  }

  return extensions;
}

function updateYarnrc(newExtensions) {
  if (!fs.existsSync(YARNRC_PATH)) return;

  let content = fs.readFileSync(YARNRC_PATH, "utf8");
  let yarnrc;
  try {
    yarnrc = yaml.load(content) || {};
  } catch (e) {
    console.warn(`⚠️ YAML parsing failed due to duplicates, attempting manual deduplication...`);
    content = deduplicateKeys(content);
    try {
        yarnrc = yaml.load(content) || {};
    } catch (e2) {
        console.error(`❌ Still failed to parse ${YARNRC_PATH}: ${e2.message}`);
        return;
    }
  }

  if (!yarnrc.packageExtensions) {
    yarnrc.packageExtensions = {};
  }

  let addedCount = 0;

  for (const [consumer, providers] of Object.entries(newExtensions)) {
    const key = `${consumer}@*`;
    if (!yarnrc.packageExtensions[key]) {
      yarnrc.packageExtensions[key] = {
        peerDependencies: {},
        peerDependenciesMeta: {}
      };
    }

    const extension = yarnrc.packageExtensions[key];
    if (!extension.peerDependencies) extension.peerDependencies = {};
    if (!extension.peerDependenciesMeta) extension.peerDependenciesMeta = {};

    providers.forEach(provider => {
      if (!extension.peerDependencies[provider]) {
        extension.peerDependencies[provider] = "*";
        extension.peerDependenciesMeta[provider] = { optional: true };
        console.log(`   ➕ Adding peer ${provider} to ${consumer}`);
        addedCount++;
      }
    });
  }

  if (addedCount > 0 || content !== fs.readFileSync(YARNRC_PATH, "utf8")) {
    fs.writeFileSync(YARNRC_PATH, yaml.dump(yarnrc, { indent: 2, quotingType: '"' }));
    console.log(`🚀 .yarnrc.yml updated with ${addedCount} new peer extensions.`);
  } else {
    console.log("✅ No new unmet peer dependencies detected.");
  }
}

function deduplicateKeys(content) {
    const lines = content.split('\n');
    const seenKeys = new Set();
    const resultLines = [];
    let inPackageExtensions = false;
    let currentKey = null;
    let skipBlock = false;

    for (const line of lines) {
        if (line.trim() === 'packageExtensions:') {
            inPackageExtensions = true;
            resultLines.push(line);
            continue;
        }

        if (inPackageExtensions && line.match(/^  ['"]?@?[\w\-/]+@\*['"]?:/)) {
            currentKey = line.trim().replace(/['"]?:$/, '').replace(/^['"]/, '').replace(/['"]$/, '');
            if (seenKeys.has(currentKey)) {
                skipBlock = true;
            } else {
                seenKeys.add(currentKey);
                skipBlock = false;
                resultLines.push(line);
            }
            continue;
        }

        if (inPackageExtensions && line.match(/^[^ ]/)) {
            inPackageExtensions = false;
            currentKey = null;
            skipBlock = false;
            resultLines.push(line);
            continue;
        }

        if (!skipBlock) {
            resultLines.push(line);
        }
    }
    return resultLines.join('\n');
}

const output = getPeerRequirements();
if (output) {
  const extensions = parseOutput(output);
  updateYarnrc(extensions);
}
