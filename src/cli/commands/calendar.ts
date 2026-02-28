import { Command } from "commander";
import { FeishuClient } from "../../core/client";
import { CalendarManager } from "../../core/calendar";
import { ContactManager } from "../../core/contact";
import { loadContactCache } from "../../core/config";
import { FeishuConfig } from "../../types";

interface CalendarOptions {
  calendarId?: string;
  summary?: string;
  start?: string;
  end?: string;
  attendee?: string[];
  attendeeName?: string[];
  eventId?: string;
}

export function createCalendarCommands(program: Command, config: FeishuConfig) {
  program
    .command("list")
    .description("List all calendars")
    .action(async () => {
      await handleListCalendars(config);
    });

  program
    .command("events")
    .description("List events in a calendar")
    .option("--calendar-id <string>", "Specify calendar ID")
    .action(async (options: CalendarOptions) => {
      await handleListEvents(config, options.calendarId);
    });

  program
    .command("create")
    .description("Create a new event")
    .requiredOption("--summary <string>", "Event title")
    .requiredOption("--start <string>", "Event start time")
    .requiredOption("--end <string>", "Event end time")
    .option("--attendee <ids...>", "User IDs (union_id) to invite")
    .option("--attendee-name <names...>", "Contact names to invite")
    .option("--calendar-id <string>", "Specify calendar ID")
    .action(async (options: CalendarOptions) => {
      await handleCreateEvent(config, options);
    });

  program
    .command("delete")
    .description("Delete an event")
    .requiredOption("--event-id <string>", "Event ID")
    .option("--calendar-id <string>", "Specify calendar ID")
    .action(async (options: CalendarOptions) => {
      await handleDeleteEvent(config, options);
    });
}

