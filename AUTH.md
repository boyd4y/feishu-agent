# Feishu Agent - OAuth 2.0 授权指南

## 为什么需要 OAuth 2.0 授权？

飞书 API 有两种主要的授权方式：

| 授权方式 | Token 类型 | 用途 | 权限 |
|---------|----------|------|------|
| 内部应用 | tenant_access_token | 以应用身份调用 API | 应用权限范围内的所有数据 |
| OAuth 2.0 | user_access_token | 以用户身份调用 API | 用户权限范围内的数据 |

**日历操作需要用户授权**，因为：
- 创建日历、事件等操作需要在**用户的日历**中执行
- tenant_access_token 无法代表特定用户操作

## 快速开始

### 第一步：配置重定向 URI

1. 打开 [飞书开放平台](https://open.feishu.cn/)
2. 进入你的自建应用
3. 点击左侧 **"安全设置"**
4. 在 "重定向 URI" 中添加：
   ```
   http://localhost:3000/callback
   ```
5. 保存

### 第二步：配置权限范围（Scope）

1. 在应用后台，点击 **"权限管理"**
2. 添加以下权限：
   - `calendar:calendar` - 查看和管理用户的日历
   - `calendar:event` - 管理用户日历下的日程
   - `contact:user` - 读取用户信息
3. 保存并发布

### 第三步：发布应用

**重要**：配置后需要创建新版本并发布上线

1. 点击左侧 "版本管理与发布"
2. 创建一个新版本
3. 提交审核（自建应用通常是自动审核）
4. 等待版本状态变为 "已上线"

### 第四步：运行授权脚本

```bash
# 方式 1：使用环境变量
export FEISHU_APP_ID=your_app_id
export FEISHU_APP_SECRET=your_app_secret
bun run scripts/auth.ts

# 方式 2：使用命令行参数
bun run scripts/auth.ts --app-id=xxx --app-secret=xxx

# 方式 3：使用 CLI 命令
bun run src/cli/index.ts auth
```

### 第五步：完成授权

1. 脚本会自动打开浏览器
2. 点击"同意授权"
3. 授权成功后，terminal 会显示 `user_access_token`

### 第六步：保存 Token

```bash
# 将 token 保存到环境变量
export FEISHU_USER_ACCESS_TOKEN="your_token_here"
```

## 使用 user_access_token 调用 API

### 示例代码

```typescript
import { FeishuClient } from "./core/client";

// 使用 user_access_token 初始化客户端
const client = new FeishuClient({
  appId: process.env.FEISHU_APP_ID!,
  appSecret: process.env.FEISHU_APP_SECRET!,
  userAccessToken: process.env.FEISHU_USER_ACCESS_TOKEN!,
});

// 现在可以操作用户的日历了
const calendarManager = new CalendarManager(client);
const calendars = await calendarManager.listCalendars();
```

### Token 刷新

`user_access_token` 默认有效期为 2 小时。过期后需要使用 `refresh_token` 刷新：

```typescript
const refreshResponse = await fetch("https://open.feishu.cn/open-apis/authen/v3/refresh_access_token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "refresh_token",
    refresh_token: "your_refresh_token",
    app_id: process.env.FEISHU_APP_ID,
    app_secret: process.env.FEISHU_APP_SECRET,
  }),
});
```

## 常见问题

### 1. "redirect_uri 不匹配"

确保：
- 配置的重定向 URI 与代码中完全一致（包括端口）
- 配置后已创建新版本并发布上线
- URI 中不要有多余的斜杠

### 2. "app_id 无效"

检查：
- App ID 是否正确
- App Secret 是否正确
- 应用是否已发布上线

### 3. "权限不足"

确保应用已添加日历相关权限：
- 查看和管理用户的日历（calendar:calendar）
- 管理用户日历下的日程（calendar:event）

### 4. Token 刷新后仍然失效

- 确保正确保存了 refresh_token
- refresh_token 也有有效期（通常 30 天）
- 考虑实现自动刷新机制

## 安全提示

- 永远不要将 `app_secret` 和 `access_token` 提交到代码仓库
- 使用环境变量或安全的配置管理工具
- 在生产环境中使用 HTTPS
