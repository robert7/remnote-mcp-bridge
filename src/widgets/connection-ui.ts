import type { BridgeRuntimeSnapshot } from '../bridge/runtime';

export interface ConnectionUiState {
  badge: {
    color: string;
    bg: string;
    icon: string;
    text: string;
  };
  summary: string;
  directionLabel: string;
  phaseLabel?: string;
  nextRetryLabel?: string;
  hint?: string;
  lastConnectedLabel?: string;
  lastDisconnectLabel?: string;
}

export function formatRelativeDuration(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.ceil(safeMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return `${totalMinutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function buildConnectionUiState(
  snapshot: BridgeRuntimeSnapshot,
  now = Date.now()
): ConnectionUiState {
  const nextRetryLabel =
    snapshot.nextRetryAt && snapshot.nextRetryAt > now
      ? `${
          snapshot.retryPhase === 'standby' ? 'Next background retry' : 'Next retry'
        } in ${formatRelativeDuration(snapshot.nextRetryAt - now)}`
      : undefined;

  const lastConnectedLabel = snapshot.lastConnectedAt
    ? `Last connected ${formatRelativeDuration(now - snapshot.lastConnectedAt)} ago`
    : undefined;

  const lastDisconnectLabel = snapshot.lastDisconnectReason
    ? `Last disconnect: ${snapshot.lastDisconnectReason}`
    : undefined;

  if (snapshot.status === 'connected') {
    return {
      badge: {
        color: '#166534',
        bg: '#dcfce7',
        icon: '●',
        text: 'Connected',
      },
      summary: 'Bridge is ready for MCP or CLI requests.',
      directionLabel: 'Bridge -> Companion app',
      phaseLabel: 'Live connection',
      lastConnectedLabel,
    };
  }

  if (snapshot.status === 'connecting') {
    return {
      badge: {
        color: '#92400e',
        bg: '#fef3c7',
        icon: '◐',
        text: 'Connecting',
      },
      summary: 'Trying to reach the companion process now.',
      directionLabel: 'Bridge -> Companion app',
      phaseLabel:
        snapshot.retryPhase === 'standby'
          ? 'Wake-up reconnect'
          : snapshot.retryPhase === 'burst'
            ? `Burst retry ${Math.min(snapshot.reconnectAttempts, snapshot.maxReconnectAttempts)}/${snapshot.maxReconnectAttempts}`
            : 'Connection attempt',
      hint:
        snapshot.retryPhase === 'standby'
          ? 'This was likely triggered by focus, visibility regain, browser online, or Reconnect Now.'
          : undefined,
      lastDisconnectLabel,
    };
  }

  if (snapshot.retryPhase === 'burst') {
    return {
      badge: {
        color: '#9a3412',
        bg: '#ffedd5',
        icon: '◌',
        text: 'Retrying',
      },
      summary: 'Quick reconnect window is active.',
      directionLabel: 'Bridge -> Companion app',
      phaseLabel: `Burst retry ${Math.min(snapshot.reconnectAttempts, snapshot.maxReconnectAttempts)}/${snapshot.maxReconnectAttempts}`,
      nextRetryLabel,
      hint: 'Reconnect Now skips the wait and tries immediately.',
      lastDisconnectLabel,
    };
  }

  if (snapshot.retryPhase === 'standby') {
    return {
      badge: {
        color: '#1d4ed8',
        bg: '#dbeafe',
        icon: '◌',
        text: 'Waiting for server',
      },
      summary: 'The companion process is not available right now.',
      directionLabel: 'Bridge -> Companion app',
      phaseLabel: 'Standby reconnect',
      nextRetryLabel,
      hint: 'It will also retry sooner if RemNote regains focus, becomes visible, or comes back online.',
      lastDisconnectLabel,
      lastConnectedLabel,
    };
  }

  return {
    badge: {
      color: '#b91c1c',
      bg: '#fee2e2',
      icon: '○',
      text: 'Disconnected',
    },
    summary: 'Bridge is not currently connected.',
    directionLabel: 'Bridge -> Companion app',
    hint: 'Use Reconnect Now after confirming the companion process is already listening.',
    lastDisconnectLabel,
    lastConnectedLabel,
  };
}