async function handleListCalendars(config: FeishuConfig) {
  if (!config.appId || !config.appSecret) {
    console.error("Error: FEISHU_APP_ID and FEISHU_APP_SECRET must be set.");
    process.exit(1);
  }
  if (!config.userAccessToken) {
    console.error("Error: User authorization required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const calendarManager = new CalendarManager(client);

  console.log("\n📅 Your Calendars\n");
  console.log("=".repeat(60));

  const calendars = await calendarManager.listCalendars();

  if (!calendars.calendar_list || calendars.calendar_list.length === 0) {
    console.log("No calendars found.");
    return;
  }

  const primary = calendars.calendar_list.filter(c => c.type === "primary");
  const subscribed = calendars.calendar_list.filter(c => c.type === "shared" || c.type === "exchange");
  const other = calendars.calendar_list.filter(c => c.type !== "primary" && c.type !== "shared" && c.type !== "exchange");

  if (primary.length > 0) {
    console.log("\n【Primary】");
    primary.forEach(c => {
      console.log(`  • ${c.summary}`);
      console.log(`    ID: ${c.calendar_id}`);
      console.log(`    Role: ${c.role}`);
    });
  }

  if (subscribed.length > 0) {
    console.log("\n【Subscribed】");
    subscribed.forEach(c => {
      console.log(`  • ${c.summary}`);
      console.log(`    ID: ${c.calendar_id}`);
      console.log(`    Role: ${c.role}`);
    });
  }

  if (other.length > 0) {
    console.log("\n【Other】");
    other.forEach(c => {
      console.log(`  • ${c.summary} (${c.type})`);
      console.log(`    ID: ${c.calendar_id}`);
      console.log(`    Role: ${c.role}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${calendars.calendar_list.length} calendar(s)\n`);

  if (primary.length > 0) {
    console.log(`Tip: Use --calendar-id "${primary[0].calendar_id}" to list events.`);
  }
}

async function handleListEvents(config: FeishuConfig, calendarId?: string) {
  if (!config.appId || !config.appSecret || !config.userAccessToken) {
    console.error("Error: Authorization required. Run 'feishu-agent auth'.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const calendarManager = new CalendarManager(client);

  if (!calendarId) {
    const calendars = await calendarManager.listCalendars();
    const primary = calendars.calendar_list?.find(c => c.type === "primary");
    if (primary) {
      calendarId = primary.calendar_id;
      console.log(`Using primary calendar: ${primary.summary}\n`);
    }
  }

  if (!calendarId) {
    console.error("Error: No calendar available.");
    process.exit(1);
  }

  console.log(`\n📅 Events\n`);
  console.log("=".repeat(60));

  const events = await calendarManager.listEvents(calendarId);
  if (!events.items || events.items.length === 0) {
    console.log("No events found.");
    return;
  }

  const activeEvents = events.items.filter(e => e.status !== "cancelled");
  if (activeEvents.length === 0) {
    console.log("No active events found.");
    return;
  }

  const contactCache = await loadContactCache();

  for (const e of activeEvents) {
    const start = e.start_time.timestamp
      ? new Date(parseInt(e.start_time.timestamp) * 1000).toLocaleString()
      : e.start_time.date;
    const end = e.end_time.timestamp
      ? new Date(parseInt(e.end_time.timestamp) * 1000).toLocaleString()
      : e.end_time.date;

    console.log(`\n📅 ${e.summary || "(No title)"}`);
    console.log(`   🕐 ${start} - ${end}`);
    console.log(`   ID: ${e.event_id}`);
    if (e.status && e.status !== "confirmed") {
      console.log(`   Status: ${e.status}`);
    }

    try {
      const attendees = await calendarManager.getEventAttendees(calendarId, e.event_id);
      if (attendees && attendees.length > 0) {
        const attendeeDisplay = attendees.map(a => {
          if (a.type === "user" && a.user_id) {
            // Lookup attendee name from cache by union_id or user_id
            for (const [unionId, entry] of Object.entries(contactCache)) {
              if (entry.user_id === a.user_id || unionId === a.user_id) {
                return `${entry.name}${a.is_optional ? " (optional)" : ""}`;
              }
            }
            return `${a.user_id}${a.is_optional ? " (optional)" : ""}`;
          }
          if (a.type === "chat") return `Chat: ${a.chat_id}`;
          if (a.type === "third_party" && a.third_party_email) {
            return `${a.third_party_email} (external)`;
          }
          return a.type;
        });
        console.log(`   👥 Attendees: ${attendeeDisplay.join(", ")}`);
      }
    } catch (err) {
      // Ignore errors
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${activeEvents.length} event(s)\n`);
}

async function handleCreateEvent(config: FeishuConfig, options: CalendarOptions) {
  if (!config.appId || !config.appSecret || !config.userAccessToken) {
    console.error("Error: Authorization required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const calendarManager = new CalendarManager(client);
  const contactManager = new ContactManager(client);

  const { summary, start, end, attendee, attendeeName, calendarId } = options;

  if (!summary || !start || !end) {
    console.error("Error: --summary, --start, and --end are required.");
    process.exit(1);
  }

  // Resolve attendee names to union_ids
  let attendeeUserIds: string[] = [];
  if (attendeeName && attendeeName.length > 0) {
    console.log("\n🔍 Resolving attendee names...");
    for (const name of attendeeName) {
      const results = await contactManager.searchUser(name);
      if (results.length === 0) {
        console.error(`Error: No contact found for "${name}".`);
        process.exit(1);
      }
      if (results.length > 1) {
        console.log(`  Multiple matches for "${name}":`);
        results.forEach((r, i) => {
          console.log(`    ${i + 1}. ${r.name} (${r.email || r.union_id})`);
        });
        console.log("  Using the first match.");
      }
      attendeeUserIds.push(results[0].union_id);
      console.log(`  ✓ "${name}" -> ${results[0].name} (${results[0].union_id})`);
    }
  }

  // Also support direct attendee IDs (assuming they are union_ids)
  if (attendee && attendee.length > 0) {
    attendeeUserIds = [...attendeeUserIds, ...attendee];
  }

  // Get calendar
  let targetCalendarId = calendarId;
  if (!targetCalendarId) {
    const calendars = await calendarManager.listCalendars();
    const primary = calendars.calendar_list?.find(c => c.type === "primary");
    if (primary) targetCalendarId = primary.calendar_id;
  }

  if (!targetCalendarId) {
    console.error("Error: No calendar available.");
    process.exit(1);
  }

  const startTimestamp = Math.floor(new Date(start).getTime() / 1000).toString();
  const endTimestamp = Math.floor(new Date(end).getTime() / 1000).toString();

  const event = await calendarManager.createEvent(targetCalendarId, {
    summary,
    startTime: { timestamp: startTimestamp },
    endTime: { timestamp: endTimestamp },
    attendeeUserIds: attendeeUserIds.length > 0 ? attendeeUserIds : undefined,
  });

  console.log("\n✅ Event created!");
  console.log(`   Title: ${summary}`);
  console.log(`   Time: ${new Date(parseInt(startTimestamp) * 1000).toLocaleString()} - ${new Date(parseInt(endTimestamp) * 1000).toLocaleString()}`);
  console.log(`   Calendar ID: ${targetCalendarId}`);
  if (attendeeUserIds.length > 0) {
    console.log(`   Attendees: ${attendeeUserIds.join(", ")}`);
  }
}

async function handleDeleteEvent(config: FeishuConfig, options: CalendarOptions) {
  if (!config.appId || !config.appSecret || !config.userAccessToken) {
    console.error("Error: Authorization required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const calendarManager = new CalendarManager(client);

  const { eventId, calendarId } = options;
  let targetCalendarId = calendarId;

  if (!targetCalendarId) {
    const calendars = await calendarManager.listCalendars();
    const primary = calendars.calendar_list?.find(c => c.type === "primary");
    if (primary) targetCalendarId = primary.calendar_id;
  }

  if (!targetCalendarId) {
    console.error("Error: No calendar available.");
    process.exit(1);
  }

  if (!eventId) {
    console.error("Error: --event-id is required.");
    process.exit(1);
  }

  await calendarManager.deleteEvent(targetCalendarId, eventId);
  console.log(`\n✅ Event deleted: ${eventId}\n`);
}
