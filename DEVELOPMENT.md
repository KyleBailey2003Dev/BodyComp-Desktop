# Development setup

## Requirements

- Windows 10 or later
- Node.js 22.12 or later and npm

The Electron main process uses Node's built-in `node:sqlite` API, so older
Node.js versions are not supported.

## Install and run

Open a terminal in the repository directory. In PowerShell, use the Windows
command shims:

```powershell
npm.cmd install
npm.cmd run desktop:dev
```

In Command Prompt, the standard commands work:

```bat
npm install
npm run desktop:dev
```

The install runs Electron's postinstall setup and downloads the Electron
runtime. The development command opens the desktop app; close its window to
stop it.

Run the test suite with `npm.cmd test` in PowerShell or `npm test` in Command
Prompt.

## PowerShell troubleshooting

If PowerShell reports that `npm.ps1` cannot be loaded because script execution
is disabled, use `npm.cmd` instead. For example, run `npm.cmd install` and
`npm.cmd run desktop:dev`. This uses npm's Windows command shim and does not
require changing PowerShell's execution policy.

If Electron fails to start after installing with an older Node.js version,
install Node.js 22.12 or later, then run `npm.cmd install` again.

## Local data

The app is offline-first. Its local profile databases are stored in
`%APPDATA%\bodycomp-desktop`. See [README.md](README.md) for profile and backup
details, and [STORE_DEPLOYMENT.md](STORE_DEPLOYMENT.md) for packaging and
release procedures.
