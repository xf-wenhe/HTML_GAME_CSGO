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
}

export interface Cs16KickDegrees {
  pitch: number;
  yawMagnitude: number;
  directionChangeChance: number;
}

const ACCURACY_PROFILES: Record<string, Cs16AccuracyProfile> = {
  ak47: { base: 0.2, divisor: 200, shotBase: 0.35, maximum: 1.25 },
  m4a1: { base: 0.2, divisor: 220, shotBase: 0.3, maximum: 1 },
  famas: { base: 0.2, divisor: 215, shotBase: 0.3, maximum: 1 }
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
  return Math.min((shotsFired ** 3) / profile.divisor + profile.shotBase, profile.maximum);
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
  return undefined;
}

export function getCs16KickDegrees(
  weaponId: string,
  shotsFired: number,
  state: Cs16FireState
): Cs16KickDegrees | undefined {
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
