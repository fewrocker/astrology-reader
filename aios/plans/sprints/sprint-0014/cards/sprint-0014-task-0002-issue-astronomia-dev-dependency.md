**Type:** Issue Fix
**Originated by:** Carmack, Taleb

## Problem

`astronomia` is listed under `devDependencies` in `package.json` (line 47), but `server/engine/astroCore.ts` requires it at runtime for asteroid position calculations via `elliptic.Elements.position()`.

The Node.js server resolves packages from `node_modules` at runtime. A standard production deployment running `npm install --production` — or any CI/CD step that strips dev dependencies before starting the server — will cause `require('astronomia')` to fail silently, producing incorrect or missing asteroid positions without throwing a catchable error.

This bug is latent today and becomes an active runtime failure the moment asteroid calculation code is merged. The server currently imports `astronomy-engine` (a production dependency) for all planet calculations; `astronomia` is earmarked specifically for the Keplerian asteroid path. Moving it at this point — before that code ships — is the lowest-cost correction window.

## Expected behavior

`astronomia` should be listed under `dependencies` so that it is present in every deployment context, including production environments that install only production dependencies. A production server build must be able to import and use `elliptic.Elements` without any additional installation steps.

## Outcome

Moved `astronomia@^4.2.0` from `devDependencies` to `dependencies` in `package.json`, placing it alphabetically between `astronomy-engine` and `bcryptjs`. Updated `package-lock.json` via `npm install`. Build verified clean (`✓ built in 9.89s`). The package is now present in production installs and will not fail when asteroid calculation code ships.
