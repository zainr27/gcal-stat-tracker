import Fuse from "fuse.js";
import { ParsedEvent } from "./openai";

export interface PersonItem {
  name: string;
  count: number;
  lastSeen: string;
  events: string[];
}

export interface PlaceItem {
  name: string;
  count: number;
  lastSeen: string;
  source: "location_field" | "title_parsed" | "mixed";
  events: string[];
}

export interface AnalysisResult {
  people: PersonItem[];
  places: PlaceItem[];
  totalEvents: number;
  eventsWithPeople: number;
  eventsWithPlaces: number;
}

export function aggregateResults(
  parsedEvents: ParsedEvent[],
  totalEvents: number,
  locationFieldEvents: Set<string>
): AnalysisResult {
  const peopleMap: Record<
    string,
    { display: string; count: number; lastSeen: string; events: string[] }
  > = {};
  const placesMap: Record<
    string,
    {
      display: string;
      count: number;
      lastSeen: string;
      events: string[];
      hasLocationField: boolean;
      hasTitleParsed: boolean;
    }
  > = {};

  let eventsWithPeople = 0;
  let eventsWithPlaces = 0;

  for (const event of parsedEvents) {
    if (event.people.length > 0) eventsWithPeople++;
    if (event.places.length > 0) eventsWithPlaces++;

    for (const person of event.people) {
      const key = normalizeName(person);
      if (!key) continue;

      if (!peopleMap[key]) {
        peopleMap[key] = {
          display: person.trim(),
          count: 0,
          lastSeen: "",
          events: [],
        };
      }
      peopleMap[key].count++;
      peopleMap[key].events.push(event.summary);
      if (event.date > peopleMap[key].lastSeen) {
        peopleMap[key].lastSeen = event.date;
      }
    }

    const eventHadLocationField = locationFieldEvents.has(event.summary);
    for (const place of event.places) {
      const key = normalizePlace(place);
      if (!key) continue;

      if (!placesMap[key]) {
        placesMap[key] = {
          display: place.trim(),
          count: 0,
          lastSeen: "",
          events: [],
          hasLocationField: false,
          hasTitleParsed: false,
        };
      }
      placesMap[key].count++;
      placesMap[key].events.push(event.summary);
      if (event.date > placesMap[key].lastSeen) {
        placesMap[key].lastSeen = event.date;
      }
      if (eventHadLocationField) {
        placesMap[key].hasLocationField = true;
      } else {
        placesMap[key].hasTitleParsed = true;
      }
    }
  }

  const people = rankPeople(peopleMap);
  const places = rankPlaces(placesMap);

  return { people, places, totalEvents, eventsWithPeople, eventsWithPlaces };
}

function normalizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePlace(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").trim();
}

function titleCase(str: string): string {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function rankPeople(
  raw: Record<
    string,
    { display: string; count: number; lastSeen: string; events: string[] }
  >
): PersonItem[] {
  return Object.values(raw)
    .map((entry) => ({
      name: titleCase(entry.display),
      count: entry.count,
      lastSeen: entry.lastSeen,
      events: entry.events,
    }))
    .sort((a, b) => b.count - a.count);
}

function rankPlaces(
  raw: Record<
    string,
    {
      display: string;
      count: number;
      lastSeen: string;
      events: string[];
      hasLocationField: boolean;
      hasTitleParsed: boolean;
    }
  >
): PlaceItem[] {
  const entries = Object.entries(raw).map(([key, data]) => ({
    key,
    name: titleCase(data.display),
    count: data.count,
    lastSeen: data.lastSeen,
    events: data.events,
    source: (data.hasLocationField && data.hasTitleParsed
      ? "mixed"
      : data.hasLocationField
        ? "location_field"
        : "title_parsed") as PlaceItem["source"],
  }));

  if (entries.length <= 1) return entries;

  // Fuzzy dedupe places only, with high threshold (0.1 = 90%+ similarity)
  const fuse = new Fuse(entries, { keys: ["key"], threshold: 0.1 });
  const consumed = new Set<string>();
  const merged: PlaceItem[] = [];

  entries.sort((a, b) => b.count - a.count);

  for (const entry of entries) {
    if (consumed.has(entry.key)) continue;
    consumed.add(entry.key);

    const matches = fuse.search(entry.key);
    let totalCount = entry.count;
    const allEvents = [...entry.events];
    let latestSeen = entry.lastSeen;
    let hasField = entry.source === "location_field" || entry.source === "mixed";
    let hasTitle = entry.source === "title_parsed" || entry.source === "mixed";

    for (const match of matches) {
      const mk = match.item.key;
      if (mk !== entry.key && !consumed.has(mk)) {
        totalCount += match.item.count;
        allEvents.push(...match.item.events);
        if (match.item.lastSeen > latestSeen) latestSeen = match.item.lastSeen;
        if (match.item.source === "location_field" || match.item.source === "mixed") hasField = true;
        if (match.item.source === "title_parsed" || match.item.source === "mixed") hasTitle = true;
        consumed.add(mk);
      }
    }

    const source: PlaceItem["source"] =
      hasField && hasTitle ? "mixed" : hasField ? "location_field" : "title_parsed";

    merged.push({
      name: entry.name,
      count: totalCount,
      lastSeen: latestSeen,
      source,
      events: allEvents,
    });
  }

  return merged.sort((a, b) => b.count - a.count);
}
