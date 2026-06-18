export type Cs16SliceWeaponId = 'usp' | 'ak47';

export interface WeaponPose {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface ViewmodelPresentation extends WeaponPose {
  muzzle: [number, number, number];
  eject: [number, number, number];
  sway: {
    idle: [number, number];
    move: [number, number];
    speedIdle: number;
    speedMove: number;
  };
  recoil: {
    kick: number;
    lift: number;
    yaw: number;
    roll: number;
    recover: number;
  };
  draw: {
    duration: number;
    dip: number;
    slide: number;
  };
}

export interface WeaponPresentation {
  id: Cs16SliceWeaponId;
  buy: {
    icon: string;
    aspect: 'pistol' | 'rifle';
  };
  viewmodel: ViewmodelPresentation;
  thirdPerson: WeaponPose;
  dropped: WeaponPose & {
    groundOffset: number;
    markerOpacity: number;
  };
}

export const CS16_SLICE_WEAPON_IDS = ['usp', 'ak47'] as const;

const WEAPON_ID_ALIASES: Record<string, Cs16SliceWeaponId> = {
  usp: 'usp',
  usp_s: 'usp',
  ak47: 'ak47',
  vandal: 'ak47',
  rifle: 'ak47',
};

export const WEAPON_PRESENTATIONS: Record<Cs16SliceWeaponId, WeaponPresentation> = {
  usp: {
    id: 'usp',
    buy: {
      icon: 'usp',
      aspect: 'pistol',
    },
    viewmodel: {
      position: [0.34, -0.36, -0.72],
      rotation: [-0.10, -0.08, 0.015],
      scale: 1,
      muzzle: [0, 0.055, -0.66],
      eject: [0.11, -0.015, -0.24],
      sway: {
        idle: [0.004, 0.003],
        move: [0.012, 0.010],
        speedIdle: 3.0,
        speedMove: 7.4,
      },
      recoil: {
        kick: 0.42,
        lift: 0.12,
        yaw: 0.08,
        roll: 0.05,
        recover: 1.35,
      },
      draw: {
        duration: 0.25,
        dip: 0.22,
        slide: 0.12,
      },
    },
    thirdPerson: {
      position: [0.12, 0.43, -0.17],
      rotation: [0.06, -0.30, -0.10],
      scale: 0.25,
    },
    dropped: {
      position: [0, 0.025, 0],
      rotation: [Math.PI / 2, 0.35, 0.04],
      scale: 0.58,
      groundOffset: 0.045,
      markerOpacity: 0.10,
    },
  },
  ak47: {
    id: 'ak47',
    buy: {
      icon: 'ak47',
      aspect: 'rifle',
    },
    viewmodel: {
      position: [0.46, -0.43, -0.86],
      rotation: [-0.075, -0.165, 0.025],
      scale: 1,
      muzzle: [0, 0.04, -1.12],
      eject: [0.17, -0.005, -0.42],
      sway: {
        idle: [0.006, 0.004],
        move: [0.018, 0.014],
        speedIdle: 3.4,
        speedMove: 8.5,
      },
      recoil: {
        kick: 0.86,
        lift: 0.28,
        yaw: 0.16,
        roll: 0.09,
        recover: 0.90,
      },
      draw: {
        duration: 0.42,
        dip: 0.34,
        slide: 0.18,
      },
    },
    thirdPerson: {
      position: [0.13, 0.42, -0.21],
      rotation: [0.16, -0.24, -0.08],
      scale: 0.14,
    },
    dropped: {
      position: [0, 0.04, 0],
      rotation: [Math.PI / 2, 0.18, -0.08],
      scale: 0.34,
      groundOffset: 0.055,
      markerOpacity: 0.08,
    },
  },
};

export function resolveWeaponPresentationId(weaponId: string): Cs16SliceWeaponId | null {
  return WEAPON_ID_ALIASES[weaponId] ?? null;
}

export function getWeaponPresentation(weaponId: string): WeaponPresentation | null {
  const id = resolveWeaponPresentationId(weaponId);
  return id ? WEAPON_PRESENTATIONS[id] : null;
}

