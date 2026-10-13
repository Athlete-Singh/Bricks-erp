/**
 * Vercel's entry point. Everything is routed here by vercel.json.
 *
 * It requires the compiled output rather than the TypeScript source on purpose:
 * Vercel bundles this file with esbuild, which does not emit decorator
 * metadata, and NestJS and TypeORM are built entirely out of decorators. The
 * build command runs `nest build` (tsc) first, which does emit it, and this
 * file only hands the request over.
 *
 * Node 22.12 or newer is required: @nestjs/jwt v12 is ESM-only, and `require()`
 * of an ESM package is what Node allows from 22.12 on. On an older runtime
 * every request dies with ERR_REQUIRE_ESM before the app is even built, which
 * is why `engines.node` says so. The Node version is chosen there and in the
 * project's settings — `functions.runtime` in vercel.json is for custom
 * runtimes and rejects a bare version.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS entry for the platform
module.exports = require('../dist/serverless').default;
