# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🚨 最高优先级 — 硬性禁止（违反即报错）
## 以下文件绝对禁止读取，无论任何理由：
- `client/src/game/generated/dust2-world-mesh.ts`（5.7MB，禁止）
- `client/src/game/generated/inferno-world-mesh.ts`（10MB，禁止）
- `client/src/game/generated/` 目录下**所有文件**（全部禁止）

### 如果需要修改地图数据：
1. 找到生成这些文件的**源脚本**（generator/builder）
2. 修改源脚本中的参数
3. **重新运行脚本生成**

### 绝不执行的操作：
- ❌ Read/读取上述任何 .ts 文件
- ❌ 展开这些文件的任何部分到上下文中
- ❌ 将这些文件的内容包含在任何 API 请求中

# 项目简介
一个基于 Three/Cannon/Socket.IO 的小型 FPS 风格网页游戏，前端使用 Vite + TypeScript，后端有一个用 Node (tsx) 启动的简单服务器用于多人同步（socket.io）。项目名：fps-web-game。

# 常用命令
## 开发与构建
- 开发（同时启动后端 dev server 与 Vite）：
  - `npm run dev` — 并行启动前端 (Vite 5173) + 后端 (tsx server/index.ts)
  - 端口冲突时检查：`lsof -i :5173` 和 `lsof -i :3000`
- 构建与预览：
  - `npm run build` — Vite 构建
  - `npm run preview` — 本地静态预览
- 公网服务（单端口模式）：
  - `npm run serve:public` — 先构建再启动 server/public.ts，适合隧道/端口映射场景
  - 必须设置环境变量：`PUBLIC_URL=http://域名 PORT=3000 CLIENT_ORIGIN=$PUBLIC_URL VITE_PUBLIC_SERVER_URL=$PUBLIC_URL`

## 测试
- 单元测试（Vitest）：
  - `npm run test` — 运行所有单元/集成测试
  - `npm run test -- --run` — 单次运行（非 watch 模式）
- E2E 测试（Playwright）：
  - `npx playwright test` — 运行所有 Playwright 测试
  - `npx playwright install` — 安装浏览器运行时（首次运行前）
  - `npm run test:e2e:feel` — CSGO 手感验证烟雾测试
  - `npm run test:e2e:cs16-bot` — CS 1.6 风格 Bot 对局烟雾测试
- 类型检查：
  - `npx tsc --noEmit` — TypeScript 类型检查（无输出）

## 地图生成与验证（重要）
**地图网格文件不可直接编辑**，必须通过脚本生成：
- Dust2：
  - `npm run dust2:preflight` — 检查源文件是否存在
  - `npm run dust2:import` — 从 GoldSrc MAP/BSP 导出 mesh.json
  - `npm run dust2:verify` — 验证生成的 mesh 文件完整性
  - `npm run dust2:routes` — 验证 Bot 路线几何
  - `npm run dust2:status` — 检查地图状态
  - `npm run dust2:screenshots` — 生成截图
  - `npm run dust2:render` — 渲染 Source 风格 Dust2
- Inferno：
  - `npm run inferno:preflight` — 检查源文件
  - `npm run inferno:import` — 导出 inferno-world-mesh.ts
  - `npm run inferno:verify` — 验证完整性
  - `npm run inferno:routes` — 验证路线
  - `npm run inferno:status` — 状态检查
  - `npm run inferno:screenshots` — 截图

**源文件路径**：地图原始数据（MAP/BSP）需放在指定路径，scripts/ 会自动查找。

# 主要依赖与技术栈
- 运行时 / 框架：Node.js（使用 tsx 启动 server）、Vite
- 前端渲染：three
- 物理引擎：cannon-es
- 实时通信：socket.io, socket.io-client
- 测试：vitest（单元/集成）、playwright（e2e）
- 语言：TypeScript (TS)

# 项目结构概览（高层）
- `client/` — 前端源码（Vite + TypeScript）
  - `client/index.html` — 入口 HTML
  - `client/src/main.ts` — 游戏主入口（64KB+），包含菜单、模式切换、场景初始化
  - `client/src/game/` — 游戏核心逻辑
    - `PlayerController.ts` — 玩家控制、输入处理、移动、射击
    - `Scene.ts` — Three.js 场景、渲染循环、光照
    - `Physics.ts` — Cannon-es 物理世界、碰撞检测
    - `MapData.ts` — 地图注册中心（80KB+），返回各地图 `MapLayout`
    - `Weapons.ts`, `WeaponManager.ts`, `Weapon.ts` — 武器系统（30+ CS:GO 武器）
    - `Enemy.ts`, `EnemyManager.ts` — NPC AI 与管理
    - `Movement.ts` — 移动参数（摩擦、重力、跳跃）
    - `Dust2Layout.ts`, `InfernoLayout.ts`, 等 — 各地图布局（Spawn、碰撞、炸弹点）
    - `generated/` — **禁止读取**，自动生成的大体积网格文件（5-10MB）
    - `config/maps.ts` — `MapId` 枚举 + 前端地图配置（名称、缩略图）
    - `constants/MapUnits.ts` — HU 换算常量（`HAMMER_TO_GAME_UNIT_SCALE = 0.01`）
  - `client/src/network/` — 网络同步
    - `NetworkManager.ts` — Socket.IO 客户端、房间管理
    - `Prediction.ts`, `Interpolation.ts` — 客户端预测与插值
  - `client/src/ui/` — UI 组件（HUD、菜单、购买界面、战绩）
