# Real Texture Pack Guide

Drop your texture files into this folder and the game will load them automatically.

## Supported Material Keys

- sand
- concrete
- plaster
- wood
- metal

## Recommended File Names

At minimum, each material needs one color map:

- `sand_color.jpg`
- `concrete_color.jpg`
- `plaster_color.jpg`
- `wood_color.jpg`
- `metal_color.jpg`

Optional maps for better realism:

- normal map: `*_normal.jpg`
- roughness map: `*_roughness.jpg`

Examples:

- `sand_normal.jpg`
- `concrete_roughness.jpg`

## Also Accepted Naming Variants

Color map suffixes:

- `_color`
- `_albedo`
- `_basecolor`
- `_base_color`
- `_diffuse`

Normal map suffixes:

- `_normal`
- `_nrm`
- `_nor`

Roughness map suffixes:

- `_roughness`
- `_rough`

Supported extensions:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

## Notes

- If no real texture is found for a material key, the game falls back to procedural Canvas textures.
- Texture URL path used by the engine is `/assets/textures`.
- Keep files tileable (seamless) for best visual quality.
