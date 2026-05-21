# Asset Attribution

This project is prepared for free GLB/HDR/PBR assets, with procedural fallbacks for every required gameplay object.

Current implementation:
- Weapon models: procedural fallback meshes in `client/src/game/assets.ts`.
- Enemy model: procedural fallback mesh in `client/src/game/assets.ts`.
- Arena props/materials: procedural Three.js geometry and materials.

Approved sources for future replacements:
- Quaternius free game assets: https://quaternius.com/
- Poly Haven CC0 HDRIs/materials: https://polyhaven.com/license
- Open Source 3D Assets CC0 GLB collection: https://www.opensource3dassets.com/
- FreePixel free GLB game assets: https://freepixel.art/3d-assets

When a downloaded model or texture is added, record its source URL, author, license, and filename here before committing it.
