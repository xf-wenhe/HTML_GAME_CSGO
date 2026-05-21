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
        { x: -8, y: 1.7, z: 12 },
        { x: -4, y: 1.7, z: 12 },
        { x: 0, y: 1.7, z: 12 },
        { x: 4, y: 1.7, z: 12 },
        { x: 8, y: 1.7, z: 12 }
      ],
      defenders: [
        { x: -8, y: 1.7, z: -23 },
        { x: -4, y: 1.7, z: -23 },
        { x: 0, y: 1.7, z: -23 },
        { x: 4, y: 1.7, z: -23 },
        { x: 8, y: 1.7, z: -23 }
      ]
    },
    tdmSpawns: [
      { x: -16, y: 1.7, z: 11 },
      { x: 16, y: 1.7, z: 11 },
      { x: -16, y: 1.7, z: -20 },
      { x: 16, y: 1.7, z: -20 },
      { x: -3, y: 1.7, z: 6 },
      { x: 3, y: 1.7, z: -17 }
    ],
    bombSites: [
      { id: 'A', position: { x: -13, y: 1.7, z: -13 }, radius: 5 },
      { id: 'B', position: { x: 13, y: 1.7, z: -13 }, radius: 5 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -13, y: 1.7, z: -13 }, radius: 7 },
      { name: 'B Site', position: { x: 13, y: 1.7, z: -13 }, radius: 7 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -6 }, radius: 8 },
      { name: 'T Spawn', position: { x: 0, y: 1.7, z: 12 }, radius: 7 },
      { name: 'CT Spawn', position: { x: 0, y: 1.7, z: -23 }, radius: 7 }
    ]
  }
};
