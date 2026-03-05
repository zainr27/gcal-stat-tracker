import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google";
import { extractEntities, EventInput } from "@/lib/openai";
import { aggregateResults, AnalysisResult } from "@/lib/analyze";

const VALID_MONTHS = [6, 12] as const;
type RangeMonths = (typeof VALID_MONTHS)[number];

const cache = new Map<string, AnalysisResult>();

function cacheKey(email: string, months: number): string {
  return `${email}:${months}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = (session.user?.email as string) || "anonymous";
  const searchParams = request.nextUrl.searchParams;
  const monthsParam = searchParams.get("months");
  const rangeMonths: RangeMonths =
    monthsParam && VALID_MONTHS.includes(Number(monthsParam) as RangeMonths)
      ? (Number(monthsParam) as RangeMonths)
      : 12;

  const key = cacheKey(email, rangeMonths);
  const cached = cache.get(key);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const events = await getCalendarEvents(session.accessToken, rangeMonths);

    const eventInputs: EventInput[] = events.map((e) => ({
      summary: e.summary,
      location: e.location,
      date: e.start,
    }));

    const locationFieldEvents = new Set(
      events.filter((e) => e.location).map((e) => e.summary)
    );

    const parsed = await extractEntities(eventInputs);
    const analysis = aggregateResults(
      parsed,
      events.length,
      locationFieldEvents
    );

    cache.set(key, analysis);
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Analysis failed:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
