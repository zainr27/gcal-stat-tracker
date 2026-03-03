import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google";
import { extractEntities, EventInput } from "@/lib/openai";
import { aggregateResults } from "@/lib/analyze";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const events = await getCalendarEvents(session.accessToken);

    const eventInputs: EventInput[] = events.map((e) => ({
      summary: e.summary,
      location: e.location,
      date: e.start,
    }));

    const locationFieldEvents = new Set(
      events.filter((e) => e.location).map((e) => e.summary)
    );

    const parsed = await extractEntities(eventInputs);
    const analysis = aggregateResults(parsed, events.length, locationFieldEvents);

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Analysis failed:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
