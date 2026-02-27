#!/bin/bash
set -e

# 用法: ./scripts/release.sh [patch|minor|major|x.y.z]
# 默认 patch

VERSION_TYPE=${1:-patch}

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作区有未提交的更改，请先 commit"
  exit 1
fi

# 确保在 main 分支
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "❌ 当前在 $BRANCH 分支，请切换到 main"
  exit 1
fi

# npm version 会自动: 更新 package.json + git commit + git tag
echo "📦 Bumping version: $VERSION_TYPE"
NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version)

# 手动 commit + tag（npm version 的默认 commit message 不够好）
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag "$NEW_VERSION"

echo "🚀 Pushing to origin..."
git push origin main
git push origin "$NEW_VERSION"

echo "✅ Released $NEW_VERSION"
echo "📋 Release will be auto-created by CI: https://github.com/ryne6/Crow/releases"
