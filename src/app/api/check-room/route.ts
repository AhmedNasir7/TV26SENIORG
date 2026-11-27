import { NextResponse } from "next/server";
import { getManagementToken } from '@/lib/hms'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    if (!(await getCurrentUser())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.APP_ACCESS_KEY && !process.env.MANAGEMENT_TOKEN) {
      return NextResponse.json(
        { error: "100ms is not configured: set APP_ACCESS_KEY and APP_SECRET_KEY" },
        { status: 500 }
      );
    }

    const { room_id } = await req.json();

    if (!room_id) {
      return NextResponse.json(
        { error: "room_id is required" },
        { status: 400 }
      );
    }

    // Check if room exists
    const res = await fetch(`https://api.100ms.live/v2/rooms/${room_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getManagementToken()}`,
      },
    });

    if (res.status === 404) {
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      );
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error("100ms API error:", res.status, errorText);
      return NextResponse.json(
        { error: "Failed to check room", status: res.status },
        { status: res.status }
      );
    }

    const roomData = await res.json();
    return NextResponse.json(
      { exists: true, room: roomData },
      { status: 200 }
    );
  } catch (err) {
    console.error("Check room error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

