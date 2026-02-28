#!/bin/bash

# Feishu Agent Skill 发布脚本
# 使用 clawhub 发布技能到 registry（仅文档，无源代码）

set -e

SKILL_DIR="skills/feishu-agent"
SKILL_FILE="$SKILL_DIR/SKILL.md"

echo "🚀 Feishu Agent Skill 发布工具"
echo "================================"
echo ""

# 检查必要文件
echo "📦 检查必要文件..."
if [ ! -f "$SKILL_FILE" ]; then
    echo "❌ 缺少必要文件：$SKILL_FILE"
    exit 1
fi
echo "✅ $SKILL_FILE 存在"
echo ""

# 从 frontmatter 提取版本
VERSION=$(grep '^version:' "$SKILL_FILE" | sed 's/version: *//')
echo "📋 版本信息：v$VERSION"
echo ""

# 发布
echo "📤 发布技能到 clawhub..."
echo ""
bunx clawhub publish "$SKILL_DIR" \
    --slug "feishu-agent" \
    --name "Feishu Agent" \
    --version "$VERSION" \
    --changelog "Feishu Agent - Calendar, Todo, and Contact management for AI assistants" \
    --tags "latest,feishu,lark,mcp,calendar,todo"

echo ""
echo "✅ 发布完成！"
