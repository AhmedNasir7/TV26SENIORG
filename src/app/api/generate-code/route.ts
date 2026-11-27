import { NextResponse } from "next/server";
import { getManagementToken } from '@/lib/hms'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    if (!(await getCurrentUser())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate environment variable
    if (!process.env.APP_ACCESS_KEY && !process.env.MANAGEMENT_TOKEN) {
      return NextResponse.json(
        { error: "100ms is not configured: set APP_ACCESS_KEY and APP_SECRET_KEY" },
        { status: 500 }
      );
    }

    const { room_id } = await req.json();

    // Validate request body
    if (!room_id) {
      return NextResponse.json(
        { error: "room_id is required" },
        { status: 400 }
      );
    }

    // Always use "host" role - ensure everyone joins as host
    const hostRole = "host";

    // Correct 100ms API endpoint for generating room codes
    const apiUrl = `https://api.100ms.live/v2/room-codes/room/${room_id}`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getManagementToken()}`,
      },
      body: JSON.stringify({ role: hostRole }), // Always use "host" role
    });

    const text = await res.text();

    if (!res.ok) {
      let errorDetails = text;
      try {
        const errorJson = JSON.parse(text);
        errorDetails = errorJson;
      } catch {
        // Keep as text if not JSON
      }

      return NextResponse.json(
        {
          error: "Failed to generate room code",
          status: res.status,
          details: errorDetails,
        },
        { status: res.status }
      );
    }

    // Parse successful response
    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "Empty response from 100ms API" },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Generate code error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

