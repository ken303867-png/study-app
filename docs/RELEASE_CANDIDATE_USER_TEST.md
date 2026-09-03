# Release Candidate User Test Guide

## Scope

This package is the App v0.14.0 release candidate for hands-on evaluation before the final `v1.0.0` decision.

The GitHub build contains application code only. Formal 709-question / 114-material data is not committed to GitHub and must be imported separately from the retained local Canonical Master.

## Start the packaged app locally

1. Extract the `study-app-v0.14.0-rc-dist` ZIP.
2. Open a terminal in the extracted folder.
3. Start any local HTTP server. Examples:
   - Python: `python -m http.server 4173 --bind 127.0.0.1`
   - Windows Python launcher: `py -m http.server 4173 --bind 127.0.0.1`
4. Open `http://127.0.0.1:4173/` in Chrome or Edge.
5. Open **データ管理** and import the formal Canonical Master JSON or Excel Master.
6. After the initial online load and Service Worker registration, the installed PWA can be used offline.

Do not open `index.html` directly with `file://`; Service Worker and browser storage behavior require HTTP/HTTPS.

## User acceptance focus

During hands-on use, record whether each feature should be:

- Keep as-is.
- Simplify.
- Hide from the main UI but retain internally.
- Remove completely.

Recommended review targets:

- Search/filter controls.
- Practice set presets.
- Review/favorite controls.
- Learning dashboard metrics.
- Exam mode and timer.
- Material navigation.
- PWA install/connectivity controls.

## Data safety

- Learning history is stored in IndexedDB separately from content.
- Content re-import does not delete learning or exam history.
- Formal question/material content is not stored in GitHub.
- Cloud sync and in-app AI remain disabled.

## Final release rule

Do not tag `v1.0.0` until user acceptance/pruning changes are complete and the final regression QA passes again.
