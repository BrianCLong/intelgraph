export interface PresenceRecord {
  userId: string;
  tenantId: string;
}

export type PresenceState = Record<string, PresenceRecord>;

export function presenceReducer(
  state: PresenceState = {},
  action: { type: string; sessionId?: string; userId?: string; tenantId?: string },
): PresenceState {
  switch (action.type) {
    case 'presence.join':
      return {
        ...state,
        [action.sessionId]: { userId: action.userId, tenantId: action.tenantId },
      };
    case 'presence.leave': {
      const next = { ...state };
      delete next[action.sessionId];
      return next;
    }
    default:
      return state;
  }
}
