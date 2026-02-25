# Feishu Agent (OpenCode Middleware)

A high-performance, dependency-free Feishu (Lark) integration layer built with [Bun](https://bun.sh). designed for AI Agents (MCP, OpenClaw).

## 🚀 Features

- **Zero-Dependency Core**: Pure TypeScript implementation using native `fetch`.
- **Onion Architecture**: Clean separation between Core logic, Protocol adaptors, and Interfaces.
- **Introspection Engine**: Automatically "sniffs" Feishu Base tables and fields to generate schema.
- **CLI Tool**: Built-in command-line interface for easy initialization.
- **MCP Server**: (Coming Soon) Standard Model Context Protocol server.

## 📦 Prerequisites

- [Bun](https://bun.sh) v1.0+

## 🛠️ Installation

```bash
# Install dependencies
bun install
```

## 💻 CLI Usage

The agent comes with a CLI to initialize your configuration from a Feishu Base.

### Initialize from URL
This command fetches the schema (tables/fields) from a Feishu Base and generates `.feishu_agent/schema.json` and `.env`.

```bash
bun run src/cli/index.ts init https://your-domain.feishu.cn/base/basexxxxxxxx
```

**What happens:**
1. Parses the Base Token from the URL.
2. Prompts for `App ID` and `App Secret` (if not in env).
3. Fetches all tables and fields.
4. Saves schema to `.feishu_agent/schema.json`.

## 🧪 Development

### Running Tests
We use `bun:test` for high-performance unit testing.

```bash
# Run all tests
bun test

# Run specific test file
bun test test/core/auth-manager.test.ts
```

### Building Binary
Compile the project into a single executable binary:

```bash
bun build ./src/cli/index.ts --compile --outfile=feishu-agent
```

You can then run it directly:
```bash
./feishu-agent init <url>
```

## 📂 Project Structure

```
src/
├── core/           # Pure business logic (No external deps)
│   ├── client.ts       # HTTP Client wrapper
│   ├── auth-manager.ts # Token lifecycle management
│   └── introspection.ts# Schema fetching engine
├── cli/            # Command Line Interface
│   ├── index.ts        # Entry point
│   └── commands/       # Command implementations
├── types/          # Shared TypeScript interfaces
└── protocol/       # (Future) Protocol adaptors
```

## 📄 License
MIT

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.7. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
