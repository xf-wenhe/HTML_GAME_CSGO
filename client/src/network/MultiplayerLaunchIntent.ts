export interface MultiplayerLaunchIntent {
  roomId: string | null;
  spectator: boolean;
}

export function captureMultiplayerLaunchIntent(
  mode: 'solo' | 'multiplayer',
  roomId: string | null,
  spectator: boolean
): MultiplayerLaunchIntent {
  if (mode !== 'multiplayer' || !roomId) {
    return { roomId: null, spectator: false };
  }
  return { roomId, spectator };
}
