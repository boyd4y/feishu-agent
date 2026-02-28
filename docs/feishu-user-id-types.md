# Feishu User ID Types - Pitfalls and Best Practices

## Problem Summary

Feishu (Lark) uses **three different user ID types**, and using the wrong one will cause API errors that are sometimes misleading.

## Three ID Types

| ID Type | Example | Description |
|---------|---------|-------------|
| `user_id` | `winston` | Internal username, configured in Feishu admin console |
| `union_id` | `on_1f2750025ce551299d77bfe711c2dde5` | Cross-application unified ID (starts with `on_`) |
| `open_id` | `ou_2c5555e60c2a64dfccf8869d469a71dc` | Open platform ID (starts with `ou_`) |

## API-Specific ID Requirements

Different Feishu APIs require different ID types:

| API | Required ID Type | Notes |
|-----|------------------|-------|
| **Calendar - Create Event** | `union_id` | Use `user_id_type: "union_id"` query param |
| **Calendar - Add Attendees** | `open_id` | Two-step: create event first, then add attendees |
| **Calendar - FreeBusy** | `union_id` | Use `user_id_type: "union_id"` query param |
| **Contact - List Users** | Returns all three | Request with `user_id_type: "union_id"` |
| **Auth - User Info** | Returns all three | `/open-apis/authen/v1/user_info` |

## Common Pitfalls

### ❌ Pitfall 1: Using `user_id` for Calendar Attendees

**Error Message:**
```
Error: Feishu API Error: The request you send is not a valid {union_id} or not exists,
and the example value is {on_da5****************dfe}. Invalid ids: [winston]
```

**Root Cause:**
The error message mentions "union_id" but the real issue is that the **Add Attendees API requires `open_id`**, not `union_id` or `user_id`.

**Incorrect Code:**
```typescript
// WRONG: Using union_id or user_id
await client.post('/calendar/v4/calendars/{id}/events/{id}/attendees', {
  attendees: [{ type: "user", user_id: "on_xxx" }] // union_id - WRONG!
});
```

**Correct Code:**
```typescript
// CORRECT: Using open_id
await client.post('/calendar/v4/calendars/{id}/events/{id}/attendees', {
  attendees: [{ type: "user", user_id: "ou_xxx" }] // open_id - CORRECT!
});
```

### ❌ Pitfall 2: Assuming ID Interchangeability

Different APIs expect different ID types, even though they all represent the same user:

```typescript
// Contact API - returns union_id in response
const users = await contactManager.searchUser("John");
// users[0].union_id = "on_xxx"
// users[0].open_id = "ou_xxx"
// users[0].user_id = "john"

// Calendar Create Event - use union_id
await calendarManager.createEvent(calendarId, {
  // ... event details
}, { user_id_type: "union_id" });

// Calendar Add Attendees - MUST use open_id
await client.post(`/attendees`, {
  attendees: [{ type: "user", user_id: user.open_id }] // NOT union_id!
});
```

## Best Practices

### 1. Always Store All Three ID Types

When fetching user info, cache all three ID types:

```typescript
interface ContactCacheEntry {
  name: string;
  email?: string;
  user_id?: string;   // Internal username
  union_id?: string;  // For Calendar API params
  open_id?: string;   // For Calendar Attendees API
}
```

### 2. Use Helper Functions

Create helper functions to convert between ID types:

```typescript
// Get open_id from union_id for calendar attendees
function getOpenIdForAttendee(unionId: string): string | undefined {
  const entry = contactCache[unionId];
  return entry?.open_id;
}
```

### 3. Always Check API Documentation

Before implementing any Feishu API integration:
1. Check which ID type the API requires
2. Verify the `user_id_type` query parameter (if applicable)
3. Test with real data to confirm

### 4. Error Messages Can Be Misleading

Feishu API error messages sometimes reference the wrong ID type. When you see an error about "invalid union_id":
- Check if you're using the correct ID type for **that specific API**
- The error might actually mean "wrong ID type" not "invalid ID format"

## Reference: Getting All ID Types

```typescript
// From Auth User Info API
const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const data = await response.json();
// data.data.user_id = "winston"
// data.data.union_id = "on_1f2750025ce551299d77bfe711c2dde5"
// data.data.open_id = "ou_2c5555e60c2a64dfccf8869d469a71dc"

// From Contact List Users API
const users = await client.get('/contact/v3/users', { user_id_type: 'union_id' });
// users.items[0].user_id = "winston"
// users.items[0].union_id = "on_..."
// users.items[0].open_id = "ou_..."
```

## Related Files in This Project

- `src/core/contact.ts` - Contact management with ID caching
- `src/core/config.ts` - `ContactCacheEntry` interface
- `src/core/calendar.ts` - Calendar API with correct ID usage
- `src/core/auth-manager.ts` - User info retrieval
- `src/types/index.ts` - `UserInfo` interface

## History

This issue has caused multiple incidents because:
1. Error messages reference "union_id" but actually require "open_id"
2. Different APIs within the same domain (Calendar) use different ID types
3. ID types are not clearly documented in API examples
4. The feishu-agent project previously unified to "union_id" everywhere, which broke the Attendees API

**Resolution:** Store and use all three ID types, selecting the appropriate one based on the specific API being called.
