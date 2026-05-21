import { MapId, Team, Vector3 } from '../../../../shared/types.js';

export interface BombSiteConfig {
  id: 'A' | 'B';
  position: Vector3;
  radius: number;
}

export interface MultiplayerMapConfig {
  id: MapId;
  name: string;
  spawns: Record<Team, Vector3[]>;
  tdmSpawns: Vector3[];
  bombSites: BombSiteConfig[];
  callouts: Array<{ name: string; position: Vector3; radius: number }>;
}

export const MULTIPLAYER_MAPS: Record<MapId, MultiplayerMapConfig> = {
  forgepoint: {
    id: 'forgepoint',
    name: 'Forgepoint',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 30 },
        { x: -5, y: 1.7, z: 30 },
        { x: 0, y: 1.7, z: 30 },
        { x: 5, y: 1.7, z: 30 },
        { x: 10, y: 1.7, z: 30 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 },
        { x: -5, y: 1.7, z: -46 },
        { x: 0, y: 1.7, z: -46 },
        { x: 5, y: 1.7, z: -46 },
        { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 25 },
      { x: 30, y: 1.7, z: 25 },
      { x: -30, y: 1.7, z: -40 },
      { x: 30, y: 1.7, z: -40 },
      { x: -8, y: 1.7, z: 8 },
      { x: 8, y: 1.7, z: -22 },
      { x: -24, y: 1.7, z: -8 },
      { x: 24, y: 1.7, z: -8 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'B Site', position: { x: 24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -8 }, radius: 11 },
      { name: 'T Spawn', position: { x: 0, y: 1.7, z: 30 }, radius: 9 },
      { name: 'CT Spawn', position: { x: 0, y: 1.7, z: -46 }, radius: 9 },
      { name: 'A Long', position: { x: -30, y: 1.7, z: -12 }, radius: 10 },
      { name: 'B Long', position: { x: 30, y: 1.7, z: -12 }, radius: 10 }
    ]
  }
};
