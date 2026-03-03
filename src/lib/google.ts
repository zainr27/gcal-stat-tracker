import { google, calendar_v3 } from "googleapis";

export interface CalendarEvent {
  id: string;
  summary: string;
  location?: string;
  start: string;
  end: string;
}

export async function getCalendarEvents(
  accessToken: string
): Promise<CalendarEvent[]> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const timeMin = new Date();
  timeMin.setFullYear(timeMin.getFullYear() - 1);

  const allEvents: CalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: new Date().toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: "startTime",
      pageToken,
    });

    const items = response.data.items || [];
    for (const item of items) {
      if (!item.summary) continue;
      allEvents.push({
        id: item.id || "",
        summary: item.summary,
        location: item.location || undefined,
        start: getEventTime(item.start),
        end: getEventTime(item.end),
      });
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return allEvents;
}

function getEventTime(
  dt: calendar_v3.Schema$EventDateTime | undefined
): string {
  if (!dt) return "";
  return dt.dateTime || dt.date || "";
}
