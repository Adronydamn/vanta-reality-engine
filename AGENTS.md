# Agent notes

- Project root: `vanta/` (parent folder name contains Cyrillic/spaces, so npm package lives here).
- On Windows PowerShell use `npm.cmd` / `npx.cmd` (script execution policy blocks `npm.ps1`).
- Verify: `npm.cmd run typecheck` and `npm.cmd run build`.
- Visual smoke test: headless Chrome with `--use-angle=swiftshader --enable-unsafe-swiftshader` renders the scene (≈2 FPS).
- GLSL lives in `shaders/*.glsl.ts`; `HISTORY_SIZE` / `SCREEN_RINGS` are interpolated from TS constants.
- Never setState per frame: runtime data goes through `lib/engine.ts` and shared uniforms.
