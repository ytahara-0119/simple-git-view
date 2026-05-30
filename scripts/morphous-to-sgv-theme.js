#!/usr/bin/env node
// morphous-to-sgv-theme.js
// Converts a Morphous `morphous.theme.v1` JSON to `simple-git-view.theme.v1` JSON.
// Usage: node scripts/morphous-to-sgv-theme.js <input.json> [output.json]

'use strict';

const fs = require('fs');
const path = require('path');

// Morphous palette role → simple-git-view colors key mapping
const ROLE_MAP = {
  Primary:     'primary',
  Accent:      'accent',
  Signal:      'signal',
  Destructive: 'destructive',
  Background:  'background',
  Surface:     'surface',
  Muted:       'muted',
  Border:      'border',
  Depth:       'depth',
  Ink:         'ink',
};

// Fallback colors used when a role is missing from the palette
const FALLBACKS = {
  primary:     '#c27aff',
  accent:      '#fb64b6',
  signal:      '#ff637e',
  destructive: '#ff2056',
  background:  '#faf5ff',
  surface:     '#fdf2f8',
  muted:       '#e9d4ff',
  border:      '#f3e8ff',
  depth:       '#364153',
  ink:         '#1e2939',
};

function usage() {
  console.log('Usage: node scripts/morphous-to-sgv-theme.js <input.json> [output.json]');
  console.log('');
  console.log('  input.json   Path to a morphous.theme.v1 JSON file.');
  console.log('  output.json  Optional output path. Defaults to <input>.sgv-theme.json.');
  process.exit(1);
}

function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    usage();
  }

  // Resolve input path
  const resolvedInput = path.resolve(inputPath);

  // Read and parse input JSON
  let json;
  try {
    const raw = fs.readFileSync(resolvedInput, 'utf8');
    json = JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: File not found: ${resolvedInput}`);
    } else if (err instanceof SyntaxError) {
      console.error(`Error: Failed to parse JSON: ${err.message}`);
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }

  // Validate schema
  if (json.schema !== 'morphous.theme.v1') {
    console.warn(
      `Warning: Expected schema "morphous.theme.v1" but got "${json.schema}". Continuing anyway.`
    );
  }

  // Extract name from identity or fallback to file basename
  const inputBasename = path.basename(resolvedInput, '.json');
  const themeName =
    (json.identity && json.identity.name) ? json.identity.name : inputBasename;

  // Build role → hex lookup from palette array
  const paletteMap = {};
  if (Array.isArray(json.palette)) {
    for (const entry of json.palette) {
      if (entry && entry.role && entry.hex) {
        paletteMap[entry.role] = entry.hex;
      }
    }
  }

  // Build colors object using ROLE_MAP, falling back to FALLBACKS
  const colors = {};
  for (const [morphousRole, sgvKey] of Object.entries(ROLE_MAP)) {
    const hex = paletteMap[morphousRole];
    if (hex) {
      colors[sgvKey] = hex;
    } else {
      console.warn(
        `Warning: Palette role "${morphousRole}" not found. Using fallback: ${FALLBACKS[sgvKey]}`
      );
      colors[sgvKey] = FALLBACKS[sgvKey];
    }
  }

  // Build output JSON
  const output = {
    schema: 'simple-git-view.theme.v1',
    name: themeName,
    colors,
  };

  // Determine output path
  let outputPath;
  if (process.argv[3]) {
    outputPath = path.resolve(process.argv[3]);
  } else {
    const dir = path.dirname(resolvedInput);
    const base = path.basename(resolvedInput, '.json');
    outputPath = path.join(dir, `${base}.sgv-theme.json`);
  }

  // Write output JSON
  try {
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
    console.log(`Converted: ${resolvedInput}`);
    console.log(`       → : ${outputPath}`);
  } catch (err) {
    console.error(`Error: Failed to write output file: ${err.message}`);
    process.exit(1);
  }
}

main();
