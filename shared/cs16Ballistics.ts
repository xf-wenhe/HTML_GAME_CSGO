export interface Cs16FireState {
  grounded: boolean;
  crouched: boolean;
  horizontalSpeed: number;
  aiming: boolean;
  silenced?: boolean;
  burstMode?: boolean;
}

interface Cs16AccuracyProfile {
  base: number;
  divisor: number;
  shotBase: number;
  maximum: number;
  power?: number;
}

export interface Cs16KickDegrees {
  pitch: number;
  yawMagnitude: number;
  directionChangeChance: number;
}

const ACCURACY_PROFILES: Record<string, Cs16AccuracyProfile> = {
  ak47: { base: 0.2, divisor: 200, shotBase: 0.35, maximum: 1.25 },
  m4a1: { base: 0.2, divisor: 220, shotBase: 0.3, maximum: 1 },
  famas: { base: 0.2, divisor: 215, shotBase: 0.3, maximum: 1 },
  galil: { base: 0.2, divisor: 200, shotBase: 0.35, maximum: 1.25 },
  sg552: { base: 0.2, divisor: 220, shotBase: 0.3, maximum: 1 },
  aug: { base: 0.2, divisor: 215, shotBase: 0.3, maximum: 1 },
  mp5: { base: 0, divisor: 220.1, shotBase: 0.45, maximum: 0.75, power: 2 },
  p90: { base: 0.2, divisor: 175, shotBase: 0.45, maximum: 1, power: 2 },
  ump45: { base: 0, divisor: 210, shotBase: 0.5, maximum: 1, power: 2 },
  mac10: { base: 0.15, divisor: 200, shotBase: 0.6, maximum: 1.65 },
  tmp: { base: 0.2, divisor: 200, shotBase: 0.55, maximum: 1.4 },
  m249: { base: 0.2, divisor: 175, shotBase: 0.4, maximum: 0.9 },
  g3sg1: { base: 0.98, divisor: 100000, shotBase: 0.625, maximum: 0.98 },
  sg550: { base: 0.9, divisor: 100000, shotBase: 0.7375, maximum: 0.98 }
};

export function hasCs16AccuracyProfile(weaponId: string): boolean {
  return weaponId in ACCURACY_PROFILES;
}

export function getCs16BaseAccuracy(weaponId: string): number | undefined {
  return ACCURACY_PROFILES[weaponId]?.base;
}

export function getCs16AccuracyAfterShot(weaponId: string, shotsFired: number): number | undefined {
  const profile = ACCURACY_PROFILES[weaponId];
  if (!profile) return undefined;
  return Math.min((shotsFired ** (profile.power ?? 3)) / profile.divisor + profile.shotBase, profile.maximum);
}

