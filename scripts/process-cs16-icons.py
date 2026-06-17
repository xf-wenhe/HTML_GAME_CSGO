#!/usr/bin/env python3
"""
Process raw CS 1.6 weapon icons into final SVG + PNG format.
- HUD icons: 32x32 pixel art, CS 1.6 blue/green style
- Buy menu icons: 128x64 preview style
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import json

CS16_WEAPONS = [
    # Pistols
    'glock', 'usp', 'p228', 'deagle', 'fiveseven',
    # SMGs
    'mp5', 'tmp', 'p90', 'mac10', 'ump45',
    # Shotguns
    'm3', 'xm1014',
    # Rifles
    'ak47', 'm4a1', 'sg552', 'aug', 'galil', 'famas',
    # Snipers
    'scout', 'awp', 'sg550', 'g3sg1',
    # Machine gun
    'm249',
    # Melee
    'knife',
    # Equipment
    'hegrenade'
]

# CS 1.6 color palette
CS16_BLUE = (0, 160, 255)
CS16_GREEN = (0, 255, 128)
CS16_DARK = (0, 60, 120)

def image_to_svg(image, weapon, size=32):
    """Convert PIL Image to simple SVG representation by tracing pixels."""
    width, height = image.size
    svg_parts = []

    # Add SVG header
    svg_parts.append(f'<svg width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg">')

    # Convert each non-transparent pixel to a rect
    pixels = image.load()
    scale = size / width if width > 0 else 1

    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]
            if len(pixel) == 4 and pixel[3] > 0:  # RGBA with alpha
                r, g, b, a = pixel
                color = f'#{r:02x}{g:02x}{b:02x}'
                opacity = a / 255.0
                svg_parts.append(f'    <rect x="{x * scale:.1f}" y="{y * scale:.1f}" width="{scale:.1f}" height="{scale:.1f}" fill="{color}" opacity="{opacity:.2f}"/>')
            elif len(pixel) == 3:  # RGB
                r, g, b = pixel
                color = f'#{r:02x}{g:02x}{b:02x}'
                svg_parts.append(f'    <rect x="{x * scale:.1f}" y="{y * scale:.1f}" width="{scale:.1f}" height="{scale:.1f}" fill="{color}"/>')

    svg_parts.append('</svg>')
    return '\n'.join(svg_parts)

def process_raw_icon(raw_path, target_size=(32, 32)):
    """Process a raw icon file with proper resizing."""
    try:
        img = Image.open(raw_path).convert('RGBA')

        # Resize with nearest neighbor for pixel art
        if img.size != target_size:
            img = img.resize(target_size, Image.Resampling.NEAREST)

        return img
    except Exception as e:
        print(f"  Warning: Could not process {raw_path}: {e}")
        return None

def create_pixel_icon(weapon, size=32):
    """Create placeholder CS 1.6 style pixel art icon (fallback)."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw simple weapon-like shape in CS 1.6 blue/green
    center = size // 2
    draw.rectangle([2, center-4, size-2, center+4], fill=CS16_BLUE)
    draw.rectangle([size//4, center-8, size//2, center-4], fill=CS16_GREEN)

    return img

def create_buy_icon(weapon, width=128, height=64):
    """Create placeholder CS 1.6 buy menu icon (fallback)."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background gradient (CS 1.6 style)
    for y in range(height):
        color = tuple(int(CS16_DARK[i] + (CS16_BLUE[i] - CS16_DARK[i]) * (y/height)) for i in range(3))
        draw.line([0, y, width, y], fill=color)

    # Simple weapon silhouette
    draw.rectangle([10, height//2-10, width-10, height//2+10], fill=CS16_GREEN)
    draw.rectangle([width//4, height//2-20, width//2, height//2-10], fill=CS16_BLUE)

    return img

def main():
    base_path = Path(__file__).parent.parent / 'client/public/assets/icons/cs16'
    raw_path = Path(__file__).parent / 'cs16-raw'
    hud_path = base_path / 'hud'
    buy_path = base_path / 'buy'

    hud_path.mkdir(parents=True, exist_ok=True)
    buy_path.mkdir(parents=True, exist_ok=True)

    print(f"Processing icons to: {base_path.absolute()}")

    hud_count = 0
    buy_count = 0

    for weapon in CS16_WEAPONS:
        # Process HUD icons (32x32)
        raw_hud = raw_path / 'hud' / f'{weapon}.png'
        if raw_hud.exists():
            hud_img = process_raw_icon(raw_hud, target_size=(32, 32))
            if hud_img:
                hud_img.save(hud_path / f'{weapon}.png')
                hud_svg = image_to_svg(hud_img, weapon, size=32)
                (hud_path / f'{weapon}.svg').write_text(hud_svg)
                hud_count += 1
            else:
                # Fallback to placeholder
                hud_img = create_pixel_icon(weapon, size=32)
                hud_img.save(hud_path / f'{weapon}.png')
                hud_svg = image_to_svg(hud_img, weapon, size=32)
                (hud_path / f'{weapon}.svg').write_text(hud_svg)
        else:
            # Fallback to placeholder
            hud_img = create_pixel_icon(weapon, size=32)
            hud_img.save(hud_path / f'{weapon}.png')
            hud_svg = image_to_svg(hud_img, weapon, size=32)
            (hud_path / f'{weapon}.svg').write_text(hud_svg)

        # Process buy menu icons (128x64)
        raw_buy = raw_path / 'buy' / f'{weapon}.png'
        if raw_buy.exists():
            buy_img = process_raw_icon(raw_buy, target_size=(128, 64))
            if buy_img:
                buy_img.save(buy_path / f'{weapon}.png')
                buy_svg = image_to_svg(buy_img, weapon, size=64)
                (buy_path / f'{weapon}.svg').write_text(buy_svg)
                buy_count += 1
            else:
                # Fallback to placeholder
                buy_img = create_buy_icon(weapon, width=128, height=64)
                buy_img.save(buy_path / f'{weapon}.png')
                buy_svg = image_to_svg(buy_img, weapon, size=64)
                (buy_path / f'{weapon}.svg').write_text(buy_svg)
        else:
            # Fallback to placeholder
            buy_img = create_buy_icon(weapon, width=128, height=64)
            buy_img.save(buy_path / f'{weapon}.png')
            buy_svg = image_to_svg(buy_img, weapon, size=64)
            (buy_path / f'{weapon}.svg').write_text(buy_svg)

        print(f"Processed {weapon} icons")

    print(f"\nComplete!")
    print(f"  HUD icons: {hud_count}/{len(CS16_WEAPONS)} from raw, {len(CS16_WEAPONS)} total PNG + {len(CS16_WEAPONS)} SVG")
    print(f"  Buy icons: {buy_count}/{len(CS16_WEAPONS)} from raw, {len(CS16_WEAPONS)} total PNG + {len(CS16_WEAPONS)} SVG")
    print(f"  Total files: {len(CS16_WEAPONS) * 4}")

if __name__ == '__main__':
    main()
