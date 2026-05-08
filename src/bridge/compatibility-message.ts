export const OFFICIAL_BRIDGE_PLUGIN_NAME = 'MCP/OpenClaw Automation Bridge';

const COMPATIBILITY_CLOSE_MARKERS = [
  'Bridge hello timeout',
  'Incompatible bridge version',
  'Wrong/incompatible RemNote plugin',
];

export function getExpectedBridgeVersionLine(version: string | undefined): string {
  if (!version) {
    return 'matching version';
  }

  const match = version.match(/^(\d+)\.(\d+)\./);
  if (!match) {
    return 'matching version';
  }

  return `${match[1]}.${match[2]}.x`;
}

export function isBridgeCompatibilityDisconnect(reason: string | undefined): boolean {
  if (!reason) {
    return false;
  }

  return COMPATIBILITY_CLOSE_MARKERS.some((marker) => reason.includes(marker));
}

export function formatBridgeCompatibilityDisconnect(version: string | undefined): string {
  return `Wrong/incompatible RemNote plugin installed. Install ${OFFICIAL_BRIDGE_PLUGIN_NAME} ${getExpectedBridgeVersionLine(version)}.`;
}
