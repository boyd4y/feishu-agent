# Feishu Agent Skill 发布指南

## 技能结构

根据 clawhub 规范，技能文件夹只需包含：

```
skills/feishu-agent/
└── SKILL.md         # 必需：技能文档 + frontmatter 元数据
```

**注意：**
- 本技能通过 `bunx @teamclaw/feishu-agent` 运行，不包含源代码
- `SKILL.md` 的 YAML frontmatter 包含所有必需元数据

## SKILL.md Frontmatter

```yaml
---
name: feishu-agent
description: MCP Agent for Feishu (Lark) integration
version: 1.0.12
metadata:
  openclaw:
    requires:
      bins:
        - bun
---
```

## 发布前检查清单

### 1. 必需文件
- [x] `SKILL.md` - 技能文档（含 YAML frontmatter）

### 2. 版本更新

更新 `SKILL.md` frontmatter 中的版本号：
```yaml
version: 1.0.12  # 遵循 semver
```

### 3. 发布流程

```bash
# 方式 1: 使用发布脚本
./scripts/publish.sh

# 方式 2: 手动发布
bunx clawhub publish skills/feishu-agent \
  --slug "feishu-agent" \
  --name "Feishu Agent" \
  --version "1.0.12" \
  --changelog "更新日志内容" \
  --tags "latest,feishu,lark,mcp,calendar,todo"
```

### 4. 发布后验证

- [ ] 在 clawhub registry 中查看技能页面
- [ ] 测试安装：`clawhub install feishu-agent`
- [ ] 测试运行：`bunx @teamclaw/feishu-agent --help`

## 更新技能

更新现有技能时，只需提高版本号：

```bash
bunx clawhub publish skills/feishu-agent \
  --version "1.0.13" \
  --changelog "修复日历事件创建的时间冲突检测问题" \
  --tags "latest"
```

## clawhub 发布选项

| 选项 | 说明 |
|------|------|
| `--slug <slug>` | 技能标识符（唯一） |
| `--name <name>` | 显示名称 |
| `--version <version>` | 版本号（semver） |
| `--fork-of <slug[@version]>` | 标记为现有技能的分支 |
| `--changelog <text>` | 更新日志 |
| `--tags <tags>` | 逗号分隔的标签（默认：latest） |

## 参考

- [SKILL_FORMAT.md](./SKILL_FORMAT.md) - clawhub 技能格式规范
