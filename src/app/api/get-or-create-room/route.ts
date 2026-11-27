import { NextResponse } from "next/server";
import { getManagementToken } from '@/lib/hms'
import { requireStaff } from '@/lib/admin'

export async function POST() {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate environment variables
    if (!process.env.APP_ACCESS_KEY && !process.env.MANAGEMENT_TOKEN) {
      return NextResponse.json(
        { error: "100ms is not configured: set APP_ACCESS_KEY and APP_SECRET_KEY" },
        { status: 500 }
      );
    }

    if (!process.env.TEMPLATE_ID) {
      return NextResponse.json(
        { error: "TEMPLATE_ID is not configured" },
        { status: 500 }
      );
    }

    const requestBody = {
      name: `demo-room-${Date.now()}`, // Unique room name
      template_id: process.env.TEMPLATE_ID,
    };

    const res = await fetch("https://api.100ms.live/v2/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getManagementToken()}`,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await res.text();

    if (!res.ok) {
      let errorData = text;
      try {
        errorData = JSON.parse(text);
      } catch {
        // Keep as text if not JSON
      }
      
      console.error("100ms API error:", res.status, errorData);
      return NextResponse.json(
        {
          error: "Failed to create room",
          status: res.status,
          details: errorData,
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
    console.error("Create room error:", err);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

