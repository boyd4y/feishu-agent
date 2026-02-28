#!/bin/bash

# Feishu Agent Skill 发布脚本
# 使用 clawhub 发布技能到 registry（仅文档，无源代码）

set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILL_DIR="$PROJECT_DIR/skills/feishu-agent"
SKILL_FILE="$SKILL_DIR/SKILL.md"
PACKAGE_JSON="$PROJECT_DIR/package.json"

echo "🚀 Feishu Agent Skill 发布工具"
echo "================================"
echo ""

# 检查必要文件
echo "📦 检查必要文件..."
if [ ! -f "$SKILL_FILE" ]; then
    echo "❌ 缺少必要文件：$SKILL_FILE"
    exit 1
fi
if [ ! -f "$PACKAGE_JSON" ]; then
    echo "❌ 缺少 package.json: $PACKAGE_JSON"
    exit 1
fi
echo "✅ $SKILL_FILE 存在"
echo "✅ $PACKAGE_JSON 存在"
echo ""

# 从 package.json 提取版本
VERSION=$(grep '"version"' "$PACKAGE_JSON" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
echo "📋 版本信息：v$VERSION (from package.json)"
echo ""

# 同步版本号到 SKILL.md
echo "🔄 同步版本号到 SKILL.md..."
sed -i.bak "s/^version: .*/version: $VERSION/" "$SKILL_FILE"
rm -f "$SKILL_FILE.bak"
echo "✅ 版本号已同步"
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
