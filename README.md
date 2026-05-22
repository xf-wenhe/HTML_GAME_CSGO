# FPS Web Game

一个基于 Three.js、Cannon-es、Socket.IO、Vite 和 TypeScript 的浏览器 FPS 游戏原型。当前方向是原创工业训练场风格，参考 CSGO 的操作节奏、武器区分、投掷物、爆破/死斗结构和战术读图，不复制 CSGO 资产、品牌或地图。

## 当前功能

- 单人任务闯关：入口推进、清房间、守点、逐步提升敌人压力。
- NPC 难度：简单、普通、困难、专家。
- 多人模式：团队死斗、5v5 爆破房间、Socket.IO 同步。
- 武器：制式手枪、重型手枪、突击步枪、防守步枪、狙击枪、冲锋枪、散弹枪、战术刀，优先加载本地 CC0 GLB 模型。
- 投掷物：高爆雷、闪光弹、烟雾弹、燃烧弹、诱饵弹。
- 战斗：弹匣/备弹、换弹消耗备弹、部位伤害、护甲吸收、掉枪/拾取。
- 移动：跑动、静步、蹲下、蹲跳上箱、跳跃。
- 地图：Forgepoint 工业仓库地图，含大门、房间、走廊、A/B 点、掩体、楼梯、二层平台、跳箱路线和物理碰撞。
- UI：中文菜单、HUD、暂停、购买、战绩、结果与提示。

## 操作

| 操作 | 按键/鼠标 |
| --- | --- |
| 移动 | WASD |
| 视角 | 鼠标 |
| 射击 / 投掷 | 鼠标左键 |
| 瞄准 / 狙击开镜 / 刀重击 / 投掷物轻抛 | 鼠标右键 |
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
| 拾取武器 / 开门 / 互动 / 拆包 | E |
| 暂停 / 返回菜单 | Esc |

## 鼠标锁定

为了避免 Windows 上鼠标移出浏览器导致无法控制，进入战斗必须成功启用 Pointer Lock：

- 点击“开始游戏 / 继续游戏 / 锁定鼠标”后浏览器会请求锁定鼠标。
- 未锁定时不能射击、右键瞄准、投掷或移动视角。
- 如果浏览器拦截，请在 Chrome / Edge 独立窗口运行，并允许该站点使用鼠标锁定。
- 按 `Esc` 会释放鼠标并进入暂停层。

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

## 常见启动报错排查

### 1) `Error: listen EADDRINUSE ... port 3000`

含义：后端端口 `3000` 已被其他进程占用（通常是旧的 Node 服务没有退出）。

处理：

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <PID>
# 若仍未退出
kill -9 <PID>
```

### 2) `Port 5173 is in use, trying another one...`

含义：前端端口 `5173` 被占用，Vite 自动改用 `5174`（或其他端口）。

如果你希望固定使用 `5173`：

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
kill <PID>
```

如果不需要固定端口，可直接访问终端输出的 `Network` 地址（例如 `http://192.168.11.29:5174/`）。

### 3) `npm run dev` 退出码 `137`

常见原因：

- 之前的前后端进程残留，导致新的进程启动冲突。
- 进程被系统或手动强制结束（SIGKILL）。

建议先清理再重启：

```bash
pkill -f "server/index.ts|vite" || true
npm run dev
```

### 4) 一次性检查 `3000/5173/5174` 端口占用

```bash
for p in 3000 5173 5174; do
	echo "--- PORT $p ---"
	lsof -nP -iTCP:$p -sTCP:LISTEN || true
done
```

### 5) 启动后联通性自检

```bash
# 本机
curl -I http://127.0.0.1:5173

# 局域网（替换为你的主机 IP）
curl -I http://192.168.11.29:5173
```

只要 Vite 输出了 `Network: http://<你的IP>:端口/`，且防火墙已放行，其他同网段设备就能访问。

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

当前已内置一组 Quaternius / Poly Pizza CC0 GLB 武器和 SWAT 敌人模型。如果 GLB 不存在或加载失败，会使用程序化 fallback，保证游戏可运行。

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
- 右键枪械进入瞄准/开镜，刀为近身重击，投掷物为轻抛。
- `B` 能打开武器选择/购买菜单。
- `Tab` 能打开战绩面板。
- `1/2/3/4` 可切换主武器、手枪、刀和投掷物。
- 左键射击或投掷不会卡 UI。
- 打头、胸、腹、手、腿/脚的伤害不同，护甲会吸收一部分伤害。
- 换弹会消耗备弹，地面武器靠近后可按 `E` 拾取。
- 地图有大门、房间、掩体、楼梯、二层和跳箱路线，且碰撞与视觉基本一致。

## 技术栈

- 前端：Three.js、Vite、TypeScript
- 后端：Node.js、Express、Socket.IO
- 物理：Cannon-es
- 测试：Vitest、Playwright
