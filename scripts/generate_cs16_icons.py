#!/usr/bin/env python3
"""
Generate CS 1.6-style weapon icons (pixel art)
Creates HUD-style icons (blue/green pixel art) and buy menu previews
"""

import os
from PIL import Image, ImageDraw
from pathlib import Path

# CS 1.6 color palette
CS16_BLUE = (0, 162, 232)       # Primary blue
CS16_DARK_BLUE = (0, 120, 180)  # Darker shade
CS16_GREEN = (0, 232, 162)      # Alternative green
CS16_DARK_GREEN = (0, 180, 120)
CS16_GRAY = (128, 128, 128)
CS16_DARK_GRAY = (64, 64, 64)
BG_COLOR = (0, 0, 0, 0)         # Transparent

# Weapon definitions for simple shapes
WEAPONS = {
    # Pistols
    'glock': {
        'shape': 'pistol',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'Glock-18'
    },
    'usp': {
        'shape': 'pistol',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'USP-S'
    },
    'p228': {
        'shape': 'pistol',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'P228'
    },
    'deagle': {
        'shape': 'deagle',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'Desert Eagle'
    },
    'fiveseven': {
        'shape': 'pistol',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'Five-SeveN'
    },

    # SMGs
    'mp5': {
        'shape': 'smg',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'MP5'
    },
    'tmp': {
        'shape': 'smg',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'TMP'
    },
    'p90': {
        'shape': 'p90',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'P90'
    },
    'mac10': {
        'shape': 'smg',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'MAC-10'
    },
    'ump45': {
        'shape': 'smg',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'UMP-45'
    },

    # Shotguns
    'm3': {
        'shape': 'shotgun',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'M3 Super 90'
    },
    'xm1014': {
        'shape': 'shotgun',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'XM1014'
    },

    # Rifles
    'ak47': {
        'shape': 'ak47',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'AK-47'
    },
    'm4a1': {
        'shape': 'rifle',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'M4A1'
    },
    'sg552': {
        'shape': 'rifle',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'SG 552'
    },
    'aug': {
        'shape': 'aug',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'AUG'
    },
    'galil': {
        'shape': 'rifle',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'Galil'
    },
    'famas': {
        'shape': 'famas',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'FAMAS'
    },

    # Snipers
    'scout': {
        'shape': 'sniper',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'Scout'
    },
    'awp': {
        'shape': 'awp',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'AWP'
    },
    'sg550': {
        'shape': 'sniper',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'SG 550'
    },
    'g3sg1': {
        'shape': 'sniper',
        'primary': CS16_BLUE,
        'secondary': CS16_DARK_BLUE,
        'name': 'G3SG1'
    },

    # Machine gun
    'm249': {
        'shape': 'machinegun',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'M249'
    },

    # Melee
    'knife': {
        'shape': 'knife',
        'primary': CS16_GRAY,
        'secondary': CS16_DARK_GRAY,
        'name': 'Knife'
    },

    # Equipment
    'hegrenade': {
        'shape': 'grenade',
        'primary': CS16_GREEN,
        'secondary': CS16_DARK_GREEN,
        'name': 'HE Grenade'
    }
}


