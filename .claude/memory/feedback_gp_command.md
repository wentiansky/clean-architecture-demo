---
name: GP 快捷命令
description: 用户定义的 GP 命令表示提交代码并推送
type: feedback
---

当用户输入 **GP** 时，表示执行：
1. `git add` 暂存所有修改
2. `git commit` 提交代码（自动生成规范的 commit message）
3. `git push` 推送到远程仓库

**Why:** 用户提供的高效快捷方式，简化提交流程

**How to apply:**
- 识别到用户输入 "GP" 时立即执行提交推送流程
- 提交前简要确认要提交的文件变更
- 使用符合规范的 commit message 格式
