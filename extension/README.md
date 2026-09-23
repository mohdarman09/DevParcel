# DevParcel for Visual Studio Code

**DevParcel** is a developer-focused VS Code extension for packaging, securing, and temporarily sharing project workspaces directly from your editor.

Package your active workspace into a clean ZIP archive, share it natively via your OS, or generate temporary, self-expiring download links with optional password protection — without leaving your code editor.

---

## Features

- 📦 **One-Click Workspace Packaging** — Package your entire project into a clean, portable ZIP archive with a single click.
- 🛡️ **Smart Security Exclusions** — Automatically excludes `node_modules/`, `.git/`, build artifacts (`dist/`, `build/`, `.next/`), cache directories, and environment files (`.env*`).
- 🔒 **Sensitive File Warning & Protection** — Proactively detects `.env`, `.pem`, `.key`, `.p12`, `.pfx`, and other secrets before packaging, giving you full visibility and control over included files.
- 🌐 **Temporary Share Links** — Generate secure, expiring download links (`https://dev-parcel.vercel.app/share/:token`) for friction-free sharing with teammates, clients, or peer reviewers. Recipients do not need an account.
- 🔑 **Password Protection** — Secure sensitive project shares with Argon2id-hashed passwords and rate-limited brute-force protection.
- ⏱️ **Configurable Expiry** — Customize link lifetime from 1 hour up to 7 days (default: 24 hours).
- 📜 **Share History & Revocation** — Review active and expired shares, track download counts, and instantly revoke any active link at any time.
- 📊 **50 MB Guard with Explorer Fallback** — Proactively checks package sizes and automatically offers local OS file opening for packages exceeding cloud limits.
- 🎯 **Drag-and-Drop Sharing** — Drag and drop any existing ZIP archive into the DevParcel sidebar to share it immediately.
- 🖥️ **Native OS Sharing** — Share archives directly through Windows Explorer or your operating system's native sharing capabilities.

---

## Extension Commands

DevParcel contributes the following commands to the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Title | Description |
| :--- | :--- | :--- |
| `devparcel.open` | **DevParcel: Open** | Focuses the DevParcel sidebar view in the Activity Bar. |
| `devparcel.downloadZip` | **DevParcel: Download ZIP** | Packages the active workspace and saves the ZIP locally. |
| `devparcel.shareZip` | **DevParcel: Share ZIP** | Packages the workspace and opens the ZIP via OS native sharing. |
| `devparcel.shareDownloadLink` | **DevParcel: Share Download Link** | Packages and uploads the workspace to generate a temporary download link. |
| `devparcel.openSettings` | **DevParcel: Open Settings** | Opens DevParcel extension configuration settings. |

---

## Configuration Settings

Customize DevParcel behavior via VS Code Settings (`Ctrl+,` / `Cmd+,` → search **DevParcel**):

- `devparcel.defaultExclusions`: List of directory and file patterns excluded from packaging (defaults include `node_modules/`, `.git/`, `.env*`, `dist/`, `build/`, `.cache/`, `.next/`, `coverage/`).
- `devparcel.showProjectSummary`: Whether to display the pre-packaging file summary and sensitive file warnings (default: `true`).
- `devparcel.defaultLinkExpiryHours`: Default temporary share link lifetime in hours (default: `24`).
- `devparcel.passwordProtectShares`: Require a password by default when creating new share links (default: `false`).

---

## Security & Privacy Architecture

DevParcel is engineered with security as a primary design requirement:

1. **Zero Unintended Secret Exposure**: Known secret patterns (`.env*`, `.pem`, `.key`, certificates) are excluded by default and flagged prior to packaging.
2. **Server-Side Expiry Enforcement**: Expiry is strictly enforced by the backend and database. Expired shares return HTTP 410 and cannot be downloaded.
3. **Short-Lived Signed URLs**: Download transfers use temporary pre-signed object storage URLs valid for 5 minutes only.
4. **Argon2id Password Security**: Passwords are never stored in plaintext and never appear in URLs.
5. **Sender-Only Revocation**: Only the original creator (verified by cryptographically isolated sender identity) can revoke an active share.
6. **Isolated Environments**: Extension automatically uses local development endpoints in development runtime, and secure production cloud endpoints in production.

---

## Requirements

- VS Code version `1.85.0` or higher.
- An open workspace or folder to package and share.

---

## License

DevParcel is proprietary software. Copyright (c) 2026 Mohd Arman. All rights reserved.
See [LICENSE](LICENSE) for details.