- `server/` — 后端源码（Node.js + tsx）
  - `server/index.ts` — Socket.IO 服务端、房间匹配、状态同步、Delta Diff 压缩
  - `server/rooms.ts` — 房间管理（分配、断线重连、观战）
  - `server/gameConfig.ts` — 服务端游戏配置（tick rate、回合时长）
  - `server/public.ts` — 单端口公网服务（静态文件 + Socket.IO 同端口）
- `shared/` — 前后端共享类型（`types.ts`, `protocol.ts`）
- `scripts/` — 地图导入与验证脚本（从 GoldSrc MAP/BSP 生成 Three.js mesh）
  - `import-dust2-goldsrc.mjs`, `import-inferno-goldsrc.mjs` — 导入脚本
  - `lib/goldsrc-bsp.mjs`, `lib/goldsrc-map.mjs` — MAP/BSP 解析库
  - `lib/dust2-mesh-export.mjs`, `lib/inferno-mesh-export.mjs` — 导出 Three.js mesh
- `tests/` — 测试文件（Vitest 单元测试 + Playwright e2e）
- `package.json` — 脚本、依赖定义（ESM 模式：`"type": "module"`）

# 开发注意事项
## Node / TypeScript / Vite
- 本仓库用 ESM 模式（`package.json: "type": "module"`），请用 Node 18+/20+ 兼容的启动方式（当前脚本使用 tsx 与 `--import` 标志）。
- 本地 dev 命令会在前端（Vite 默认端口 5173）和后端（server/index.ts 中的 PORT 或 process.env.PORT，默认 3000）之间并行运行。
- 端口冲突排查：
  - 前端：`lsof -nP -iTCP:5173 -sTCP:LISTEN`
  - 后端：`lsof -nP -iTCP:3000 -sTCP:LISTEN`
  - 批量检查：`for p in 3000 5173 5174; do lsof -nP -iTCP:$p -sTCP:LISTEN || true; done`

## 网络与联机
- 本机访问：`http://localhost:5173`
- 局域网联机：
  - 启动时 Vite 会输出 `Network: http://<局域网IP>:5173/`
  - 其他同 Wi-Fi 设备访问该地址
  - 需放行防火墙：macOS 系统偏好设置 → 安全性与隐私 → 防火墙选项 → 允许 Node
- 公网联机：
  - 推荐方案：Cloudflare Tunnel（`cloudflared tunnel --url http://localhost:3000`）
  - 备选方案：ngrok、路由器端口映射
  - 公网模式必须使用 `npm run serve:public` + 环境变量（见 README.md 方案 A/B/C）

## 地图开发
- **绝对禁止读取 `client/src/game/generated/` 下的 .ts 文件**（5-10MB，会导致 token 超限）
- 修改地图的正确流程：
  1. 修改地图布局文件（如 `Dust2Layout.ts` 中的 Spawn、碰撞体参数）
  2. 若需修改静态网格，找到生成脚本（`scripts/import-dust2-goldsrc.mjs`）
  3. 修改脚本参数 → 重新运行脚本 → 生成新的 mesh 文件
- 新增地图：
  1. 创建 `XxxLayout.ts`（参考 `WarehouseLayout.ts` 简单结构）
  2. 在 `MapData.ts` 注册
  3. 在 `config/maps.ts` 添加 `MapId` 枚举与配置

## 测试与 CI
- Vitest 单元测试：`npm run test`（默认 watch 模式）
- Playwright e2e 测试：运行前确保 dev server 已启动（或在测试配置中自动启动）
- 类型检查：`npx tsc --noEmit`（CI 中应包含）
- 验收测试重点（见 README.md "测试" 章节）：
  - 中文 UI、移动手感、武器切换、伤害计算、地图碰撞

