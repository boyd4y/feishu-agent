#!/usr/bin/env bun
import { Command } from "commander";
import { setupCommand } from "./commands/setup";
import { authCommand } from "./commands/auth";
import { whoamiCommand } from "./commands/whoami";
import { loadConfig } from "../core/config";
import { createConfigCommands } from "./commands/config";
import { createCalendarCommands } from "./commands/calendar";
import { createTodoCommands } from "./commands/todo";
import { createContactCommands } from "./commands/contact";

async function main() {
  const program = new Command();

  program
    .name("feishu-agent")
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
