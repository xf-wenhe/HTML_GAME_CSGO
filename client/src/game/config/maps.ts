import { MapId, Team, Vector3 } from '../../../../shared/types.js';
import {
  DUST2_SPAWNS,
  DUST2_TDM_SPAWNS,
  DUST2_BOMB_SITES,
  DUST2_CALLOUTS
} from '../Dust2Layout.js';
import {
  MIRAGE_SPAWNS,
  MIRAGE_TDM_SPAWNS,
  MIRAGE_BOMB_SITES,
  MIRAGE_CALLOUTS
} from '../MirageLayout.js';
import {
  INFERNO_SPAWNS,
  INFERNO_TDM_SPAWNS,
  INFERNO_BOMB_SITES,
  INFERNO_CALLOUTS
} from '../InfernoLayout.js';
import {
  TRAIN_SPAWNS,
  TRAIN_TDM_SPAWNS,
  TRAIN_BOMB_SITES,
  TRAIN_CALLOUTS
} from '../TrainLayout.js';
import {
  OVERPASS_SPAWNS,
  OVERPASS_TDM_SPAWNS,
  OVERPASS_BOMB_SITES,
  OVERPASS_CALLOUTS
} from '../OverpassLayout.js';
import {
  NUKE_SPAWNS,
  NUKE_TDM_SPAWNS,
  NUKE_BOMB_SITES,
  NUKE_CALLOUTS
} from '../NukeLayout.js';
import {
  ITALY_SPAWNS,
  ITALY_TDM_SPAWNS,
  ITALY_BOMB_SITES,
  ITALY_CALLOUTS
} from '../ItalyLayout.js';
import {
  WAREHOUSE_SPAWNS,
  WAREHOUSE_TDM_SPAWNS,
  WAREHOUSE_BOMB_SITES,
  WAREHOUSE_CALLOUTS
} from '../WarehouseLayout.js';
import {
  BLOODSTRIKE_SPAWNS,
  BLOODSTRIKE_TDM_SPAWNS,
  BLOODSTRIKE_BOMB_SITES,
  BLOODSTRIKE_CALLOUTS
} from '../BloodStrikeLayout.js';


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
      attackers: DUST2_SPAWNS.attackers,
      defenders: DUST2_SPAWNS.defenders
    },
    tdmSpawns: DUST2_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: DUST2_BOMB_SITES.A.position, radius: DUST2_BOMB_SITES.A.radius },
      { id: 'B', position: DUST2_BOMB_SITES.B.position, radius: DUST2_BOMB_SITES.B.radius }
    ],
    callouts: DUST2_CALLOUTS
  },
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse',
    spawns: {
      attackers: WAREHOUSE_SPAWNS.attackers,
      defenders: WAREHOUSE_SPAWNS.defenders
    },
    tdmSpawns: WAREHOUSE_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: WAREHOUSE_BOMB_SITES.A.position, radius: WAREHOUSE_BOMB_SITES.A.radius },
      { id: 'B', position: WAREHOUSE_BOMB_SITES.B.position, radius: WAREHOUSE_BOMB_SITES.B.radius }
    ],
    callouts: WAREHOUSE_CALLOUTS
  },
  italy: {
    id: 'italy',
    name: 'Italy',
    spawns: {
      attackers: ITALY_SPAWNS.attackers,
      defenders: ITALY_SPAWNS.defenders
    },
    tdmSpawns: ITALY_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: ITALY_BOMB_SITES.A.position, radius: ITALY_BOMB_SITES.A.radius },
      { id: 'B', position: ITALY_BOMB_SITES.B.position, radius: ITALY_BOMB_SITES.B.radius }
    ],
    callouts: ITALY_CALLOUTS
  },
  mirage: {
    id: 'mirage',
    name: 'Mirage',
    spawns: {
      attackers: MIRAGE_SPAWNS.attackers,
      defenders: MIRAGE_SPAWNS.defenders
    },
    tdmSpawns: MIRAGE_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: MIRAGE_BOMB_SITES.A.position, radius: MIRAGE_BOMB_SITES.A.radius },
      { id: 'B', position: MIRAGE_BOMB_SITES.B.position, radius: MIRAGE_BOMB_SITES.B.radius }
    ],
    callouts: MIRAGE_CALLOUTS
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    spawns: {
      attackers: INFERNO_SPAWNS.attackers,
      defenders: INFERNO_SPAWNS.defenders
    },
    tdmSpawns: INFERNO_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: INFERNO_BOMB_SITES.A.position, radius: INFERNO_BOMB_SITES.A.radius },
      { id: 'B', position: INFERNO_BOMB_SITES.B.position, radius: INFERNO_BOMB_SITES.B.radius }
    ],
    callouts: INFERNO_CALLOUTS
  },
  nuke: {
    id: 'nuke',
    name: 'Nuke',
    spawns: {
      attackers: NUKE_SPAWNS.attackers,
      defenders: NUKE_SPAWNS.defenders
    },
    tdmSpawns: NUKE_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: NUKE_BOMB_SITES.A.position, radius: NUKE_BOMB_SITES.A.radius },
      { id: 'B', position: NUKE_BOMB_SITES.B.position, radius: NUKE_BOMB_SITES.B.radius }
    ],
    callouts: NUKE_CALLOUTS
  },
  train: {
    id: 'train',
    name: 'Train',
    spawns: {
      attackers: TRAIN_SPAWNS.attackers,
      defenders: TRAIN_SPAWNS.defenders
    },
    tdmSpawns: TRAIN_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: TRAIN_BOMB_SITES.A.position, radius: TRAIN_BOMB_SITES.A.radius },
      { id: 'B', position: TRAIN_BOMB_SITES.B.position, radius: TRAIN_BOMB_SITES.B.radius }
    ],
    callouts: TRAIN_CALLOUTS
  },
  overpass: {
    id: 'overpass',
    name: 'Overpass',
    spawns: {
      attackers: OVERPASS_SPAWNS.attackers,
      defenders: OVERPASS_SPAWNS.defenders
    },
    tdmSpawns: OVERPASS_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: OVERPASS_BOMB_SITES.A.position, radius: OVERPASS_BOMB_SITES.A.radius },
      { id: 'B', position: OVERPASS_BOMB_SITES.B.position, radius: OVERPASS_BOMB_SITES.B.radius }
    ],
    callouts: OVERPASS_CALLOUTS
  },
  bloodstrike: {
    id: 'bloodstrike',
    name: 'Blood Strike',
    spawns: {
      attackers: BLOODSTRIKE_SPAWNS.attackers,
      defenders: BLOODSTRIKE_SPAWNS.defenders
    },
    tdmSpawns: BLOODSTRIKE_TDM_SPAWNS,
    bombSites: [
      { id: 'A', position: BLOODSTRIKE_BOMB_SITES.A.position, radius: BLOODSTRIKE_BOMB_SITES.A.radius },
      { id: 'B', position: BLOODSTRIKE_BOMB_SITES.B.position, radius: BLOODSTRIKE_BOMB_SITES.B.radius }
    ],
    callouts: BLOODSTRIKE_CALLOUTS
  }
};
