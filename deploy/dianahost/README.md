# Node 20 deployment profile

These are packaging inputs, not a second copy of the application. The application source remains in the repository's `src/` directory.

From the repository root, run:

```bash
npx --yes --package=node@20.20.2 -c 'node scripts/package-dianahost.cjs --live'
```

The script stages current source with this manifest/lockfile, builds and tests it, then produces `artifacts/gridwise-dianahost-node20.zip`. Upload that archive through cPanel following [the deployment walkthrough](../../README.md#reproducing-the-deployment-elsewhere). The startup file in this directory is copied into the archive root.

Dependency changes for this profile must pass an engine-strict clean install on Node.js 20.20.2. The scoped Multer override supplies the patched 2.4.0 release to the NestJS 11 adapter. The main project's dependency lockfile is independent.
