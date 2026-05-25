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
  dust2: {
    id: 'dust2',
    name: 'Dust2',
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
  },
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse',
    spawns: {
      attackers: [
        { x: -30, y: 1.7, z: 28 },
        { x: -25, y: 1.7, z: 28 },
        { x: -20, y: 1.7, z: 28 },
        { x: -15, y: 1.7, z: 28 },
        { x: -10, y: 1.7, z: 28 }
      ],
      defenders: [
        { x: 30, y: 1.7, z: -46 },
        { x: 25, y: 1.7, z: -46 },
        { x: 20, y: 1.7, z: -46 },
        { x: 15, y: 1.7, z: -46 },
        { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 28 },
      { x: -25, y: 1.7, z: 28 },
      { x: 30, y: 1.7, z: -46 },
      { x: 25, y: 1.7, z: -46 },
      { x: -28, y: 1.7, z: -8 },
      { x: 28, y: 1.7, z: -8 },
      { x: -8, y: 1.7, z: 8 },
      { x: 8, y: 1.7, z: -22 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'B Site', position: { x: 24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -8 }, radius: 11 },
      { name: 'Warehouse Spawn', position: { x: -20, y: 1.7, z: 28 }, radius: 9 },
      { name: 'Loading Dock', position: { x: 20, y: 1.7, z: -46 }, radius: 9 }
    ]
  },
  italy: {
    id: 'italy',
    name: 'Italy',
    spawns: {
      attackers: [
        { x: 0, y: 1.7, z: 32 },
        { x: -5, y: 1.7, z: 32 },
        { x: 5, y: 1.7, z: 32 },
        { x: -10, y: 1.7, z: 32 },
        { x: 10, y: 1.7, z: 32 }
      ],
      defenders: [
        { x: 0, y: 1.7, z: -48 },
        { x: -5, y: 1.7, z: -48 },
        { x: 5, y: 1.7, z: -48 },
        { x: -10, y: 1.7, z: -48 },
        { x: 10, y: 1.7, z: -48 }
      ]
    },
    tdmSpawns: [
      { x: 0, y: 1.7, z: 32 },
      { x: -5, y: 1.7, z: 32 },
      { x: 0, y: 1.7, z: -48 },
      { x: 5, y: 1.7, z: -48 },
      { x: -24, y: 1.7, z: -8 },
      { x: 24, y: 1.7, z: -8 },
      { x: -8, y: 1.7, z: 8 },
      { x: 8, y: 1.7, z: -22 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'B Site', position: { x: 24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -8 }, radius: 11 },
      { name: 'Market', position: { x: 0, y: 1.7, z: 32 }, radius: 9 },
      { name: 'Courtyard', position: { x: 0, y: 1.7, z: -48 }, radius: 9 }
    ]
  },
  mirage: {
    id: 'mirage',
    name: 'Mirage',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 32 }, { x: -5, y: 1.7, z: 32 },
        { x: 0, y: 1.7, z: 32 }, { x: 5, y: 1.7, z: 32 }, { x: 10, y: 1.7, z: 32 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 },
        { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 26 }, { x: 30, y: 1.7, z: 26 },
      { x: -30, y: 1.7, z: -40 }, { x: 30, y: 1.7, z: -40 },
      { x: -14, y: 3.1, z: -2 }, { x: 14, y: 3.1, z: -2 },
      { x: -8, y: 1.7, z: 8 }, { x: 8, y: 1.7, z: -20 }
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
      { name: 'A Ramp', position: { x: -24, y: 1.7, z: 5 }, radius: 8 },
      { name: 'B Apartments', position: { x: 24, y: 1.7, z: 5 }, radius: 8 }
    ]
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 28 }, { x: -5, y: 1.7, z: 28 },
        { x: 0, y: 1.7, z: 28 }, { x: 5, y: 1.7, z: 28 }, { x: 10, y: 1.7, z: 28 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 },
        { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -10, y: 1.7, z: 28 }, { x: -5, y: 1.7, z: 28 },
      { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 },
      { x: -28, y: 1.7, z: 2 }, { x: -14, y: 3.1, z: -8 },
      { x: 16, y: 1.7, z: -6 }, { x: 0, y: 1.7, z: -22 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'B Site', position: { x: 24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -6 }, radius: 10 },
      { name: 'Banana', position: { x: -28, y: 1.7, z: 2 }, radius: 10 },
      { name: 'Apartments', position: { x: -14, y: 1.7, z: -8 }, radius: 9 },
      { name: 'T Spawn', position: { x: -2, y: 1.7, z: 28 }, radius: 9 },
      { name: 'CT Spawn', position: { x: 0, y: 1.7, z: -46 }, radius: 9 }
    ]
  },
  nuke: {
    id: 'nuke',
    name: 'Nuke',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 29 }, { x: -5, y: 1.7, z: 29 },
        { x: 0, y: 1.7, z: 29 }, { x: 5, y: 1.7, z: 29 }, { x: 10, y: 1.7, z: 29 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 },
        { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 25 }, { x: 30, y: 1.7, z: 25 },
      { x: 0, y: 6.7, z: -4 }, { x: -12, y: 1.7, z: -8 },
      { x: -30, y: 1.7, z: -40 }, { x: 30, y: 1.7, z: -40 },
      { x: 0, y: 1.7, z: -20 }, { x: 0, y: 1.7, z: 8 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'B Site', position: { x: 24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -8 }, radius: 11 },
      { name: 'Upper', position: { x: 0, y: 6.7, z: -4 }, radius: 10 },
      { name: 'Outside', position: { x: 0, y: 1.7, z: 16 }, radius: 10 },
      { name: 'T Spawn', position: { x: 0, y: 1.7, z: 30 }, radius: 9 },
      { name: 'CT Spawn', position: { x: 0, y: 1.7, z: -46 }, radius: 9 }
    ]
  },
  train: {
    id: 'train',
    name: 'Train',
    spawns: {
      attackers: [
        { x: 10, y: 1.7, z: 30 }, { x: 5, y: 1.7, z: 30 },
        { x: 0, y: 1.7, z: 30 }, { x: 15, y: 1.7, z: 30 }, { x: 20, y: 1.7, z: 30 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 },
        { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: 10, y: 1.7, z: 28 }, { x: -10, y: 1.7, z: -44 },
      { x: -16, y: 3.3, z: -8 }, { x: 16, y: 3.3, z: -8 },
      { x: -28, y: 1.7, z: -22 }, { x: 28, y: 1.7, z: -22 },
      { x: 0, y: 1.7, z: -20 }, { x: 0, y: 1.7, z: 8 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'B Site', position: { x: 24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -8 }, radius: 11 },
      { name: 'Upper Train', position: { x: 0, y: 3.3, z: -8 }, radius: 12 },
      { name: 'T Spawn', position: { x: 10, y: 1.7, z: 30 }, radius: 9 },
      { name: 'CT Spawn', position: { x: 0, y: 1.7, z: -46 }, radius: 9 },
      { name: 'Ladder Room', position: { x: -20, y: 1.7, z: 5 }, radius: 8 }
    ]
  },
  overpass: {
    id: 'overpass',
    name: 'Overpass',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 31 }, { x: -5, y: 1.7, z: 31 },
        { x: 0, y: 1.7, z: 31 }, { x: 5, y: 1.7, z: 31 }, { x: 10, y: 1.7, z: 31 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 },
        { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -5, y: 1.7, z: 28 }, { x: 5, y: 1.7, z: 28 },
      { x: -30, y: 1.7, z: -40 }, { x: 30, y: 1.7, z: -40 },
      { x: 0, y: 3.85, z: 10 }, { x: -8, y: 1.7, z: -4 },
      { x: 0, y: 1.7, z: -20 }, { x: 0, y: 1.7, z: 14 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ],
    callouts: [
      { name: 'A Site', position: { x: -24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'B Site', position: { x: 24, y: 1.7, z: -27 }, radius: 9 },
      { name: 'Mid', position: { x: 0, y: 1.7, z: -6 }, radius: 10 },
      { name: 'Bridge', position: { x: 0, y: 3.85, z: 10 }, radius: 10 },
      { name: 'Tunnel', position: { x: 0, y: 1.7, z: -8 }, radius: 9 },
      { name: 'T Spawn', position: { x: 0, y: 1.7, z: 30 }, radius: 9 },
      { name: 'CT Spawn', position: { x: 0, y: 1.7, z: -46 }, radius: 9 }
    ]
  }
};
