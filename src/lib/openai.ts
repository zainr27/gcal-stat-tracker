import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EventInput {
  summary: string;
  location?: string;
  date: string;
}

export interface ParsedEvent {
  summary: string;
  people: string[];
  places: string[];
  date: string;
}

export async function extractEntities(
  events: EventInput[]
): Promise<ParsedEvent[]> {
  if (events.length === 0) return [];

  const BATCH_SIZE = 80;
  const allResults: ParsedEvent[] = [];

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    const numbered = batch
      .map((e, idx) => {
        let line = `${idx + 1}. TITLE: "${e.summary}"`;
        if (e.location) line += ` | LOCATION: "${e.location}"`;
        return line;
      })
      .join("\n");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You extract person names and place names from calendar events. Each event has a TITLE and optionally a LOCATION field.

PEOPLE EXTRACTION RULES:
- Extract individual person names (first names or full names)
- Split compound names: "Tom & Lisa" → ["Tom", "Lisa"], "Franco/Fran" → ["Franco", "Fran"]
- Preserve the EXACT spelling from the title — do not correct or normalize names
- Franco and Fran are DIFFERENT people, never merge them
- BLOCKLIST — these are NOT people names, ignore them entirely:
  with, w/, and, &, +, the, a, for, to, re, catch-up, call, sync, meeting, dinner, lunch, coffee, drinks, chat, team, all, leads, eng, product, design, standup, retro, sprint, planning, review, check-in, 1:1, office, hours, session, workshop, class, group, weekly, daily, monthly, birthday, party, happy, hour, brunch, breakfast, workout, run, yoga, gym
- Only extract tokens that are actual proper nouns (names of people)
- If no people found, return empty array

PLACES EXTRACTION RULES:
- Priority 1: If LOCATION field exists, extract the venue/business name from it (strip street addresses, keep the venue name)
- Priority 2: If no LOCATION field, parse the title for place patterns: "at X", "@ X", "→ X", or standalone venue names
- "Blue Bottle Coffee, 300 Ivy St, SF" → "Blue Bottle Coffee"
- If no places found, return empty array

Return ONLY valid JSON, no other text.`,
        },
        {
          role: "user",
          content: `Extract people and places from these calendar events:

${numbered}

Return a JSON object with key "results" containing an array where each element has:
- "index": the event number (1-based)
- "people": string array of person names exactly as spelled in the title
- "places": string array of venue/business names`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) continue;

    try {
      const parsed = JSON.parse(content);
      const results: { index: number; people: string[]; places: string[] }[] =
        parsed.results || parsed;

      if (Array.isArray(results)) {
        for (const result of results) {
          const idx = (result.index || 0) - 1;
          const event = batch[idx];
          if (!event) continue;

          allResults.push({
            summary: event.summary,
            people: result.people || [],
            places: result.places || [],
            date: event.date,
          });
        }
      }
    } catch {
      console.error("Failed to parse GPT response for batch starting at", i);
    }
  }

  return allResults;
}
