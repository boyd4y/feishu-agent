#!/usr/bin/env node
import { Command } from "commander";
import { setupCommand } from "./cli/commands/setup";
import { authCommand } from "./cli/commands/auth";
import { whoamiCommand } from "./cli/commands/whoami";
import { loadConfig } from "./core/config";
import { createConfigCommands } from "./cli/commands/config";
import { createCalendarCommands } from "./cli/commands/calendar";
import { createTodoCommands } from "./cli/commands/todo";
import { createContactCommands } from "./cli/commands/contact";

async function main() {
  const program = new Command();

  program
    .name("feishu_agent")
    .description("Feishu Agent CLI for AI assistants")
    .version("1.0.0");

  program
    .command("setup")
    .description("Initialize configuration")
    .action(setupCommand);

  program
    .command("auth")
    .description("Authenticate with Feishu OAuth")
    .action(authCommand);

  program
    .command("whoami")
    .description("Show current user info")
    .action(whoamiCommand);

  // Load config for commands that need it
  const config = await loadConfig();

  // Config subcommand group
  const configCmd = program
    .command("config")
    .description("Manage configuration");
  createConfigCommands(configCmd);

  // Calendar subcommand group
  const calendarCmd = program
    .command("calendar")
    .description("Manage calendar events");
  createCalendarCommands(calendarCmd, config);

  // Todo subcommand group
  const todoCmd = program
    .command("todo")
    .description("Manage todos");
  createTodoCommands(todoCmd, config);

  // Contact subcommand group
  const contactCmd = program
    .command("contact")
    .description("Manage contacts");
  createContactCommands(contactCmd, config);

  await program.parseAsync();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

// Export modules for library usage
export * from "./core/client";
export * from "./core/auth-manager";
export * from "./core/calendar";
export * from "./core/contact";
export * from "./core/todo";
export * from "./types";
