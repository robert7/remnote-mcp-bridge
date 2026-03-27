import type { BridgeRuntimeSnapshot } from '../bridge/runtime';

export interface ConnectionUiState {
  badge: {
    color: string;
    bg: string;
    icon: string;
    text: string;
  };
  summary: string;
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
      ? `${snapshot.retryPhase === 'standby' ? 'Retry' : 'Next retry'} in ${formatRelativeDuration(snapshot.nextRetryAt - now)}`
      : undefined;

  const lastConnectedLabel = snapshot.lastConnectedAt
    ? `Last seen ${formatRelativeDuration(now - snapshot.lastConnectedAt)} ago`
    : undefined;

  const lastDisconnectLabel = snapshot.lastDisconnectReason
    ? `Disconnect ${snapshot.lastDisconnectReason}`
    : undefined;

  if (snapshot.status === 'connected') {
    return {
      badge: {
        color: '#166534',
        bg: '#dcfce7',
        icon: '●',
        text: 'Connected',
      },
      summary: 'Ready',
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
      summary: 'Connecting to companion',
      phaseLabel:
        snapshot.retryPhase === 'standby'
          ? 'Wake-up reconnect'
          : snapshot.retryPhase === 'burst'
            ? `Burst retry ${Math.min(snapshot.reconnectAttempts, snapshot.maxReconnectAttempts)}/${snapshot.maxReconnectAttempts}`
            : 'Connection attempt',
      hint:
        snapshot.retryPhase === 'standby'
          ? 'This was likely triggered by opening the bridge panel, moving focus inside RemNote, browser visibility regain, browser online, or Reconnect Now.'
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
      summary: 'Retrying connection',
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
      summary: 'Companion unavailable',
      phaseLabel: 'Standby reconnect',
      nextRetryLabel,
      hint: 'Opening this panel or moving focus inside RemNote restarts faster retries. Browser visibility and online events can also wake it sooner.',
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
    summary: 'Companion disconnected',
    hint: 'Use Reconnect Now after confirming the companion process is already listening.',
    lastDisconnectLabel,
    lastConnectedLabel,
  };
}
