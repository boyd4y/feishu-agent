# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test test/core/calendar.test.ts

# Run CLI
bun run src/cli/index.ts <command>

# Build binary
bun build ./src/cli/index.ts --compile --outfile=feishu-agent
```

## Architecture Overview

**Feishu Agent** is a TypeScript/Node.js middleware layer for Feishu (Lark) API integration, designed for AI agents via MCP protocol.

### Layer Structure

```
src/
├── core/           # Business logic - Feishu API wrappers
│   ├── client.ts       # HTTP client with auth (tenant/user token)
│   ├── auth-manager.ts # Token lifecycle (get/refresh/save)
│   ├── config.ts       # Global config ~/.feishu-agent/config.json
│   ├── calendar.ts     # Calendar API (list, events, create, delete)
│   ├── contact.ts      # Contact API (list users, search)
│   ├── todo.ts         # Bitable Todo API (list, create, mark done)
│   └── introspection.ts# Schema discovery for Bitable tables
├── cli/            # CLI entry point and commands
│   ├── index.ts        # Main router (calendar, todo, contact, auth, setup...)
│   └── commands/       # Subcommand implementations with --help support
├── types/          # TypeScript interfaces (FeishuConfig, API responses)
└── index.ts        # Main entry point
```

### Authentication Flow

- **Tenant Token** (`tenant_access_token`): App-level APIs, auto-fetched using `appId`/`appSecret`
- **User Token** (`user_access_token`): User-level APIs (calendar, contacts), obtained via OAuth 2.0

`FeishuClient` automatically handles token refresh. User-level APIs require `useUserToken: true`.

### Configuration

Single global config at `~/.feishu-agent/config.json`:
```json
{
  "appId": "cli_xxx",
  "appSecret": "xxx",
  "userAccessToken": "xxx",
  "refreshToken": "xxx"
}
```

### Key Patterns

- All API calls go through `FeishuClient.get/post` which handles auth headers
- Core modules (`CalendarManager`, `ContactManager`, etc.) receive `FeishuClient` as dependency
- CLI commands load config from `loadConfig()` and pass to managers
- Tests use `global.fetch` mocking

### Important: Feishu User ID Types

**⚠️ Critical:** Feishu uses three different user ID types. Using the wrong one causes API errors.

| ID Type | Example | Usage |
|---------|---------|-------|
| `user_id` | `winston` | Internal username |
| `union_id` | `on_xxx` | Calendar API query params, FreeBusy API |
| `open_id` | `ou_xxx` | **Calendar Attendees API** (easy to miss!) |

**See `docs/feishu-user-id-types.md` for detailed guidance.**

Key rules:
1. Always cache all three ID types when fetching user info
2. Calendar Create Event: use `union_id` with `user_id_type: "union_id"` param
3. Calendar Add Attendees: **must use `open_id`** in the `user_id` field
4. Error messages mentioning "invalid union_id" often mean "wrong ID type"

## Skill Release (clawhub)

**Important:** This skill is published to clawhub as **documentation only** (no source code). Users run the skill via `bunx @teamclaw/feishu-agent`.

### Release Flow

1. Update version in `skills/feishu-agent/SKILL.md` frontmatter
2. Run publish script: `./scripts/publish.sh`

### skills/feishu-agent/ Folder

Contains only `SKILL.md` with YAML frontmatter metadata. No source code or binary is included.

See `docs/PUBLISH.md` for detailed publishing guide.
