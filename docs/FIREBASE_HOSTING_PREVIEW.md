# Firebase Hosting — preview & cutover runbook

> **State (10 Jul):** configuration prepared, NOTHING deployed. GitHub
> Pages (main branch) remains the live arnready.com site. Every deploy,
> DNS change, or Firebase Console change below is gated on Anusha's
> explicit approval — approved design constraint, not a suggestion.

## What's configured

- `firebase.json` — hosting only, serving the Next.js static export in
  `out/` with `cleanUrls` (matches `trailingSlash: false`), long-lived
  immutable caching for `/_next/static`, and revalidated HTML.
- `.firebaserc` — default project `arnready` (same project as the app;
  inherited from the legacy scaffold).
- There is deliberately NO GitHub Action or deploy hook. Pushes deploy
  nothing on Firebase; pushes to **main** still deploy GitHub Pages, so
  the web-product branch must not merge to main until cutover is
  approved.

## Building the site

```sh
npm ci
npm run export-content   # needs the Firestore SA key OUTSIDE the repo:
                         # ../ARNReady-App/scripts/serviceAccountKey.json
                         # or ARNREADY_SA_KEY=/path/to/key.json
npm run build            # next build (static export) + paid-content leak gate
```

The build FAILS if the leak gate finds any paid question ID or text
fingerprint in `out/` — that gate is the license to put this on a public
host at all.

## Local preview (no Firebase touched)

Either works; the emulator also exercises `firebase.json` rewrites,
cleanUrls, and headers:

```sh
npx serve out                                  # quick look
npx firebase-tools emulators:start --only hosting   # faithful hosting preview
```

Sign-in stays unavailable in local previews until the Firebase **Web
App** is registered (an Anusha decision — see `.env.example`). Unsigned
free-tier flows are fully testable without it.

## Preview channel (first Firebase action — needs approval)

Preview channels deploy to a temporary `*.web.app` URL without touching
production hosting, DNS, or GitHub Pages. Still: **do not run without
Anusha's go-ahead**, because it is the first real deploy to the
`arnready` project.

```sh
npx firebase-tools hosting:channel:deploy web-preview --expires 7d
```

## Production cutover (approval-gated, in this order)

1. Anusha reviews the preview channel on desktop + phone.
2. Play-gate URLs (`/privacy`, `/delete-account`, `/support`) verified
   byte-for-byte equivalent to the live pages.
3. Hosting-scoped deploy only — never a bare `firebase deploy`:
   ```sh
   npx firebase-tools deploy --only hosting
   ```
4. Add the custom domain in Firebase Console → Hosting and change DNS
   at the registrar **last**, after the Firebase-hosted site is verified.
   GitHub Pages stays live until DNS has fully cut over.
5. Only then retire the GitHub Pages workflow/branch arrangement.

*ARNReady · ASM Tech — prepared 10 Jul, deploy pending approval.*
