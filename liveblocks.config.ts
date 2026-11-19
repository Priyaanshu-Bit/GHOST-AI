// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
      isThinking?: boolean;
      editingNodeId: string | null;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Storage: {};

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar?: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent:
      | {
          type: "ai-status";
          text?: string;
          status?: "start" | "processing" | "complete" | "error";
          step?: string;
          timestamp?: number;
        }
      | {
          type: "ai-presence";
          cursor: { x: number; y: number } | null;
          thinking: boolean;
          isThinking?: boolean;
          timestamp?: number;
        };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: Record<string, unknown>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: Record<string, unknown>;

    // Custom group info set with resolveGroupsInfo, for useGroupInfo
    GroupInfo: Record<string, unknown>;

    // Custom activities data for custom notification kinds
    ActivitiesData: Record<string, unknown>;
  }
}

export {};
