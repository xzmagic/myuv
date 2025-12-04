# Tauri Desktop App Compilation Guide

This directory contains the source code for the Tauri-based desktop application wrapper (`rag-app`). It wraps the static frontend located in `rag_app/` and communicates with the Python backend.

## Prerequisites

To build the application, you need to set up the Rust environment and install necessary system dependencies.

### 1. Install Rust
Install Rust using `rustup`:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Install System Dependencies (Linux)
The following dependencies are required for compiling Tauri on Linux (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libwebkit2gtk-4.1-dev pkg-config build-essential
```
*Note: If you are on an older distribution, you might need `libwebkit2gtk-4.0-dev` instead.*

### 3. Install Tauri CLI
```bash
cargo install tauri-cli
```

---

## Build Commands

We provide a helper script `tauri.sh` (Linux/macOS) and `tauri.ps1` (Windows) to simplify the process.

### Using the Helper Script

**Build for Production (Default)**:
This compiles the release version of the application.
```bash
# From project root or src-tauri
bash src-tauri/tauri.sh
# or if inside src-tauri
./tauri.sh
```

**Development Mode** (Hot Reload):
This will check dependencies and start the app in development mode.
```bash
# From project root or src-tauri
bash src-tauri/tauri.sh dev
# or if inside src-tauri
./tauri.sh dev
```

### Manual Compilation

If you prefer to run `cargo` directly:

1. **Navigate to the directory**:
   ```bash
   cd src-tauri
   ```

2. **Run in Development**:
   You need to serve the `rag_app` directory first (Tauri expects it at http://localhost:5180 by default config).
   ```bash
   # Terminal 1: Serve frontend
   python3 -m http.server 5180 --directory rag_app --bind 0.0.0.0
   
   # Terminal 2: Run Tauri
   cargo tauri dev
   ```

3. **Build Release**:
   ```bash
   cargo tauri build
   ```

## Output Artifacts

After a successful build, the binaries and installers can be found in:

- **Debian Package**: `src-tauri/target/release/bundle/deb/`
- **AppImage**: `src-tauri/target/release/bundle/appimage/`
- **Binary**: `src-tauri/target/release/rag-app`

## Configuration

- **Configuration File**: `src-tauri/tauri.conf.json`
- **Frontend Source**: `src-tauri/rag_app/` (Static HTML/JS)
- **Backend API**: The app expects the backend to be running at `http://localhost:18888`.

