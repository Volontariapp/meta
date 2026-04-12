import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Intelligent Peer Dependency Fixer v2 (Aggressive Mode)
 */

const YARNRC_PATH = path.resolve(process.cwd(), ".yarnrc.yml");

function getPeerRequirements() {
  console.log(`🔍 Analyzing peer requirements in ${process.cwd()}...`);
  try {
    // Run full explain to get all details, not just summarized ones
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

  // Regex to catch both direct and summarized requirements
  const regex = /→ ✘ .* provides (@?[\w\-/]+)@npm:.* to (@?[\w\-/]+)@npm:/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const provider = match[1];
      const consumer = match[2];

      if (!extensions[consumer]) {
        extensions[consumer] = new Set();
      }
      extensions[consumer].add(provider);

      // Auto-add base peers for ANY NestJS/Volontariapp package
      if (
        consumer.startsWith("@nestjs/") ||
        consumer.startsWith("@volontariapp/")
      ) {
        extensions[consumer].add("rxjs");
        extensions[consumer].add("reflect-metadata");
      }
    }
  }

  // Force-add base fixes for the core framework itself if not detected
  if (!extensions["@nestjs/common"])
    extensions["@nestjs/common"] = new Set(["rxjs", "reflect-metadata"]);
  if (!extensions["@nestjs/core"])
    extensions["@nestjs/core"] = new Set(["rxjs", "reflect-metadata"]);

  return extensions;
}

function updateYarnrc(newExtensions) {
  if (Object.keys(newExtensions).length === 0) {
    console.log("✅ No new unmet peer dependencies detected.");
    return;
  }

  if (!fs.existsSync(YARNRC_PATH)) return;

  let content = fs.readFileSync(YARNRC_PATH, "utf8");

  if (!content.includes("packageExtensions:")) {
    content += "\npackageExtensions:\n";
  }

  for (const [consumer, providers] of Object.entries(newExtensions)) {
    const consumerKey = `  "${consumer}@*":`;

    if (!content.includes(consumerKey)) {
      content += `\n${consumerKey}\n    peerDependencies:\n`;
      providers.forEach((provider) => {
        content += `      "${provider}": "*"\n`;
      });
      content += `    peerDependenciesMeta:\n`;
      providers.forEach((provider) => {
        content += `      "${provider}": { "optional": true }\n`;
      });
    } else {
      // Add missing to existing block
      providers.forEach((provider) => {
        if (!content.includes(`"${provider}": "*"`)) {
          console.log(`   ➕ Adding peer ${provider} to ${consumer}`);
          // Simplified insertion logic
          const peerDepRegex = new RegExp(
            `("${consumer}@\\*":[\\s\\S]*?peerDependencies:)`,
          );
          content = content.replace(
            peerDepRegex,
            `$1\n      "${provider}": "*"`,
          );

          const metaRegex = new RegExp(
            `("${consumer}@\\*":[\\s\\S]*?peerDependenciesMeta:)`,
          );
          if (content.match(metaRegex)) {
            content = content.replace(
              metaRegex,
              `$1\n      "${provider}": { "optional": true }`,
            );
          } else {
            // Need to add meta block
            const blockEndRegex = new RegExp(
              `("${consumer}@\\*":[\\s\\S]*?peerDependencies:[\\s\\S]*?)(?=\\n  "|\\n\\n|$)`,
            );
            content = content.replace(
              blockEndRegex,
              `$1    peerDependenciesMeta:\n      "${provider}": { "optional": true }\n`,
            );
          }
        }
      });
    }
  }

  fs.writeFileSync(YARNRC_PATH, content);
  console.log("🚀 .yarnrc.yml hardened with optional peer metadata.");
}

const output = getPeerRequirements();
if (output) {
  const extensions = parseOutput(output);
  updateYarnrc(extensions);
}
