import { StitchToolClient } from "@google/stitch-sdk";
import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const API_KEY = process.env.STITCH_API_KEY;
if (!API_KEY) { console.error("Set STITCH_API_KEY env var"); process.exit(1); }

const client = new StitchToolClient({ apiKey: API_KEY });
await client.connect();

const PROJECT_ID = "6878191547608586932";
const SCREENS = [
  { id: "ba288b947cf843919b216f1d9071b4f3", name: "study-dashboard" },
  { id: "9fbd6e3f6e944da7a6d0deaa1a99d6f1", name: "session-report" },
  { id: "db7bb2b661944d5b9cba0e7687ee1b8d", name: "achievements-badges" },
  { id: "7dd719fd0a6241d596e635b0de49d75c", name: "school-ranking" },
];

const OUT_DIR = "docs/05-design-assets";
mkdirSync(OUT_DIR, { recursive: true });

for (const s of SCREENS) {
  console.log(`\nFetching: ${s.name} (${s.id})`);
  try {
    const result = await client.callTool("get_screen", {
      name: `projects/${PROJECT_ID}/screens/${s.id}`,
    });

    console.log(`  Title: ${result.title}`);
    console.log(`  Size: ${result.width}x${result.height}`);

    // Download HTML
    if (result.htmlCode?.downloadUrl) {
      execSync(`curl -sL -o "${OUT_DIR}/${s.name}.html" "${result.htmlCode.downloadUrl}"`);
      console.log(`  -> Saved ${s.name}.html`);
    }

    // Download screenshot
    if (result.screenshot?.downloadUrl) {
      execSync(`curl -sL -o "${OUT_DIR}/${s.name}.png" "${result.screenshot.downloadUrl}"`);
      console.log(`  -> Saved ${s.name}.png`);
    }
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
}

await client.close();
console.log("\nDone! Assets saved to", OUT_DIR);
