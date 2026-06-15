const fs = require("fs");
const path = require("path");

const htmlFiles = ["index.html", "work.html", "about.html", "resume.html", "playground.html", "404.html"];
const localReferencePattern = /(?:href|src)="([^"]+)"/g;
const missing = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  let match;

  while ((match = localReferencePattern.exec(html)) !== null) {
    const reference = match[1];

    if (
      reference.startsWith("http") ||
      reference.startsWith("mailto:") ||
      reference.startsWith("#")
    ) {
      continue;
    }

    const cleanReference = decodeURIComponent(reference.split("#")[0].split("?")[0]);
    const target = path.join(process.cwd(), cleanReference);

    if (!fs.existsSync(target)) {
      missing.push(`${file}: ${reference} -> ${cleanReference}`);
    }
  }
}

if (missing.length > 0) {
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log("All local href/src targets exist.");
