import { Command } from "commander";
import { FeishuClient } from "../../core/client";
import { TodoManager } from "../../core/todo";
import { FeishuConfig } from "../../types";

interface TodoOptions {
  title?: string;
  priority?: string;
  recordId?: string;
}

export function createTodoCommands(program: Command, config: FeishuConfig) {
  program
    .command("list")
    .description("List all todos from Bitable")
    .action(async () => {
      await handleList(config);
    });

  program
    .command("create")
    .description("Create a new todo")
    .requiredOption("--title <string>", "Todo title")
    .option("--priority <string>", "Priority (High, Medium, Low)", "Medium")
    .action(async (options: TodoOptions) => {
      await handleCreate(config, options);
    });

  program
    .command("done")
    .description("Mark a todo as done")
    .requiredOption("--record-id <string>", "Record ID")
    .action(async (options: TodoOptions) => {
      await handleDone(config, options);
    });
}

async function handleList(config: FeishuConfig) {
  if (!config.appId || !config.appSecret) {
    console.error("Error: Credentials required.");
    process.exit(1);
  }

  const baseToken = process.env.FEISHU_BASE_TOKEN;
  if (!baseToken) {
    console.error("Error: FEISHU_BASE_TOKEN required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const todoManager = new TodoManager(client, baseToken);

  console.log(`Fetching todos from Base: ${baseToken}`);
  const todos = await todoManager.listTodos();

  if (todos.length > 0) {
    console.table(todos.map((t: any) => ({
      id: t.record_id,
      title: t.fields.Title,
      done: t.fields.Done,
      priority: t.fields.Priority || "N/A"
    })));
  } else {
    console.log("No todos found.");
  }
}

async function handleCreate(config: FeishuConfig, options: TodoOptions) {
  if (!config.appId || !config.appSecret) {
    console.error("Error: Credentials required.");
    process.exit(1);
  }

  const baseToken = process.env.FEISHU_BASE_TOKEN;
  if (!baseToken) {
    console.error("Error: FEISHU_BASE_TOKEN required.");
    process.exit(1);
  }

  if (!options?.title) {
    console.error("Error: --title is required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const todoManager = new TodoManager(client, baseToken);

  const todo = await todoManager.createTodo(options.title, options.priority || "Medium");
  console.log(`Todo created successfully! ID: ${todo.record_id}`);
}

async function handleDone(config: FeishuConfig, options: TodoOptions) {
  if (!config.appId || !config.appSecret) {
    console.error("Error: Credentials required.");
    process.exit(1);
  }

  const baseToken = process.env.FEISHU_BASE_TOKEN;
  if (!baseToken) {
    console.error("Error: FEISHU_BASE_TOKEN required.");
    process.exit(1);
  }

  if (!options?.recordId) {
    console.error("Error: --record-id is required.");
    process.exit(1);
  }

  const client = new FeishuClient(config);
  const todoManager = new TodoManager(client, baseToken);

  await todoManager.markDone(options.recordId);
  console.log(`Todo ${options.recordId} marked as done.`);
}
