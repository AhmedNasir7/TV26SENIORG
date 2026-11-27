"use client";

import { useState } from "react";

interface RoomLandingProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export default function RoomLanding({ onCreateRoom, onJoinRoom }: RoomLandingProps) {
  const [roomId, setRoomId] = useState("");

  return (
    <div className="page-shell flex h-screen items-center justify-center">
      <div className="surface-card w-full max-w-md p-8">
        <div className="flex justify-center">
          <p className="eyebrow">Video meeting</p>
        </div>
        <h1 className="font-display mt-2 text-center text-2xl font-semibold text-[color:var(--foreground)]">
          Start or join a room
        </h1>

        <div className="mt-6 space-y-4">
          <button onClick={onCreateRoom} className="btn-primary w-full px-6 py-3 text-sm">
            Create new room
          </button>

          <div className="divider" />

          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID"
            className="input-clean w-full px-4 py-3 text-sm"
          />

          <button
            onClick={() => {
              if (roomId.trim()) {
                onJoinRoom(roomId.trim());
              }
            }}
            disabled={!roomId.trim()}
            className="btn-secondary w-full px-6 py-3 text-sm disabled:opacity-50"
          >
            Join room
          </button>
        </div>
      </div>
    </div>
  );
}
