"use client";

import { useState } from "react";

interface BaseItem {
  name: string;
  count: number;
  lastSeen: string;
  events: string[];
}

interface PlaceItem extends BaseItem {
  source?: "location_field" | "title_parsed" | "mixed";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sourceLabel(source?: string): string | null {
  if (!source) return null;
  if (source === "location_field") return "from location field";
  if (source === "title_parsed") return "from title";
  if (source === "mixed") return "location + title";
  return null;
}

export default function StatsTable({
  title,
  icon,
  items,
  accentColor,
}: {
  title: string;
  icon: string;
  items: PlaceItem[];
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const maxCount = items[0]?.count || 1;

  if (items.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
        <p className="text-zinc-500">No data found.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const src = sourceLabel(item.source);
          return (
            <div key={item.name}>
              <button
                onClick={() =>
                  setExpanded(expanded === item.name ? null : item.name)
                }
                className="w-full text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 py-2">
                  <span className="text-zinc-500 text-sm font-mono w-6 text-right">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-white truncate">
                          {item.name}
                        </span>
                        {item.lastSeen && (
                          <span className="text-zinc-600 text-xs shrink-0">
                            last {formatDate(item.lastSeen)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {src && (
                          <span className="text-zinc-600 text-xs">{src}</span>
                        )}
                        <span className="text-zinc-400 text-sm font-mono">
                          {item.count}x
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${accentColor}`}
                        style={{
                          width: `${(item.count / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </button>
              {expanded === item.name && (
                <div className="ml-9 mb-2 mt-1 p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Events:</p>
                  <div className="space-y-1">
                    {item.events.slice(0, 10).map((event, i) => (
                      <p key={i} className="text-sm text-zinc-300 truncate">
                        {event}
                      </p>
                    ))}
                    {item.events.length > 10 && (
                      <p className="text-xs text-zinc-500">
                        +{item.events.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
