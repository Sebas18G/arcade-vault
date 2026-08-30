#!/usr/bin/env bash
# PostToolUse hook: formatea con Prettier y lintea con ESLint el archivo
# que Write/Edit/MultiEdit acaban de tocar. Si ESLint deja errores sin
# auto-arreglar, bloquea y reporta el detalle a Claude.
set -uo pipefail

input="$(cat)"

file="$(node -e '
let data = "";
process.stdin.on("data", (d) => (data += d));
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(data);
    process.stdout.write((j.tool_input && j.tool_input.file_path) || "");
  } catch (e) {
    process.stdout.write("");
  }
});
' <<< "$input")"

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
  */node_modules/*|*/.next/*|*/out/*|*/build/*|*/references/*) exit 0 ;;
esac

ext="${file##*.}"
case "$ext" in
  ts|tsx|js|jsx|mjs|cjs|md|mdx|css|json) ;;
  *) exit 0 ;;
esac

npx --no-install prettier --write "$file" >/dev/null 2>&1

case "$ext" in
  ts|tsx|js|jsx|mjs|cjs)
    lint_output="$(npx --no-install eslint --fix "$file" 2>&1)"
    lint_status=$?
    if [ "$lint_status" -ne 0 ]; then
      node -e '
        const file = process.argv[1];
        const output = process.argv[2];
        const msg = "ESLint encontró errores en " + file + " que no se pudieron corregir automáticamente:\n" + output;
        process.stdout.write(JSON.stringify({ decision: "block", reason: msg }));
      ' "$file" "$lint_output"
      exit 0
    fi
    ;;
esac

exit 0
