# Feishu Agent Skill

A Bun-native CLI skill for Feishu (Lark) integration, designed for AI Agents like Claude Code.

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
| `feishu-agent setup` | Interactive setup wizard (App credentials + OAuth + Bitable) |
| `feishu-agent auth` | OAuth 2.0 authorization to get user_access_token |
| `feishu-agent whoami` | Show current user and authorization status |
| `feishu-agent config list` | View global configuration |

### Calendar Management

| Command | Description |
|---------|-------------|
| `feishu-agent calendar` | List all calendars (primary, subscribed) |
| `feishu-agent calendar events` | List events in primary calendar |
| `feishu-agent calendar create --summary "Meeting" --start "2026-03-05 14:00" --end "2026-03-05 15:00"` | Create a new event |
| `feishu-agent calendar create --summary "Meeting" --start "..." --end "..." --attendee user_id` | Create event with attendees |
| `feishu-agent calendar delete --event-id=evt123` | Delete an event |

### Other Features

| Command | Description |
|---------|-------------|
| `feishu-agent todo list` | List todos from Bitable |
| `feishu-agent todo create --title "Task" --priority "High"` | Create a todo |
| `feishu-agent todo done --record-id=rec123` | Mark todo as done |
| `feishu-agent contact list` | List users in department |
| `feishu-agent contact search "John"` | Search users by name/email |

## Setup Flow

### Option 1: Interactive Setup (Recommended)

```bash
feishu-agent setup
```

This wizard will:
1. Prompt for App ID and App Secret
2. Open browser for OAuth 2.0 authorization
3. Save tokens to `~/.feishu-agent/config.json`
4. Optionally fetch Bitable schema

### Option 2: Manual Configuration

```bash
# Step 1: Set app credentials
feishu-agent config set appId cli_xxxxx
feishu-agent config set appSecret xxxxx

# Step 2: Authorize with user account
feishu-agent auth
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
feishu-agent calendar create \
  --summary "Team Standup" \
  --start "2026-03-05 10:00" \
  --end "2026-03-05 10:30" \
  --attendee user_id_1 \
  --attendee user_id_2
```

### Check Daily Schedule
```bash
feishu-agent calendar events
```

### Manage Tasks
```bash
feishu-agent todo create --title "Review PR #123" --priority "High"
feishu-agent todo list
feishu-agent todo done --record-id rec_xxx
```

## Troubleshooting

**"User authorization required"**
- Run `feishu-agent auth` to authorize

**"Token expired"**
- Run `feishu-agent auth` again to refresh

**"Permission denied"**
- Check app permissions in Feishu Developer Console