def draw_pistol(draw, w, h, primary, secondary):
    """Draw a simple pistol shape"""
    # Slide
    draw.rectangle([4, h//2 - 3, w-8, h//2 + 2], fill=primary)
    # Grip
    draw.rectangle([w-10, h//2, w-4, h-4], fill=secondary)
    # Barrel tip
    draw.rectangle([2, h//2 - 2, 6, h//2 + 1], fill=secondary)


def draw_deagle(draw, w, h, primary, secondary):
    """Draw Desert Eagle (larger pistol)"""
    # Slide (wider)
    draw.rectangle([4, h//2 - 4, w-6, h//2 + 3], fill=primary)
    # Grip (angled)
    draw.rectangle([w-12, h//2, w-4, h-3], fill=secondary)
    # Barrel
    draw.rectangle([2, h//2 - 3, 8, h//2 + 2], fill=secondary)


def draw_smg(draw, w, h, primary, secondary):
    """Draw SMG shape"""
    # Body
    draw.rectangle([8, h//2 - 3, w-10, h//2 + 3], fill=primary)
    # Stock
    draw.rectangle([2, h//2 - 2, 10, h//2 + 2], fill=secondary)
    # Magazine
    draw.rectangle([w-16, h//2 + 1, w-10, h-4], fill=secondary)
    # Barrel
    draw.rectangle([w-10, h//2 - 2, w-4, h//2 + 2], fill=secondary)


def draw_p90(draw, w, h, primary, secondary):
    """Draw P90 (unique shape)"""
    # Main body (bulky top)
    draw.rectangle([6, h//2 - 5, w-8, h//2 + 3], fill=primary)
    # Grip
    draw.rectangle([w-14, h//2, w-8, h-4], fill=secondary)
    # Front grip
    draw.rectangle([10, h//2 + 2, 16, h-4], fill=secondary)


def draw_shotgun(draw, w, h, primary, secondary):
    """Draw shotgun"""
    # Long barrel
    draw.rectangle([4, h//2 - 2, w-16, h//2 + 2], fill=primary)
    # Stock
    draw.rectangle([2, h//2 - 1, 10, h//2 + 3], fill=secondary)
    # Pump/grip
    draw.rectangle([w-18, h//2 - 3, w-10, h//2 + 4], fill=secondary)


def draw_ak47(draw, w, h, primary, secondary):
    """Draw AK-47 (curved mag)"""
    # Body
    draw.rectangle([10, h//2 - 3, w-8, h//2 + 3], fill=primary)
    # Stock
    draw.rectangle([2, h//2 - 2, 12, h//2 + 2], fill=secondary)
    # Curved magazine (simple version)
    draw.rectangle([w-18, h//2 + 1, w-12, h-3], fill=secondary)
    # Barrel with front sight
    draw.rectangle([w-8, h//2 - 2, w-4, h//2 + 2], fill=secondary)
    draw.rectangle([w-6, h//2 - 4, w-5, h//2 - 2], fill=secondary)


def draw_rifle(draw, w, h, primary, secondary):
    """Draw standard rifle (M4, etc.)"""
    # Body
    draw.rectangle([8, h//2 - 3, w-10, h//2 + 3], fill=primary)
    # Stock
    draw.rectangle([2, h//2 - 2, 10, h//2 + 2], fill=secondary)
    # Magazine
    draw.rectangle([w-18, h//2 + 1, w-12, h-4], fill=secondary)
    # Barrel
    draw.rectangle([w-10, h//2 - 2, w-4, h//2 + 2], fill=secondary)


def draw_aug(draw, w, h, primary, secondary):
    """Draw AUG (bullpup)"""
    # Body (compact)
    draw.rectangle([10, h//2 - 3, w-6, h//2 + 3], fill=primary)
    # Scope on top (if space)
    if w >= 40:
        draw.rectangle([16, h//2 - 5, w-14, h//2 - 2], fill=secondary)
    # Stock (rear)
    draw.rectangle([2, h//2 - 2, 12, h//2 + 2], fill=secondary)
    # Barrel (front)
    draw.rectangle([w-6, h//2 - 1, w-3, h//2 + 1], fill=secondary)


def draw_famas(draw, w, h, primary, secondary):
    """Draw FAMAS (bullpup)"""
    # Body
    draw.rectangle([8, h//2 - 3, w-6, h//2 + 3], fill=primary)
    # Carry handle (if space)
    if w >= 40:
        draw.rectangle([14, h//2 - 5, w-14, h//2 - 2], fill=secondary)
    # Stock
    draw.rectangle([2, h//2 - 2, 10, h//2 + 2], fill=secondary)
    # Barrel
    draw.rectangle([w-6, h//2 - 1, w-3, h//2 + 1], fill=secondary)


def draw_sniper(draw, w, h, primary, secondary):
    """Draw sniper rifle (long barrel)"""
    # Body
    draw.rectangle([10, h//2 - 2, w-10, h//2 + 2], fill=primary)
    # Stock
    draw.rectangle([2, h//2 - 1, 12, h//2 + 1], fill=secondary)
    # Long barrel
    draw.rectangle([w-10, h//2 - 1, w-4, h//2 + 1], fill=secondary)
    # Scope (if space)
    if w >= 40:
        draw.rectangle([16, h//2 - 3, w-16, h//2 - 1], fill=secondary)
    # Bipod hint (if space)
    if w >= 40:
        draw.rectangle([w-14, h//2 + 2, w-12, h-2], fill=secondary)
        draw.rectangle([w-10, h//2 + 2, w-8, h-2], fill=secondary)


def draw_awp(draw, w, h, primary, secondary):
    """Draw AWP (iconic sniper)"""
    # Body
    draw.rectangle([8, h//2 - 2, w-8, h//2 + 2], fill=primary)
    # Large stock
    draw.rectangle([2, h//2 - 2, 10, h//2 + 2], fill=secondary)
    # Long barrel
    draw.rectangle([w-8, h//2 - 1, w-3, h//2 + 1], fill=secondary)
    # Scope (if space)
    if w >= 40:
        draw.rectangle([14, h//2 - 4, w-14, h//2 - 1], fill=secondary)
    # Magazine
    draw.rectangle([w-16, h//2 + 2, w-10, h-3], fill=secondary)


def draw_machinegun(draw, w, h, primary, secondary):
    """Draw M249 (large machine gun)"""
    # Body
    draw.rectangle([8, h//2 - 2, w-6, h//2 + 2], fill=primary)
    # Stock
    draw.rectangle([2, h//2 - 1, 10, h//2 + 1], fill=secondary)
    # Large box magazine
    draw.rectangle([w-18, h//2 + 1, w-10, h-3], fill=secondary)
    # Barrel
    draw.rectangle([w-6, h//2 - 1, w-3, h//2 + 1], fill=secondary)
    # Top handle (if space)
    if w >= 40:
        draw.rectangle([18, h//2 - 4, w-20, h//2 - 2], fill=secondary)


def draw_knife(draw, w, h, primary, secondary):
    """Draw knife"""
    # Blade
    draw.polygon([(w-4, h//2), (8, 4), (6, h-4)], fill=primary)
    # Handle
    draw.rectangle([2, h//2 - 3, 10, h//2 + 3], fill=secondary)
    # Guard
    draw.rectangle([10, h//2 - 4, 12, h//2 + 4], fill=secondary)


def draw_grenade(draw, w, h, primary, secondary):
    """Draw HE grenade"""
    # Body (rounded rectangle approximation)
    draw.rectangle([8, h//2 - 5, w-8, h//2 + 5], fill=primary)
    # Top/spoon
    draw.rectangle([12, h//2 - 7, w-12, h//2 - 4], fill=secondary)
    # Safety lever
    draw.rectangle([w-12, h//2 - 3, w-8, h//2 + 3], fill=secondary)


SHAPE_DRAWERS = {
    'pistol': draw_pistol,
    'deagle': draw_deagle,
    'smg': draw_smg,
    'p90': draw_p90,
    'shotgun': draw_shotgun,
    'ak47': draw_ak47,
    'rifle': draw_rifle,
    'aug': draw_aug,
    'famas': draw_famas,
    'sniper': draw_sniper,
    'awp': draw_awp,
    'machinegun': draw_machinegun,
    'knife': draw_knife,
    'grenade': draw_grenade
}


def create_hud_icon(weapon_id, weapon_data, output_dir):
    """Create 32x32 HUD icon"""
    w, h = 32, 32
    img = Image.new('RGBA', (w, h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    shape = weapon_data['shape']
    primary = weapon_data['primary']
    secondary = weapon_data['secondary']

    if shape in SHAPE_DRAWERS:
        SHAPE_DRAWERS[shape](draw, w, h, primary, secondary)

    output_path = output_dir / 'hud' / f'{weapon_id}.png'
    img.save(output_path, 'PNG')
    print(f'  ✓ HUD: {weapon_id}.png')


def create_buy_icon(weapon_id, weapon_data, output_dir):
    """Create larger buy menu icon (64x32)"""
    w, h = 64, 32
    img = Image.new('RGBA', (w, h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    shape = weapon_data['shape']
    primary = weapon_data['primary']
    secondary = weapon_data['secondary']

    if shape in SHAPE_DRAWERS:
        SHAPE_DRAWERS[shape](draw, w, h, primary, secondary)

    output_path = output_dir / 'buy' / f'{weapon_id}.png'
    img.save(output_path, 'PNG')
    print(f'  ✓ Buy: {weapon_id}.png')


def main():
    base_path = Path(__file__).parent / 'cs16-raw'
    (base_path / 'hud').mkdir(exist_ok=True)
    (base_path / 'buy').mkdir(exist_ok=True)

    print(f'Generating CS 1.6-style weapon icons...')
    print(f'Output directory: {base_path.absolute()}')
    print()

    # Remove placeholder files first
    for f in (base_path / 'hud').glob('*.placeholder'):
        f.unlink()
    for f in (base_path / 'buy').glob('*.placeholder'):
        f.unlink()

    # Generate icons
    for weapon_id, weapon_data in WEAPONS.items():
        create_hud_icon(weapon_id, weapon_data, base_path)
        create_buy_icon(weapon_id, weapon_data, base_path)

    print()
    print('Note: These are placeholders. Replace with authentic CS 1.6')
    print('      sprites if you can find them for maximum nostalgia.')
    print()
    print('Generated HUD icons: 32x32')
    print('Generated Buy icons: 64x32')


if __name__ == '__main__':
    main()