## 常见问题排查
- 启动失败（端口占用）：用 `lsof -i :PORT` 找到进程 → `kill <PID>`
- tsx/Node 相关错误：检查 tsx 版本（devDependencies）与 package.json 中的 dev 脚本是否匹配；尝试升级 tsx 或调整 `--import` 标志
- 模块解析 / ESM：若报错提示 `require()` 或 CommonJS，确认 `package.json` 中 `"type": "module"` 没被意外改动，并确保所有导入使用 ESM 语法
- Playwright 无法找到浏览器：运行 `npx playwright install`
- 玩家连不上公网：
  1. 确认服务器监听：`lsof -i :3000 | grep LISTEN`
  2. 本机测试：`curl http://localhost:3000/health`
  3. 检查隧道地址是否过期（Cloudflare/ngrok）

# 提交约定（Conventional Commits）
遵循 Conventional Commits 规范：
- `feat: add weapon system` — 新功能
- `fix: ensure main menu is shown on initial load` — Bug 修复
- `docs: add README with controls and tech stack` — 文档更新
- `refactor: simplify physics calculation` — 代码重构
- `test: add unit tests for movement system` — 测试
- `style: format PlayerController.ts` — 代码格式化

示例提交信息：
```
feat(weapon): add shooting cooldown

简短描述（50 字内）
空一行
更详细的变更说明（可选）。
```

# 快速开始
1. 安装依赖：`npm install`
2. 启动开发环境：`npm run dev`
3. 打开浏览器访问 `http://localhost:5173`
4. 详细运行说明、局域网联机、公网部署见 `README.md`

# 架构要点
## 网络同步架构
- **客户端预测**：`client/src/network/Prediction.ts` — 玩家输入立即应用到本地，不等待服务端确认
- **服务端插值**：`client/src/network/Interpolation.ts` — 远程玩家位置平滑过渡
- **Delta Diff 压缩**：`server/index.ts` 中的 `calculateDelta()` — 仅发送变化字段，大幅减少带宽
- **房间管理**：`server/rooms.ts` — 自动分配、断线重连、观战、回合重置

## 地图系统
- **地图布局**：每张地图一个 `XxxLayout.ts` 文件，包含：
  - `ctSpawns[]`, `tSpawns[]` — 出生点坐标（Hammer Units）
  - `collisionBoxes[]` — 物理碰撞体
  - `bombSites[]` — 爆破点
  - `buyZones` — 购买区
- **单位换算**：`HAMMER_TO_GAME_UNIT_SCALE = 0.01`（所有地图坐标需乘 0.01）
- **网格生成**：`scripts/import-*-goldsrc.mjs` 从 GoldSrc MAP/BSP 导出 Three.js mesh

## 武器系统
- **30+ CS:GO 武器**：`client/src/game/Weapons.ts` — 枪械参数（伤害、射速、后坐力、价格）
- **后坐力模式**：`client/src/game/RecoilPatterns.ts` — 每把枪独特的后坐力曲线
- **武器管理**：`WeaponManager.ts` — 切换、换弹、弹药、拾取

## 物理与移动
- **Cannon-es 物理引擎**：`Physics.ts` — 刚体、碰撞检测
- **移动参数**：`Movement.ts` — CS:GO 风格参数（摩擦、重力、跳跃、静步、蹲下）
- **玩家控制器**：`PlayerController.ts` — 输入处理、第一人称视角、射线检测

# 额外提示
- 不要在仓库中提交敏感信息（API key、凭证），若需要本地配置请使用 `.env` 并在 `.gitignore` 中忽略。
- 若要把本次变更写入 Git，请明确告知，我可以按你的要求帮你创建 commit（我不会未经允许自动提交）。

# ⚠️ 上下文管理规则（防止 Token 超限）
- `client/src/game/generated/` 包含巨大3D网格文件（10MB+），**绝不可读取全文**
- 文件 > 500 行时：先 Grep 定位 → 精准读取片段，不展开全文
- 3D 模型文件（.obj/.glb/.gltf）：仅读前 50 行元数据
- 代码修改：用 Grep+Edit 精准修改，不用 Read+Rewrite 全量覆盖
- 对话超 10 轮时主动压缩历史，控制总 token 在 262K 以内

# 🎮 游戏手感与物理规范（基于 CS 1.6 风格优化）
## 核心参数标准
**重力与跳跃（Movement.ts / Physics.ts）：**
- `CSGO_GRAVITY = 7.06` — CS 1.6 优化重力值（原 8.0）
- `PLAYER_JUMP_FORCE = 2.521` — 达到 45 HU 跳跃高度，0.38s 到峰值
- 物理世界重力与 Movement.ts **必须同步更新**

**移动与控制（PlayerController.ts）：**
- 蹲伏时加速度 × 2.5 — 确保蹲伏移动响应性
- `maxStepDownHeight = 2.0` — 出生时能落到地面
- 蹲伏状态优先级：Crouch > Walk > Run（防止状态冲突）
- 摩擦力每帧都应用（不限无输入时）