export function getCs16Spread(weaponId: string, accuracy: number, state: Cs16FireState): number | undefined {
  if (weaponId === 'glock') {
    const baseAccuracy = 0.9;
    if (state.burstMode) {
      if (!state.grounded) return 1.2 * (1 - baseAccuracy);
      if (state.horizontalSpeed > 0) return 0.185 * (1 - baseAccuracy);
      if (state.crouched) return 0.095 * (1 - baseAccuracy);
      return 0.3 * (1 - baseAccuracy);
    }
    if (!state.grounded) return 1 * (1 - baseAccuracy);
    if (state.horizontalSpeed > 0) return 0.165 * (1 - baseAccuracy);
    if (state.crouched) return 0.075 * (1 - baseAccuracy);
    return 0.1 * (1 - baseAccuracy);
  }
  if (weaponId === 'usp') {
    const baseAccuracy = 0.92;
    if (state.silenced) {
      if (!state.grounded) return 1.3 * (1 - baseAccuracy);
      if (state.horizontalSpeed > 0) return 0.25 * (1 - baseAccuracy);
      if (state.crouched) return 0.125 * (1 - baseAccuracy);
      return 0.15 * (1 - baseAccuracy);
    }
    if (!state.grounded) return 1.2 * (1 - baseAccuracy);
    if (state.horizontalSpeed > 0) return 0.225 * (1 - baseAccuracy);
    if (state.crouched) return 0.08 * (1 - baseAccuracy);
    return 0.1 * (1 - baseAccuracy);
  }
  if (weaponId === 'p228') {
    const baseAccuracy = 0.9;
    if (!state.grounded) return 1.5 * (1 - baseAccuracy);
    if (state.horizontalSpeed > 0) return 0.255 * (1 - baseAccuracy);
    if (state.crouched) return 0.075 * (1 - baseAccuracy);
    return 0.15 * (1 - baseAccuracy);
  }
  if (weaponId === 'five_seven') {
    const baseAccuracy = 0.92;
    if (!state.grounded) return 1.5 * (1 - baseAccuracy);
    if (state.horizontalSpeed > 0) return 0.255 * (1 - baseAccuracy);
    if (state.crouched) return 0.075 * (1 - baseAccuracy);
    return 0.15 * (1 - baseAccuracy);
  }
  if (weaponId === 'dual_berettas') {
    const baseAccuracy = 0.88;
    if (!state.grounded) return 1.3 * (1 - baseAccuracy);
    if (state.horizontalSpeed > 0) return 0.175 * (1 - baseAccuracy);
    if (state.crouched) return 0.08 * (1 - baseAccuracy);
    return 0.1 * (1 - baseAccuracy);
  }
  if (weaponId === 'deagle') {
    const baseAccuracy = 0.9;
    if (!state.grounded) return 1.5 * (1 - baseAccuracy);
    if (state.horizontalSpeed > 0) return 0.25 * (1 - baseAccuracy);
    if (state.crouched) return 0.115 * (1 - baseAccuracy);
    return 0.13 * (1 - baseAccuracy);
  }
  if (weaponId === 'scout') {
    const unscopedPenalty = state.aiming ? 0 : 0.025;
    if (!state.grounded) return 0.2 + unscopedPenalty;
    if (state.horizontalSpeed > 170) return 0.075 + unscopedPenalty;
    if (state.crouched) return unscopedPenalty;
    return 0.007 + unscopedPenalty;
  }
  if (weaponId === 'awp') {
    const unscopedPenalty = state.aiming ? 0 : 0.08;
    if (!state.grounded) return 0.85 + unscopedPenalty;
    if (state.horizontalSpeed > 140) return 0.25 + unscopedPenalty;
    if (state.horizontalSpeed > 10) return 0.1 + unscopedPenalty;
    if (state.crouched) return unscopedPenalty;
    return 0.001 + unscopedPenalty;
  }
  if (weaponId === 'g3sg1') {
    const sniperAccuracy = Math.max(0, Math.min(0.98, accuracy));
    const unscopedPenalty = state.aiming ? 0 : 0.025;
    const baseSpread = !state.grounded
      ? 0.45
      : state.horizontalSpeed > 0
        ? 0.15
        : state.crouched
          ? 0.035
          : 0.055;
    return (1 - sniperAccuracy) * (baseSpread + unscopedPenalty);
  }
  if (weaponId === 'sg550') {
    const sniperAccuracy = Math.max(0, Math.min(0.98, accuracy));
    const unscopedPenalty = state.aiming ? 0 : 0.025;
    const baseSpread = !state.grounded
      ? 0.45 * (1 - sniperAccuracy)
      : state.horizontalSpeed > 0
        ? 0.15
        : state.crouched
          ? 0.04 * (1 - sniperAccuracy)
          : 0.05 * (1 - sniperAccuracy);
    return baseSpread + unscopedPenalty;
  }
  if (weaponId === 'ak47') {
    if (!state.grounded) return 0.04 + 0.4 * accuracy;
    if (state.horizontalSpeed > 1.4) return 0.04 + 0.07 * accuracy;
    return 0.0275 * accuracy;
  }
  if (weaponId === 'm4a1') {
    if (!state.grounded) return 0.035 + 0.4 * accuracy;
    if (state.horizontalSpeed > 1.4) return 0.035 + 0.07 * accuracy;
    return (state.silenced ? 0.025 : 0.02) * accuracy;
  }
  if (weaponId === 'famas') {
    const baseSpread = !state.grounded
      ? 0.03 + 0.3 * accuracy
      : state.horizontalSpeed > 0
        ? 0.03 + 0.07 * accuracy
        : 0.02 * accuracy;
    return state.burstMode ? baseSpread : baseSpread + 0.01;
  }
  if (weaponId === 'galil') {
    if (!state.grounded) return 0.04 + 0.3 * accuracy;
    if (state.horizontalSpeed > 1.4) return 0.04 + 0.07 * accuracy;
    return 0.0375 * accuracy;
  }
  if (weaponId === 'sg552') {
    if (!state.grounded) return 0.035 + 0.45 * accuracy;
    if (state.horizontalSpeed > 1.4) return 0.035 + 0.075 * accuracy;
    return 0.02 * accuracy;
  }
  if (weaponId === 'aug') {
    if (!state.grounded) return 0.035 + 0.4 * accuracy;
    if (state.horizontalSpeed > 1.4) return 0.035 + 0.07 * accuracy;
    return 0.02 * accuracy;
  }
  if (weaponId === 'mp5') {
    if (!state.grounded) return 0.2 * accuracy;
    return 0.04 * accuracy;
  }
  if (weaponId === 'p90') {
    if (!state.grounded) return 0.3 * accuracy;
    if (state.horizontalSpeed > 170) return 0.115 * accuracy;
    return 0.045 * accuracy;
  }
  if (weaponId === 'ump45') {
    if (!state.grounded) return 0.24 * accuracy;
    return 0.04 * accuracy;
  }
  if (weaponId === 'mac10') {
    if (!state.grounded) return 0.375 * accuracy;
    return 0.03 * accuracy;
  }
  if (weaponId === 'tmp') {
    if (!state.grounded) return 0.25 * accuracy;
    return 0.03 * accuracy;
  }
  if (weaponId === 'm249') {
    if (!state.grounded) return 0.045 + 0.5 * accuracy;
    if (state.horizontalSpeed > 140) return 0.045 + 0.095 * accuracy;
    return 0.03 * accuracy;
  }
  return undefined;
}

