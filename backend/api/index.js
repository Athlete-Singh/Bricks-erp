/**
 * Vercel's entry point. Everything is routed here by vercel.json.
 *
 * It requires the compiled output rather than the TypeScript source on purpose:
 * Vercel bundles this file with esbuild, which does not emit decorator
 * metadata, and NestJS and TypeORM are built entirely out of decorators. The
 * build command runs `nest build` (tsc) first, which does emit it, and this
 * file only hands the request over.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS entry for the platform
module.exports = require('../dist/serverless').default;