**鼠标灵敏度（InputManager.ts / main.ts）：**
- 基准灵敏度：`0.0035`（原 0.00165）
- main.ts 中三处灵敏度计算必须同步更新

## 出生点规范（地图相关）
**Dust2 地图高度（Dust2HammerData.ts / Dust2Layout.ts）：**
- T Spawn 地面高度：176 HU（y = 1.76 游戏单位）
- CT Spawn 地面高度：-88 HU（y = -0.88 游戏单位）
- A Site 平台：-28 HU（y = -0.28 游戏单位）
- B Site：-88 HU（y = -0.88 游戏单位）

**出生点计算方式：**
```typescript
// ✅ 正确：使用实际地面高度 + 眼高
y: hammerToGame(spawn.y) + PLAYER_EYE_HEIGHT

// ❌ 错误：硬编码固定值
y: PLAYER_EYE_HEIGHT  // 会导致悬浮或陷地
```

**服务端同步（server/gameConfig.ts）：**
- 服务端 spawns 必须与前端使用相同地面高度
- 眼高 = 地面高度 + 0.64（PLAYER_EYE_HEIGHT）

# 🔧 物理引擎坑点（cannon-es 限制）
## Trimesh 射线检测问题
- **问题**：cannon-es 的 `Trimesh` 不支持 `Ray.intersectWorld()`
- **影响**：玩家 grounded 检测、台阶检测无法命中网格
- **解决方案**：
  1. 始终启用全局地面平面（`physics.setGlobalGroundEnabled(true)`）
  2. 地面检测射线使用长距离（3.0）而非短距离
  3. 地面碰撞体用 `Box(500, 0.5, 500)` 而非 `Plane`（Plane 射线检测也有问题）
  4. Box 地面位置：`y = -0.5`，顶面在 y=0

## 防止穿模
- 可走碰撞体（walkable colliders）厚度：`0.5`（原 0.08）
- 玩家跳跃上升速度截断：`body.velocity.y > 2` 时强制设为 2
- 出生时必须重置速度并唤醒刚体：
```typescript
this.body.velocity.set(0, 0, 0);
this.body.angularVelocity.set(0, 0, 0);
this.body.wakeUp();
```

# 🤖 Bot 对局规范（Cs16BotMatch）
## 冻结时间规则
- 标准冻结时间：**5 秒**（CS 1.6 标准，原 3 秒）
- 冻结期间：
  - Bot 不能移动：`velocity.x = 0, velocity.z = 0`
  - Bot 不能攻击：直接 return 0 damage
  - `Enemy.update()` 增加 `canMove` 参数
  - `EnemyManager.update()` 透传 `canMove` 参数

## Bot 初始化规范
- `botRouteIndex` 必须初始化为 0
- 调试开关：`window.__debugBots = true` 启用日志

# 🖥️ UI/UX 规范
## 操作流程
- ESC 暂停 → 再按 ESC **直接退出**（无需二次确认弹窗）
- 进入游戏不自动请求全屏（移除 Windows 沉浸感全屏逻辑）
- HUD 必须设置 `pointer-events: none`（防止阻挡鼠标操作）

## 调试工具（main.ts 末尾 window 挂载）
```typescript
window.__debugMovement = true;  // 移动参数日志
window.__debugBots = true;      // Bot 行为日志
window.__debugShoot();          // 调试射击函数
window.__debugSetPlayerYaw();   // 设置玩家朝向
```

# 📝 开发约定与习惯
## 修改原则
1. **参数同步原则**：修改 `Movement.ts` 的重力时，必须同步修改 `Physics.ts` 中的 `world.gravity`
2. **前后端一致原则**：地图出生点修改时，前端 `Dust2Layout.ts` 与服务端 `gameConfig.ts` 必须同步
3. **三处同步原则**：鼠标灵敏度在 `InputManager.ts` 与 `main.ts`（三处调用）必须保持一致
4. **注释规范**：添加新的调试开关或修复时，注释说明"原问题"与"修复原因"

## E2E 测试文件管理
- `tests/e2e/debug_*.mjs` — 调试用单功能测试脚本
- 临时调试脚本不提交到 main 分支（或放入 .gitignore）
- 稳定测试加入 `package.json scripts` 并命名为 `test:e2e:*`

## 提交前检查清单
- [ ] 类型检查：`npx tsc --noEmit`
- [ ] 前后端参数是否同步
- [ ] 调试开关是否关闭（提交时应设为 false）
- [ ] 没有读取 `generated/` 目录下的大文件


---

如果你需要我把 CLAUDE.md 翻译成英文、添加更多细节（例如具体文件清单或端口号行号提示：server/index.ts:1-200），或直接创建一个 git 提交，请告诉我下一步操作。