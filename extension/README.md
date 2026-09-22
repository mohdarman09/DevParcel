# DevParcel Extension

DevParcel is a developer-focused extension designed to package the current project workspace safely and make it easy to download, share, or generate a temporary browser download link directly from your editor.

---

## 📌 Current Status: Phase 1 (Extension Foundation)

DevParcel is currently in **Phase 1 — Extension Foundation**.

In this phase, we have established the foundational VS Code-compatible extension shell, TypeScript configuration, command registrations, workspace detection, and the sidebar UI structure.

> **Note**: ZIP generation, OS-level sharing, backend APIs, and cloud sharing are **planned for future phases** and are not yet implemented in Phase 1. The action buttons in the interface currently serve as UI placeholders.

---

## 🚀 Features Implemented in Phase 1

- **Workspace Detection**:
  - Automatically identifies whether a project workspace or folder is currently open in the editor.
  - Displays the active workspace name and "Workspace detected" status.
  - Gracefully handles the "No workspace detected" state when no folder is open.
- **DevParcel Activity Bar & Sidebar**:
  - Adds a dedicated DevParcel icon and view container in the editor's Activity Bar.
  - Displays the main DevParcel sidebar interface with project status and action placeholders.
- **Command Palette Integration**:
  - `DevParcel: Open`: Focuses the DevParcel sidebar interface.
  - `DevParcel: Download ZIP`: Placeholder command informing users of Phase 3 availability.
  - `DevParcel: Share ZIP`: Placeholder command informing users of Phase 5 availability.
  - `DevParcel: Share Download Link`: Placeholder command informing users of Phase 7 availability.
  - `DevParcel: Open Settings`: Opens DevParcel extension configuration.
- **Modular Architecture**:
  - Clear separation of concerns (`commands/`, `workspace/`, `ui/`, `config/`, `types/`).

---

## 🔮 Roadmap & Upcoming Phases

- **Phase 2**: Workspace & File Scanner with Default & Custom Security Exclusions
- **Phase 3**: ZIP Generation Engine with relative path preservation and local download
- **Phase 4**: Project Summary & Sensitive File Warning/Confirmation flow
- **Phase 5**: OS-level Sharing Integration
- **Phase 6**: Express Backend & Cloud Storage Adapters
- **Phase 7**: Temporary Share Links & Browser Download Page (no recipient login needed)
- **Phase 8**: Security Hardening, Rate Limiting & Storage Auto-Cleanup
- **Phase 9**: Cross-Editor Compatibility (VS Code, Antigravity IDE, Cursor)
- **Phase 10**: Packaging & Publishing

---

## 🛠️ Development & Build Instructions

### Prerequisites
- Node.js (v18.x or later recommended)
- npm

### 1. Install Dependencies
```bash
cd extension
npm install
```

### 2. Compile TypeScript
To compile once:
```bash
npm run compile
```

To run TypeScript compiler in watch mode during development:
```bash
npm run watch
```

To perform type-checking:
```bash
npm run typecheck
```

### 3. Launching in Extension Development Host
1. Open the `DevParcel` workspace in VS Code or Antigravity IDE.
2. Press `F5` or open the **Run and Debug** view (`Ctrl+Shift+D` / `Cmd+Shift+D`).
3. Select **Run Extension** to launch a new **Extension Development Host** window with DevParcel loaded.
4. In the Extension Development Host:
   - Click on the 📦 **DevParcel** icon in the Activity Bar to open the sidebar.
   - Or open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type `DevParcel: Open`.
