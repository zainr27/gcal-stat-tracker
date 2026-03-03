"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import StatsTable from "@/components/StatsTable";

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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const runAnalysis = useCallback(async () => {
    setAnalysis({
      status: "loading",
      message: "Fetching your calendar events...",
    });

    try {
      const res = await fetch("/api/analyze");

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: AnalysisResult = await res.json();
      setAnalysis({ status: "done", data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setAnalysis({ status: "error", message });
    }
  }, []);

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
                We'll scan the last 12 months of your calendar and find out who
                you hang out with most.
              </p>
            </div>
            <button
              onClick={runAnalysis}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors cursor-pointer"
            >
              Analyze My Calendar
            </button>
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
                onClick={runAnalysis}
                className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {analysis.status === "done" && (
          <>
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
                onClick={runAnalysis}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <p className="text-zinc-500 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
