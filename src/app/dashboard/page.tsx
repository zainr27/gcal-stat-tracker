"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import StatsTable from "@/components/StatsTable";

const TIME_RANGES = {
  SIX_MONTHS: { label: "6 months", months: 6 },
  TWELVE_MONTHS: { label: "12 months", months: 12 },
} as const;

type RangeKey = keyof typeof TIME_RANGES;

interface PersonItem {
  name: string;
  count: number;
  lastSeen: string;
  events: string[];
}

interface PlaceItem {
  name: string;
  count: number;
  lastSeen: string;
  source: "location_field" | "title_parsed" | "mixed";
  events: string[];
}

interface AnalysisResult {
  people: PersonItem[];
  places: PlaceItem[];
  totalEvents: number;
  eventsWithPeople: number;
  eventsWithPlaces: number;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; message: string }
  | { status: "done"; data: AnalysisResult }
  | { status: "error"; message: string };

const CACHE_TTL = 30 * 60 * 1000;

function saveCache(months: number, data: AnalysisResult): void {
  try {
    sessionStorage.setItem(
      `gcal_${months}`,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

function loadCache(months: number): AnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(`gcal_${months}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(`gcal_${months}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function fetchAnalysis(months: number): Promise<AnalysisResult> {
  const res = await fetch(`/api/analyze?months=${months}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Analysis failed");
  }
  return res.json();
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [selectedRange, setSelectedRange] = useState<RangeKey>("SIX_MONTHS");
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const runAnalysis = useCallback(async (months: number) => {
    const cached = loadCache(months);
    if (cached) {
      setAnalysis({ status: "done", data: cached });
      return;
    }

    setAnalysis({
      status: "loading",
      message: "Fetching your calendar events...",
    });

    try {
      const data = await fetchAnalysis(months);
      saveCache(months, data);
      setAnalysis({ status: "done", data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setAnalysis({ status: "error", message });
    }
  }, []);

  // Background pre-fetch: after 6-month results are live, silently fetch 12 months
  useEffect(() => {
    if (analysis.status === "done" && !prefetchedRef.current) {
      prefetchedRef.current = true;
      if (!loadCache(12)) {
        fetchAnalysis(12)
          .then((data) => saveCache(12, data))
          .catch(() => {});
      }
    }
  }, [analysis.status]);

  const handleRangeChange = useCallback(
    (key: RangeKey) => {
      setSelectedRange(key);
      runAnalysis(TIME_RANGES[key].months);
    },
    [runAnalysis]
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">GCAL Stats</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              {session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {analysis.status === "idle" && (
          <div className="text-center py-20 space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">
                Ready to analyze
              </h2>
              <p className="text-zinc-400 text-lg max-w-md mx-auto">
                We'll scan your calendar and find out who you hang out with
                most.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <RangeToggle
                selectedRange={selectedRange}
                onChange={(key) => setSelectedRange(key)}
              />
              <button
                onClick={() =>
                  runAnalysis(TIME_RANGES[selectedRange].months)
                }
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors cursor-pointer"
              >
                Analyze My Calendar
              </button>
            </div>
          </div>
        )}

        {analysis.status === "loading" && (
          <div className="text-center py-20 space-y-4">
            <div className="inline-flex items-center gap-3 bg-zinc-900 rounded-xl px-6 py-4 border border-zinc-800">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-zinc-300">{analysis.message}</span>
            </div>
            <p className="text-zinc-600 text-sm">
              This may take 30-60 seconds depending on how many events you have.
            </p>
          </div>
        )}

        {analysis.status === "error" && (
          <div className="text-center py-20 space-y-4">
            <div className="bg-red-950/50 border border-red-900 rounded-xl px-6 py-4 inline-block">
              <p className="text-red-400">{analysis.message}</p>
            </div>
            <div>
              <button
                onClick={() =>
                  runAnalysis(TIME_RANGES[selectedRange].months)
                }
                className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {analysis.status === "done" && (
          <>
            <RangeToggle
              selectedRange={selectedRange}
              onChange={handleRangeChange}
            />

            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Total Events"
                value={analysis.data.totalEvents}
              />
              <StatCard
                label="Events with People"
                value={analysis.data.eventsWithPeople}
              />
              <StatCard
                label="Events with Places"
                value={analysis.data.eventsWithPlaces}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatsTable
                title="People"
                icon="👤"
                items={analysis.data.people}
                accentColor="bg-blue-500"
              />
              <StatsTable
                title="Places"
                icon="📍"
                items={analysis.data.places}
                accentColor="bg-emerald-500"
              />
            </div>

            <div className="text-center pt-4">
              <button
                onClick={() =>
                  runAnalysis(TIME_RANGES[selectedRange].months)
                }
                className="text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                Re-analyze
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function RangeToggle({
  selectedRange,
  onChange,
}: {
  selectedRange: RangeKey;
  onChange: (key: RangeKey) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl bg-zinc-900 border border-zinc-800 p-1"
      role="group"
      aria-label="Time range"
    >
      {(Object.keys(TIME_RANGES) as RangeKey[]).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            selectedRange === key
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {TIME_RANGES[key].label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <p className="text-zinc-500 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
