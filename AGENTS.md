# 🚨 最高优先级 — 硬性禁止（违反即报错）
## 以下文件绝对禁止读取或展开到上下文，无论任何理由：
- `client/src/game/generated/dust2-world-mesh.ts`（5.7MB，禁止）
- `client/src/game/generated/inferno-world-mesh.ts`（10MB，禁止）
- `client/src/game/generated/` 目录下**所有文件**（全部禁止）

### 如果需要修改地图数据：
1. 找到生成这些文件的**源脚本**（generator/builder）
2. 修改源脚本中的参数
3. **重新运行脚本生成**

### 绝不执行的操作：
- ❌ Read/读取上述任何文件
- ❌ 展开这些文件的任何部分到上下文中
- ❌ 将这些文件的内容包含在任何 API 请求中
- ❌ 把大 JSON、大 base64 图片、generated 文件内容作为工具输出重新回灌进对话
 
### 大输出回灌禁令（同等优先级）：
- ❌ 禁止把 `inferno-preflight.json` 等大型 JSON 全文放回上下文
- ❌ 禁止把 `tmp-inferno-*.png`、`/tmp/*.png` 等截图/base64 图片再次发给模型，除非只是本地人工查看
- ❌ 禁止通过 `node --input-type=module -e` 或 `import ... from ...generated/...` 间接读取生成文件内容

---

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

# ⚠️ 上下文优化提示（必须严格遵守）
- `client/src/game/generated/` 目录包含巨大的3D网格生成文件（10MB+），**绝不要读取这些文件**。需要修改地图数据时，修改生成器脚本后重新运行。
- `claude-mem/` 目录是内嵌的记忆插件，与项目功能无关，**不要读取**。
- `tmp-*` 开头的是临时调试文件，不需要读取。
- 图片文件按需手动读取，不要自动预加载。
- **大文件处理规则**：
  - 单个文件超过 **500 行**时，禁止一次性 Read 全文 → 必须先用 Grep/Search 定位目标行号范围，再精准读取相关片段（Read + offset/limit）。
  - 3D 模型文件（.obj / .glb / .gltf 等）只读取前 50 行结构信息或元数据，**绝不展开完整内容**。
  - cstrike/ 目录下的地图资源文件同理，按需读取，不批量展开。
- **Token 节约策略**：
  - 代码修改采用「Grep 定位 → 精准 Edit」模式，禁止「Read 整文件 → Rewrite 整文件」模式。
  - 对话轮次超过 10 轮时，主动总结之前的结论和决策，丢弃冗余中间过程。
  - 当前模型最大上下文 262K tokens，务必控制每次请求的总 token 数在此范围内。

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

如果你需要我把 AGENTS.md 翻译成英文、添加更多细节（例如具体文件清单或端口号行号提示：server/index.ts:1-200），或直接创建一个 git 提交，请告诉我下一步操作。
