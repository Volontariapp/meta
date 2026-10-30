import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * Peer Dependency Cleaner
 * Runs 'yarn' to find redundant extensions and removes them.
 */

const YARNRC_PATH = path.resolve(process.cwd(), ".yarnrc.yml");

function getYarnOutput() {
  console.log(`🧹 Cleaning redundant peers in ${process.cwd()}...`);
  try {
    // We use yarn to find YN0069 warnings
    return execSync("yarn install", {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    // If yarn fails but provides output with warnings, we still use it
    return error.stdout || "";
  }
}

function parseRedundantRules(output) {
  const redundant = [];
  const lines = output.split("\n");

  // Regex for YN0069: "➤ YN0069: │ <consumer> ➤ peerDependencies ➤ <provider>: This rule seems redundant"
  const regex = /YN0069: │ (@?[\w\-/]+) ➤ (peerDependencies|peerDependenciesMeta) ➤ (@?[\w\-/]+):/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      redundant.push({
        consumer: match[1],
        type: match[2],
        provider: match[3]
      });
    }
  }

  return redundant;
}

function cleanYarnrc(redundantRules) {
  if (!fs.existsSync(YARNRC_PATH)) return;

  let content = fs.readFileSync(YARNRC_PATH, "utf8");
  
  // First, manually deduplicate keys if js-yaml fails
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

  if (!yarnrc.packageExtensions) return;

  let removedCount = 0;

  for (const rule of redundantRules) {
    const key = `${rule.consumer}@*`;
    const extension = yarnrc.packageExtensions[key];

    if (extension) {
      if (rule.type === 'peerDependencies' && extension.peerDependencies && extension.peerDependencies[rule.provider]) {
        delete extension.peerDependencies[rule.provider];
        console.log(`   - Removed redundant peerDependency ${rule.provider} from ${rule.consumer}`);
        removedCount++;
      }
      if (rule.type === 'peerDependenciesMeta' && extension.peerDependenciesMeta && extension.peerDependenciesMeta[rule.provider]) {
        delete extension.peerDependenciesMeta[rule.provider];
        console.log(`   - Removed redundant peerDependenciesMeta ${rule.provider} from ${rule.consumer}`);
        removedCount++;
      }

      // Cleanup empty blocks
      if (extension.peerDependencies && Object.keys(extension.peerDependencies).length === 0) {
        delete extension.peerDependencies;
      }
      if (extension.peerDependenciesMeta && Object.keys(extension.peerDependenciesMeta).length === 0) {
        delete extension.peerDependenciesMeta;
      }
      if (Object.keys(extension).length === 0) {
        delete yarnrc.packageExtensions[key];
      }
    }
  }

  if (removedCount > 0 || content !== fs.readFileSync(YARNRC_PATH, "utf8")) {
    fs.writeFileSync(YARNRC_PATH, yaml.dump(yarnrc, { indent: 2, quotingType: '"' }));
    console.log(`✨ .yarnrc.yml cleaned: ${removedCount} redundant rules removed.`);
  } else {
    console.log("✅ No redundant peer dependencies found in .yarnrc.yml.");
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
            currentKey = line.trim().replace(/['"]?:$/, '');
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

const output = getYarnOutput();
const rules = parseRedundantRules(output);
cleanYarnrc(rules);
