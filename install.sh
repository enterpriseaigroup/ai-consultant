#!/usr/bin/env bash
# AI Consultant, powered by Enterprise AI: one-line install for Mac and Linux.
#   curl -fsSL https://raw.githubusercontent.com/enterpriseaigroup/ai-consultant/main/install.sh | bash
# Installs the plugin into Claude Code, gets the walkthrough recorder ready, and makes an
# "AI Consultant" folder to start in. It only changes Claude Code's plugin list and that folder.
set -euo pipefail

say()  { printf '%s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
stop() { printf '\n%s\n\n' "$*"; exit 1; }
DIR="${AI_CONSULTANT_DIR:-$HOME/AI Consultant}"

say ""
say "AI Consultant, powered by Enterprise AI"

step "1. Checking what you have"
if ! command -v claude >/dev/null 2>&1; then
  stop "Claude Code isn't installed yet. Install it from https://claude.com/claude-code (or open the Claude app's Code tab once), then run this line again."
fi
if ! command -v node >/dev/null 2>&1; then
  stop "Node.js isn't installed yet. It shows you the prototype in a browser. Install the LTS version from https://nodejs.org, then run this line again."
fi
say "Claude Code and Node.js are ready."

step "2. Adding AI Consultant to Claude Code"
# Running this again updates an existing install.
claude plugin marketplace update enterprise-ai >/dev/null 2>&1 && claude plugin update ai-consultant@enterprise-ai >/dev/null 2>&1 || true
claude plugin install ai-consultant --marketplace enterpriseaigroup/ai-consultant >/dev/null 2>&1 \
  || { claude plugin marketplace add enterpriseaigroup/ai-consultant >/dev/null 2>&1 || true; claude plugin install ai-consultant@enterprise-ai >/dev/null 2>&1; } \
  || stop "Claude Code couldn't install the plugin. Update Claude Code (claude update) and run this line again."
claude plugin install ai-consultant-design-kit@enterprise-ai >/dev/null 2>&1 || true
# Keep it up to date by itself: Claude Code checks our marketplace for new versions after a session starts.
node -e '
const fs = require("fs"), f = require("os").homedir() + "/.claude/plugins/known_marketplaces.json";
try { const m = JSON.parse(fs.readFileSync(f, "utf8")); if (m["enterprise-ai"]) { m["enterprise-ai"].autoUpdate = true; fs.writeFileSync(f, JSON.stringify(m, null, 2)); } } catch {}' || true
say "Installed, and set to update itself. It only switches on in a new, empty folder, so your other projects aren't affected."

step "3. Getting the walkthrough recorder ready (about a minute, once)"
TOOLS="$HOME/.eai-tools"
if [ ! -f "$TOOLS/node_modules/html-recording/tools/reel.mjs" ]; then
  mkdir -p "$TOOLS" && cd "$TOOLS"
  [ -f package.json ] || echo '{ "name": "eai-tools", "private": true }' > package.json
  { npm i -D html-recording@0.2.0 >/dev/null 2>&1 && npx html-recording setup >/dev/null 2>&1 && say "Ready."; } \
    || say "Skipped: it will set itself up the first time you need it."
else
  say "Already ready."
fi

step "4. Making a folder to start in"
mkdir -p "$DIR"
say "$DIR"

say ""
say "Done. Next:"
say "  In the Claude app: open Code, choose the \"$(basename "$DIR")\" folder, and say what you'd like to build."
say "  Or in Terminal:    cd \"$DIR\" && claude"
say ""
[ "$(uname)" = "Darwin" ] && open "$(dirname "$DIR")" >/dev/null 2>&1 || true
