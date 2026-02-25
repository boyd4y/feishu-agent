# Feishu Agent - Architecture & Guidelines

This repository implements the Feishu (Lark) Agent middleware, designed as an AI-first integration layer. It follows the **Onion Architecture** and prioritizes a **Dependency-Free** philosophy using Bun.

## Architecture Overview

1.  **Core Engine (`src/core`)**: 
    - Pure TypeScript logic for Feishu API interaction.
    - **NO** external HTTP libraries (axios, got, etc.). Use native `fetch`.
    - Handles Auth (Tenant Access Token) and Request Building.
2.  **Protocol Layer (`src/protocol`, `src/mcp`)**:
    - Translates core capabilities into standardized protocols.
    - **MCP Server**: Exposes resources and tools to AI clients via `@modelcontextprotocol/sdk`.
    - **CLI**: Entry point for initialization and syncing.
3.  **Interfaces (`src/cli`, `src/skills`)**:
    - Exposes functionality to end-users and other agent frameworks (OpenClaw).

## Build & Commands

- **Runtime**: `bun` (v1.x+)
- **Install**: `bun install`
- **Run CLI**: `bun run src/cli/index.ts`
- **Run MCP Server**: `bun run src/mcp/server.ts`
- **Test**: `bun test`
- **Build Binary**: `bun build ./src/cli/index.ts --compile --outfile=feishu-agent`


## CLI Usage

The CLI is the primary entry point for initializing the agent.

```bash
# Initialize schema from a Feishu Base URL
bun run src/cli/index.ts init https://your-domain.feishu.cn/base/basexxxxxxxx
```

This command will:
1. Extract the Base Token.
2. Prompt for App ID/Secret (if not in `.env`).
3. Fetch the schema (tables, fields).
4. Save schema to `.feishu_agent/schema.json`.
5. Create/Update `.env`.
## Coding Standards

### 1. General Philosophy
- **Zero Dependencies**: Avoid adding npm packages unless absolutely necessary (e.g., `zod`, `mcp-sdk`).
- **Bun First**: Utilize Bun's native APIs (`Bun.file`, `Bun.serve`, `sqlite`).
- **Type Safety**: Strict TypeScript. No `any`. Use `zod` for runtime validation.

### 2. File Structure
- `src/core/`: Business logic, API clients, Auth.
- `src/mcp/`: MCP Server implementation.
- `src/cli/`: Command-line interface logic.
- `src/types/`: Shared type definitions.

### 3. Naming Conventions
- **Files**: `kebab-case.ts` (e.g., `auth-manager.ts`).
- **Classes**: `PascalCase` (e.g., `FeishuClient`).
- **Functions/Vars**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE`.

### 4. Error Handling
- Use custom error classes where possible.
- Wrap external API calls in `try/catch` blocks.
- Return meaningful error messages to the MCP client.

### 5. Formatting
- Use Prettier (default settings).
- 2 spaces indentation.
- Semicolons required.

## MCP Implementation Guidelines

- **Resources**: Expose Feishu Base/Table structures as readable resources.
- **Tools**: Expose atomic operations (CRUD) as tools.
- **Prompts**: (Optional) specific prompts for common Feishu workflows.

## Testing
- Use `bun test`.
- Write unit tests for core logic.
- Mock Feishu API responses for tests.

---
**Agent Instruction**: When modifying this codebase, ALWAYS check if a native Bun API can solve the problem before adding a new dependency.
