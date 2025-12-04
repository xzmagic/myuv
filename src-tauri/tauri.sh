#!/usr/bin/env bash
set -euo pipefail

# Tauri runner & bootstrap for rag_app
# Usage: bash src-tauri/tauri.sh [dev|build]

CMD="${1:-dev}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { printf "[tauri.sh] %s\n" "$*"; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

bootstrap_tools() {
  local UNAME=$(uname)

  try_install_linux() {
    local pkg="$1"
    if [[ "$UNAME" == "Linux" ]] && need_cmd apt-get; then
      log "Installing $pkg via apt-get (requires sudo)..."
      sudo apt-get update && sudo apt-get install -y $pkg
    fi
  }

  try_install_macos() {
    local pkg="$1"
    if [[ "$UNAME" == "Darwin" ]] && need_cmd brew; then
      log "Installing $pkg via brew (requires sudo if prompted)..."
      brew install $pkg
    fi
  }

  # python3 for dev static server
  if ! need_cmd python3; then
    try_install_linux "python3"
    try_install_macos "python"
  fi

  # curl is needed for rustup bootstrap
  if ! need_cmd curl; then
    try_install_linux "curl"
    try_install_macos "curl"
  fi

  # Rust toolchain
  if ! need_cmd cargo; then
    log "cargo not found; installing Rust toolchain via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    export PATH="$HOME/.cargo/bin:$PATH"
  fi

  # Node.js + npm (try apt on Debian/Ubuntu)
  if ! need_cmd npm; then
    try_install_linux "nodejs npm" || true
    try_install_macos "node" || true
  fi

  # pnpm (preferred for speed)
  if ! need_cmd pnpm && need_cmd npm; then
    log "Installing pnpm globally..."
    npm install -g pnpm
  fi

  # Tauri CLI
  if ! cargo tauri --version >/dev/null 2>&1; then
    log "Installing tauri-cli..."
    cargo install tauri-cli --locked
  fi

  # Linux GUI dependencies for Tauri/WRY (skip on macOS)
  if [[ "$(uname)" == "Linux" ]]; then
    try_install_linux "libgtk-3-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libwebkit2gtk-4.1-dev pkg-config build-essential" || true
  fi
}

bootstrap_tools

log "Running Tauri (${CMD}) from $ROOT_DIR"

# If dev, start a simple static server for frontend assets (src-tauri/rag_app)
SERVER_PID=""
if [[ "$CMD" == "dev" ]]; then
  if need_cmd python3; then
    python3 -m http.server 5180 --directory "$ROOT_DIR/src-tauri/rag_app" --bind 0.0.0.0 >/dev/null 2>&1 &
    SERVER_PID=$!
    trap '[[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
  else
    log "python3 not found; dev static server will not start."
  fi
fi

exec cargo tauri "${CMD}"