export function getCs16KickDegrees(
  weaponId: string,
  shotsFired: number,
  state: Cs16FireState
): Cs16KickDegrees | undefined {
  if (weaponId === 'deagle' || weaponId === 'p228' || weaponId === 'five_seven' || weaponId === 'dual_berettas' || weaponId === 'scout' || weaponId === 'awp') {
    return calculateKick(shotsFired, 2, 0, 0, 0, 2, 0, 0);
  }
  if (weaponId === 'm4a1') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 1, 0.45, 0.28, 0.045, 3.75, 3, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.2, 0.5, 0.23, 0.15, 5.5, 3.5, 6);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.6, 0.3, 0.2, 0.0125, 3.25, 2, 7);
    }
    return calculateKick(shotsFired, 0.65, 0.35, 0.25, 0.015, 3.5, 2.25, 7);
  }
  if (weaponId === 'famas') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 1, 0.45, 0.275, 0.05, 4, 2.5, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.25, 0.45, 0.22, 0.18, 5.5, 4, 5);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.575, 0.325, 0.2, 0.011, 3.25, 2, 8);
    }
    return calculateKick(shotsFired, 0.625, 0.375, 0.25, 0.0125, 3.5, 2.25, 8);
  }
  if (weaponId === 'galil') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 1, 0.45, 0.28, 0.045, 3.75, 3, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.2, 0.5, 0.23, 0.15, 5.5, 3.5, 6);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.6, 0.3, 0.2, 0.0125, 3.25, 2, 7);
    }
    return calculateKick(shotsFired, 0.65, 0.35, 0.25, 0.015, 3.5, 2.25, 7);
  }
  if (weaponId === 'sg552') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 1, 0.45, 0.28, 0.04, 4.25, 2.5, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.25, 0.45, 0.22, 0.18, 6, 4, 5);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.6, 0.35, 0.2, 0.0125, 3.7, 2, 10);
    }
    return calculateKick(shotsFired, 0.625, 0.375, 0.25, 0.0125, 4, 2.25, 9);
  }
  if (weaponId === 'aug') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 1, 0.45, 0.275, 0.05, 4, 2.5, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.25, 0.45, 0.22, 0.18, 5.5, 4, 5);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.575, 0.325, 0.2, 0.011, 3.25, 2, 8);
    }
    return calculateKick(shotsFired, 0.625, 0.375, 0.25, 0.0125, 3.5, 2.25, 8);
  }
  if (weaponId === 'mp5') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 0.5, 0.275, 0.2, 0.03, 3, 2, 10);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 0.9, 0.475, 0.35, 0.0425, 5, 3, 6);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.225, 0.15, 0.1, 0.015, 2, 1, 10);
    }
    return calculateKick(shotsFired, 0.25, 0.175, 0.125, 0.02, 2.25, 1.25, 10);
  }
  if (weaponId === 'p90') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 0.45, 0.3, 0.2, 0.0275, 4, 2.25, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 0.9, 0.45, 0.35, 0.04, 5.25, 3.5, 4);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.275, 0.2, 0.125, 0.02, 3, 1, 9);
    }
    return calculateKick(shotsFired, 0.3, 0.225, 0.125, 0.02, 3.25, 1.25, 8);
  }
  if (weaponId === 'ump45') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 0.55, 0.3, 0.225, 0.03, 3.5, 2.5, 10);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 0.125, 0.65, 0.55, 0.0475, 5.5, 4, 10);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.25, 0.175, 0.125, 0.02, 2.25, 1.25, 10);
    }
    return calculateKick(shotsFired, 0.275, 0.2, 0.15, 0.0225, 2.5, 1.5, 10);
  }
  if (weaponId === 'mac10') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 0.9, 0.45, 0.25, 0.035, 3.5, 2.75, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.3, 0.55, 0.4, 0.05, 4.75, 3.75, 5);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.75, 0.4, 0.175, 0.03, 2.75, 2.5, 10);
    }
    return calculateKick(shotsFired, 0.775, 0.425, 0.2, 0.03, 3, 2.75, 9);
  }
  if (weaponId === 'tmp') {
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 0.8, 0.4, 0.2, 0.03, 3, 2.5, 7);
    }
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.1, 0.5, 0.35, 0.045, 4.5, 3.5, 6);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.7, 0.35, 0.125, 0.025, 2.5, 2, 10);
    }
    return calculateKick(shotsFired, 0.725, 0.375, 0.15, 0.025, 2.75, 2.25, 9);
  }
  if (weaponId === 'm249') {
    if (!state.grounded) {
      return calculateKick(shotsFired, 1.8, 0.65, 0.45, 0.125, 5, 3.5, 8);
    }
    if (state.horizontalSpeed > 0) {
      return calculateKick(shotsFired, 1.1, 0.5, 0.3, 0.06, 4, 3, 8);
    }
    if (state.crouched) {
      return calculateKick(shotsFired, 0.75, 0.325, 0.25, 0.025, 3.5, 2.5, 9);
    }
    return calculateKick(shotsFired, 0.8, 0.35, 0.3, 0.03, 3.75, 3, 9);
  }
  if (weaponId !== 'ak47') return undefined;

  if (state.horizontalSpeed > 0) {
    return calculateKick(shotsFired, 1.5, 0.45, 0.225, 0.05, 6.5, 2.5, 7);
  }
  if (!state.grounded) {
    return calculateKick(shotsFired, 2, 1, 0.5, 0.35, 9, 6, 5);
  }
  if (state.crouched) {
    return calculateKick(shotsFired, 0.9, 0.35, 0.15, 0.025, 5.5, 1.5, 9);
  }
  return calculateKick(shotsFired, 1, 0.375, 0.175, 0.0375, 5.75, 1.75, 8);
}

function calculateKick(
  shotsFired: number,
  upBase: number,
  lateralBase: number,
  upModifier: number,
  lateralModifier: number,
  upMaximum: number,
  lateralMaximum: number,
  directionChangeChance: number
): Cs16KickDegrees {
  const pitch = shotsFired === 1 ? upBase : shotsFired * upModifier + upBase;
  const yaw = shotsFired === 1 ? lateralBase : shotsFired * lateralModifier + lateralBase;
  return {
    pitch: Math.min(pitch, upMaximum),
    yawMagnitude: Math.min(yaw, lateralMaximum),
    directionChangeChance
  };
}
