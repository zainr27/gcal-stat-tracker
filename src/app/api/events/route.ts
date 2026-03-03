import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const events = await getCalendarEvents(session.accessToken);
    return NextResponse.json({ events, count: events.length });
  } catch (error: unknown) {
    console.error("Failed to fetch calendar events:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
