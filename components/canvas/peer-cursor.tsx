"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useOther } from "@liveblocks/react";

export interface PeerCursorProps {
  userId?: string;
  connectionId?: number;
}

/**
 * Custom peer cursor rendered by @liveblocks/react-flow's Cursors component.
 * Features:
 * - Crisp, fixed 16px x 16px SVG pointer arrow with drop shadow.
 * - Colored with the user's assigned unique palette color.
 * - Pill badge showing user's name, active editing state, and thinking spinner when thinking: true.
 */
export function PeerCursor({ connectionId }: PeerCursorProps) {
  const other = useOther(
    connectionId as number,
    (user) => ({
      name: user.info?.name || "Collaborator",
      color: user.info?.color || "#00c8d4",
      isEditing: Boolean(user.presence?.editingNodeId),
      thinking: Boolean(user.presence?.thinking || user.presence?.isThinking),
    })
  );

  if (!other) return null;

  const { name, color, isEditing, thinking } = other;

  return (
    <div className="relative pointer-events-none select-none z-50">
      {/* 16px x 16px SVG cursor pointer */}
      <svg
        className="w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transform -translate-x-[1px] -translate-y-[1px]"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0.5 0.5L6.5 15.5L9.5 9.5L15.5 6.5L0.5 0.5Z"
          fill={color}
          stroke="#080809"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {/* User label pill badge */}
      <div
        className="absolute left-3 top-3 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-xl flex items-center gap-1.5 transition-all"
        style={{
          backgroundColor: color,
        }}
      >
        {thinking ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin text-white shrink-0" />
        ) : isEditing ? (
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        ) : null}
        <span>
          {name}
          {thinking ? " (thinking)" : isEditing ? " (editing)" : ""}
        </span>
      </div>
    </div>
  );
}
