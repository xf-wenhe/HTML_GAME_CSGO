#!/usr/bin/env python3
"""
Download CS 1.6 weapon icons from reliable sources.
Searches for both HUD sprites and buy menu preview images.
"""
import os
import sys
import requests
from pathlib import Path

# Weapon list - CS 1.6 only
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

def main():
    base_path = Path(__file__).parent / 'cs16-raw'
    base_path.mkdir(exist_ok=True)

    hud_path = base_path / 'hud'
    buy_path = base_path / 'buy'
    hud_path.mkdir(exist_ok=True)
    buy_path.mkdir(exist_ok=True)

    print(f"Download directory: {base_path.absolute()}")
    print(f"Weapons to find: {len(CS16_WEAPONS)}")
    print("\nNOTE: This script is a template.")
    print("Actual downloading will be done via web search and manual curation.")
    print("\nExpected icon sources:")
    print("- CS 1.6 HUD sprites (blue/green pixel art)")
    print("- CS 1.6 buy menu preview images")
    print("- Community sprite packs (GameBanana, etc.)")

    # Create placeholder files to show structure
    for weapon in CS16_WEAPONS:
        (hud_path / f'{weapon}.placeholder').write_text(f'CS 1.6 {weapon} HUD icon placeholder')
        (buy_path / f'{weapon}.placeholder').write_text(f'CS 1.6 {weapon} buy menu icon placeholder')

    print(f"\nCreated {len(CS16_WEAPONS) * 2} placeholder files.")
    print("\nNext steps:")
    print("1. Web search for: 'CS 1.6 weapon sprites', 'CS 1.6 HUD icons', 'CS 1.6 buy menu'")
    print("2. Download matching icons for each weapon")
    print("3. Replace placeholder files with actual images")
    print("4. Run Task 3 to process into final format")

if __name__ == '__main__':
    main()
