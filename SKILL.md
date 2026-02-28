# Feishu Agent Skill

**MCP Agent for Feishu (Lark) integration** - Provides calendar, todo, and contact management capabilities for AI assistants.

## Capabilities

- 📅 **Calendar**: List calendars, view events, create/delete events with automatic conflict detection
- ✅ **Todo**: Manage tasks via Feishu Bitable
- 👥 **Contacts**: Search and list users from organization
- 🔐 **Auth**: OAuth 2.0 authentication with automatic token refresh

## Quick Start

```bash
# Run directly with Bun
bunx @teamclaw/feishu-agent <command>

# Or install globally
bun add -g @teamclaw/feishu-agent
feishu-agent <command>
```

## Commands

### Setup & Auth

| Command | Description |
|---------|-------------|
| `bunx @teamclaw/feishu-agent setup` | Interactive setup wizard (App credentials + OAuth + Bitable) |
| `bunx @teamclaw/feishu-agent auth` | OAuth 2.0 authorization to get user_access_token |
| `bunx @teamclaw/feishu-agent whoami` | Show current user and authorization status |
| `bunx @teamclaw/feishu-agent config list` | View global configuration |

### Calendar Management

| Command | Description |
|---------|-------------|
| `bunx @teamclaw/feishu-agent calendar` | List all calendars (primary, subscribed) |
| `bunx @teamclaw/feishu-agent calendar events` | List events in primary calendar |
| `bunx @teamclaw/feishu-agent calendar create --summary "Meeting" --start "2026-03-05 14:00" --end "2026-03-05 15:00"` | Create a new event (auto-checks conflicts) |
| `bunx @teamclaw/feishu-agent calendar create --summary "Meeting" --start "..." --end "..." --attendee user_id` | Create event with attendees |
| `bunx @teamclaw/feishu-agent calendar delete --event-id=evt123` | Delete an event |

### Other Features

| Command | Description |
|---------|-------------|
| `bunx @teamclaw/feishu-agent todo list` | List todos from Bitable |
| `bunx @teamclaw/feishu-agent todo create --title "Task" --priority "High"` | Create a todo |
| `bunx @teamclaw/feishu-agent todo done --record-id=rec123` | Mark todo as done |
| `bunx @teamclaw/feishu-agent contact list` | List users in department |
| `bunx @teamclaw/feishu-agent contact search "John"` | Search users by name/email |

## Setup Flow

### Option 1: Interactive Setup (Recommended)

```bash
bunx @teamclaw/feishu-agent setup
```

This wizard will:
1. Prompt for App ID and App Secret
2. Open browser for OAuth 2.0 authorization
3. Save tokens to `~/.feishu-agent/config.json`
4. Optionally fetch Bitable schema

### Option 2: Manual Configuration

```bash
# Step 1: Set app credentials
bunx @teamclaw/feishu-agent config set appId cli_xxxxx
bunx @teamclaw/feishu-agent config set appSecret xxxxx

# Step 2: Authorize with user account
bunx @teamclaw/feishu-agent auth
```

## Configuration

Global config is stored in `~/.feishu-agent/config.json`:

```json
{
  "appId": "cli_xxxxx",
  "appSecret": "xxxxx",
  "userAccessToken": "xxxxx",
  "refreshToken": "xxxxx"
}
```

## Required Feishu App Permissions

In Feishu Developer Console, enable:
- `calendar:calendar` - View and manage user calendars
- `calendar:event` - Manage events in calendars
- `contact:user.base:readonly` - Read user contact info
- `bitable:app` - Access Bitable data (for todo feature)

Redirect URI must be configured: `http://localhost:3000/callback`

## Use Cases for AI Agents

### Schedule a Meeting
```bash
bunx @teamclaw/feishu-agent calendar create \
  --summary "Team Standup" \
  --start "2026-03-05 10:00" \
  --end "2026-03-05 10:30" \
  --attendee user_id_1 \
  --attendee user_id_2
```
Note: The command automatically checks for time conflicts using the FreeBusy API. If a conflict is detected, the event creation will fail with a description of the busy time slot.

### Check Daily Schedule
```bash
bunx @teamclaw/feishu-agent calendar events
```

### Manage Tasks
```bash
bunx @teamclaw/feishu-agent todo create --title "Review PR #123" --priority "High"
bunx @teamclaw/feishu-agent todo list
bunx @teamclaw/feishu-agent todo done --record-id rec_xxx
```

## Troubleshooting

**"User authorization required"**
- Run `bunx @teamclaw/feishu-agent auth` to authorize

**"Token expired"**
- Run `bunx @teamclaw/feishu-agent auth` again to refresh

**"Time conflict detected"**
- The requested time slot is already busy
- Choose a different time or check your calendar with `bunx @teamclaw/feishu-agent calendar events`

**"Permission denied"**
- Check app permissions in Feishu Developer Console
