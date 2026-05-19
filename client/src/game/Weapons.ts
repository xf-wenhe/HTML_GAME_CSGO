import { Weapon } from './Weapon.js';

export const WEAPON_DEFINITIONS: Record<string, Weapon> = {
  pistol: new Weapon({
    id: 'pistol',
    name: 'Pistol',
    damage: 20,
    fireRate: 2,
    magazineSize: 12,
    reloadTime: 1.5,
    spread: 0.05,
    projectileSpeed: 50
  }),
  rifle: new Weapon({
    id: 'rifle',
    name: 'Assault Rifle',
    damage: 15,
    fireRate: 8,
    magazineSize: 30,
    reloadTime: 2,
    spread: 0.08,
    projectileSpeed: 80
  }),
  shotgun: new Weapon({
    id: 'shotgun',
    name: 'Shotgun',
    damage: 10,
    fireRate: 1,
    magazineSize: 8,
    reloadTime: 3,
    spread: 0.3,
    projectileSpeed: 40
  })
};