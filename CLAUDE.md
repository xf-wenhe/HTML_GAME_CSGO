# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 项目简介
一个基于 Three/Cannon/Socket.IO 的小型 FPS 风格网页游戏，前端使用 Vite + TypeScript，后端有一个用 Node (tsx) 启动的简单服务器用于多人同步（socket.io）。项目名：fps-web-game。

# 常用命令
- 开发（同时启动后端 dev server 与 Vite）：
  - npm run dev
  - 对应 package.json: "dev": "node --import tsx/esm server/index.ts & vite"
- 构建：
  - npm run build
- 预览构建结果（本地静态预览）：
  - npm run preview
- 单元测试（Vitest）：
  - npm run test
- Playwright e2e 测试（浏览器端）：
  - npx playwright test
  - 如需先安装 Playwright 浏览器运行时：npx playwright install

# 主要依赖与技术栈
- 运行时 / 框架：Node.js（使用 tsx 启动 server）、Vite
- 前端渲染：three
- 物理引擎：cannon-es
- 实时通信：socket.io, socket.io-client
- 测试：vitest（单元/集成）、playwright（e2e）
- 语言：TypeScript (TS)

# 项目结构概览（高层）
- client/: 前端源码（Vite + TS）
  - client/index.html（入口 HTML）
  - client/src/: 前端 TS 源码（渲染、控制器、网络管理、UI）
- server/: 后端源码（使用 tsx 启动）
  - server/index.ts（后端启动脚本，Socket.IO 入口，配置 port）
- package.json: 脚本、依赖定义

# 开发注意事项
- Node / TypeScript / Vite
  - 本仓库用 ESM 模式（package.json: "type": "module"），请用 Node 18+/20+ 兼容的启动方式（当前脚本使用 tsx 与 --import 标志）。
  - 本地 dev 命令会在前端（Vite 默认端口 5173）和后端（server/index.ts 中的 PORT 或 process.env.PORT）之间并行运行；如果端口冲突请检查这两个服务。
- 如何找到服务器端端口：在 server/index.ts 中查找 PORT、process.env.PORT 或默认端口字符串；也可能在 .env 或配置文件中定义。
- 运行测试：vitest 可直接通过 npm run test 运行单元/集成测试；Playwright 用于 e2e 测试，运行前请确保 dev server 已启动或在测试命令中使用 fixtures 启动服务。
- Node 版本差异：在早期提交中已调整 tsx 的 loader/import 标志以兼容 Node 20+，若遇到启动报错，请检查 package.json scripts 中 dev 命令和 tsx 版本。

# 提交约定（Conventional Commits 示例）
- feat: add weapon system
- fix: ensure main menu is shown on initial load
- docs: add README with controls and tech stack
- style: format PlayerController.ts
示例提交信息：

feat(weapon): add shooting cooldown

简短描述（50 字内）\n空一行\n更详细的变更说明（可选）。

# 如何运行与调试
1. 安装依赖：npm install
2. 启动开发环境：npm run dev（会并行启动后端 server/index.ts 与 Vite）
3. 打开浏览器访问 Vite 提示的地址（通常 http://localhost:5173）
4. 若需要调试后端：在 server/index.ts 中添加日志或使用 Node 调试器（注意 tsx 的启动参数）

# 测试与 CI
- 单元 / 集成：vitest（npm run test）
- e2e：playwright（npx playwright test），请确保测试运行前 dev server 可访问或在测试配置中自动启动服务

# 常见问题排查提示
- 启动失败（端口占用）：查看是否已有进程占用了 5173（Vite）或 server 的端口；macOS 上可用 lsof -i :PORT 找到并终止进程。
- tsx/Node 相关错误：检查 tsx 版本（devDependencies）与 package.json 中的 dev 脚本是否匹配；尝试升级 tsx 或调整 --import/--loader 标志。
- 模块解析 / ESM：若报错提示 require() 或 CommonJS，确认 package.json 中 "type": "module" 没被意外改动，并确保所有导入使用 ESM 语法。
- Playwright 无法找到浏览器：运行 npx playwright install

# 额外提示
- 不要在仓库中提交敏感信息（API key、凭证），若需要本地配置请使用 .env 并在 .gitignore 中忽略。
- 若要把本次变更写入 Git，请明确告知，我可以按你的要求帮你创建 commit（我不会未经允许自动提交）。


---

如果你需要我把 CLAUDE.md 翻译成英文、添加更多细节（例如具体文件清单或端口号行号提示：server/index.ts:1-200），或直接创建一个 git 提交，请告诉我下一步操作。