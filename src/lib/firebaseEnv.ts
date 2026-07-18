/**
 * firebaseEnv — the dev/prod build-time toggle (Anusha, 2026-07-18).
 *
 * ONE switch, `NEXT_PUBLIC_APP_ENV` (`dev` | `prod`), selects which Firebase
 * project the web client authenticates against. It mirrors the app repo's
 * `EXPO_PUBLIC_APP_ENV` pattern (../ARNReady-App/config.js) and governs the
 * build-time content pull too — `scripts/export-content.mjs` reads the same
 * variable and refuses to run against a mismatched service-account project,
 * so public content and auth can never come from different projects.
 *
 * Because the site is a STATIC EXPORT, this is a build-time toggle: the
 * selected values are inlined at build, and switching environments means
 * rebuilding. There is no runtime switch and there must never be one.
 *
 * Two deliberate design rules, both fail-closed (manual §0.9):
 *
 * 1. NO DEFAULT. An unset or unrecognised `NEXT_PUBLIC_APP_ENV` resolves to
 *    an error, never to a guessed project. A misconfigured build must not
 *    silently authenticate real users against the dev project.
 * 2. NO THROW. Resolution returns a result object rather than throwing, so a
 *    misconfigured deployment renders a visible signed-out "auth
 *    unavailable" state instead of crashing the page — and an unresolved
 *    config can never be mistaken for an entitled user.
 *
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when the reference is
 * written as a complete static literal, so both variable sets are spelled
 * out below. Do not refactor these into a computed lookup — it compiles, and
 * silently yields `undefined` in the browser.
 */

export type AppEnv = 'dev' | 'prod';

/**
 * The project each env MUST resolve to. Pasting the wrong project's config
 * block into the wrong variable set is the realistic human error here, and
 * it is exactly the error that would point the live site at dev (or a dev
 * build at real users' data). Pinned, and asserted on every resolve.
 */
export const EXPECTED_PROJECT_ID: Record<AppEnv, string> = {
  dev: 'arnready-dev',
  prod: 'arnready',
};

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export type FirebaseConfigResult =
  | { ok: true; env: AppEnv; config: FirebaseWebConfig }
  | { ok: false; reason: string };

/** Raw, possibly-absent values for one environment. */
export type RawConfig = Partial<Record<keyof FirebaseWebConfig, string | undefined>>;

/** The four public identifiers, per env. Static literals — see the note above. */
const RAW: Record<AppEnv, RawConfig> = {
  dev: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_DEV_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_DEV_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_DEV_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_DEV_APP_ID,
  },
  prod: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_PROD_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_PROD_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROD_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_PROD_APP_ID,
  },
};

/** The env-var name carrying `field` for `env` — used only in error messages. */
function varName(env: AppEnv, field: keyof FirebaseWebConfig): string {
  const suffix = {
    apiKey: 'API_KEY',
    authDomain: 'AUTH_DOMAIN',
    projectId: 'PROJECT_ID',
    appId: 'APP_ID',
  }[field];
  return `NEXT_PUBLIC_FIREBASE_${env.toUpperCase()}_${suffix}`;
}

export function isAppEnv(value: unknown): value is AppEnv {
  return value === 'dev' || value === 'prod';
}

const FIELDS: (keyof FirebaseWebConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];

/**
 * Pure resolver — the whole toggle, testable without touching process.env.
 * TOTAL: never throws, for any input.
 */
export function resolveFirebaseConfig(
  appEnv: string | undefined,
  raw: Record<AppEnv, RawConfig>,
): FirebaseConfigResult {
  if (!isAppEnv(appEnv)) {
    return {
      ok: false,
      reason:
        `NEXT_PUBLIC_APP_ENV must be set to "dev" or "prod" (received ` +
        `${appEnv === undefined ? 'no value' : JSON.stringify(appEnv)}). ` +
        `There is deliberately no default — see src/lib/firebaseEnv.ts.`,
    };
  }

  const set = raw[appEnv] ?? {};

  // Trim before the emptiness check: a variable present but blank (the state
  // of the PROD_ set until the prod web app is registered) must read as
  // missing, not as a valid empty string.
  const values: Partial<FirebaseWebConfig> = {};
  const missing: string[] = [];
  for (const field of FIELDS) {
    const value = typeof set[field] === 'string' ? set[field].trim() : '';
    if (value === '') missing.push(varName(appEnv, field));
    else values[field] = value;
  }

  if (missing.length > 0) {
    return {
      ok: false,
      reason:
        `Firebase web config for NEXT_PUBLIC_APP_ENV="${appEnv}" is incomplete. ` +
        `Missing or blank: ${missing.join(', ')}. ` +
        `Set them in .env.local (see .env.example).`,
    };
  }

  const config = values as FirebaseWebConfig;
  const expected = EXPECTED_PROJECT_ID[appEnv];
  if (config.projectId !== expected) {
    return {
      ok: false,
      reason:
        `Project mismatch: NEXT_PUBLIC_APP_ENV="${appEnv}" requires projectId ` +
        `"${expected}", but ${varName(appEnv, 'projectId')} is ` +
        `"${config.projectId}". The wrong project's config block was pasted ` +
        `into the ${appEnv.toUpperCase()} variable set.`,
    };
  }

  return { ok: true, env: appEnv, config };
}

/** The resolved config for THIS build. Memoised — resolution is deterministic. */
let cached: FirebaseConfigResult | null = null;

export function getFirebaseConfig(): FirebaseConfigResult {
  cached ??= resolveFirebaseConfig(process.env.NEXT_PUBLIC_APP_ENV, RAW);
  return cached;
}

/** Test-only: clears the memo so a test can vary the environment. */
export function resetFirebaseConfigCache(): void {
  cached = null;
}
