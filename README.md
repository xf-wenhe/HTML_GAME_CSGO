# FPS Web Game

一个基于 Three.js、Cannon-es、Socket.IO、Vite 和 TypeScript 的浏览器 FPS 游戏原型。当前方向是原创工业训练场风格，参考 CSGO 的操作节奏、武器区分、投掷物、爆破/死斗结构和战术读图，不复制 CSGO 资产、品牌或地图。

## 当前功能

- 单人任务闯关：入口推进、清房间、守点、逐步提升敌人压力。
- NPC 难度：简单、普通、困难、专家。
- 多人模式：团队死斗、5v5 爆破房间、Socket.IO 同步。
- 武器：制式手枪、重型手枪、突击步枪、防守步枪、狙击枪、冲锋枪、散弹枪、战术刀。
- 投掷物：高爆雷、闪光弹、烟雾弹、燃烧弹、诱饵弹。
- 移动：跑动、静步、蹲下、蹲跳上箱、跳跃。
- 地图：Forgepoint 工业仓库地图，含大门、房间、走廊、A/B 点、掩体、箱体和物理碰撞。
- UI：中文菜单、HUD、暂停、购买、战绩、结果与提示。

## 操作

| 操作 | 按键/鼠标 |
| --- | --- |
| 移动 | WASD |
| 视角 | 鼠标 |
| 射击 / 投掷 | 鼠标左键 |
| 跳跃 | Space |
| 蹲下 | Ctrl |
| 大跳上箱 | Ctrl + Space |
| 静步 | Shift |
| 换弹 | R |
| 购买 / 武器选择 | B |
| 战绩面板 | Tab |
| 主武器 | 1 |
| 手枪 | 2 |
| 刀 | 3 |
| 切换投掷物 | 4 |
| 开门 / 互动 / 拆包 | E |
| 暂停 / 返回菜单 | Esc |

## 本机运行

```bash
npm install
npm run dev
```

本机浏览器打开：

```text
http://localhost:5173/
```

后端默认监听：

```text
http://localhost:3000/
```

## 局域网联机

其他电脑不能访问 `localhost`，因为 `localhost` 只代表各自电脑本机。需要访问运行游戏主机的局域网 IP。

当前这台机器检测到的局域网 IP 是：

```text
192.168.11.29
```

推荐启动方式：

```bash
PORT=3000 \
CLIENT_ORIGIN=http://192.168.11.29:5173 \
PUBLIC_SERVER_URL=http://192.168.11.29:3000 \
VITE_PUBLIC_SERVER_URL=http://192.168.11.29:3000 \
npm run dev
```

同一 Wi-Fi / 同一路由器下，其他电脑打开：

```text
http://192.168.11.29:5173/
```

如果访问失败，检查：

- 主机和其他电脑是否在同一个局域网。
- macOS / Windows 防火墙是否允许 Node/Vite 入站连接。
- `5173` 前端端口和 `3000` 后端端口是否被占用或被防火墙拦截。

## 公网联机部署

公网联机需要把前端和后端部署到可访问的服务器，或使用端口映射/隧道。关键环境变量：

```bash
PORT=3000
CLIENT_ORIGIN=https://你的前端域名
PUBLIC_SERVER_URL=https://你的后端域名
VITE_PUBLIC_SERVER_URL=https://你的后端域名
MAX_ROOMS=64
ROOM_IDLE_TIMEOUT_MS=600000
```

前端构建：

```bash
npm run build
```

后端运行：

```bash
PORT=3000 npm run dev
```

生产环境建议把 Vite 构建产物交给 Nginx、静态托管或 CDN，把 Socket.IO 后端部署为常驻 Node 服务，并确保 HTTPS、CORS 和 WebSocket 代理配置正确。

## 资产说明

游戏优先从以下路径加载 GLB 模型：

- `client/public/assets/models/weapons/`
- `client/public/assets/models/enemies/`
- `client/public/assets/models/props/`

如果 GLB 不存在或加载失败，会使用程序化写实 fallback，保证游戏可运行。

当前推荐免费/CC0 候选来源：

- Quaternius / Poly Pizza Ultimate Guns Pack，Public Domain / CC0。
- Quaternius Sci-Fi Modular Gun Pack，CC0。
- Poly Haven，用于 CC0 HDRI 和材质。

添加真实 GLB 模型后，请同步更新 `client/public/assets/ATTRIBUTION.md`。

## 测试

```bash
npx tsc --noEmit
npm run build
npm run test -- --run
npm run test:e2e:feel
```

验收重点：

- 主菜单、HUD、购买菜单、战绩面板全部为中文。
- 单人模式可选择 NPC 难度，并显示中文任务目标。
- `Ctrl` 可蹲下，`Ctrl + Space` 可蹲跳上箱。
- `B` 能打开武器选择/购买菜单。
- `Tab` 能打开战绩面板。
- `1/2/3/4` 可切换主武器、手枪、刀和投掷物。
- 左键射击或投掷不会卡 UI。
- 地图有大门、房间、掩体，且碰撞与视觉基本一致。

## 技术栈

- 前端：Three.js、Vite、TypeScript
- 后端：Node.js、Express、Socket.IO
- 物理：Cannon-es
- 测试：Vitest、Playwright
