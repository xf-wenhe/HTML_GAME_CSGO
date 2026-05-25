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

## 公网接入（非局域网）

下面给两种常用方案：

- 方案 A：隧道（Cloudflare / ngrok），适合临时测试，最快。
- 方案 B：路由器端口映射，适合长期自建公网入口。

### 方案 A：Cloudflare Tunnel（推荐临时联机）

`NetworkManager` 默认会把后端地址拼成 `协议://域名:3000`。当你使用 `https://xxxx.trycloudflare.com` 这类公网域名时，必须显式设置 `VITE_PUBLIC_SERVER_URL`，否则前端会去连 `https://xxxx.trycloudflare.com:3000` 而失败。

1) 先开隧道（终端 A）：

```bash
cloudflared tunnel --url http://localhost:3000
```

记下输出的公网地址（示例）：

```text
https://abcd-1234.trycloudflare.com
```

2) 用同一个公网地址启动单端口服务（终端 B）：

```bash
PUBLIC_URL=https://abcd-1234.trycloudflare.com
PORT=3000 \
CLIENT_ORIGIN=$PUBLIC_URL \
PUBLIC_SERVER_URL=$PUBLIC_URL \
VITE_PUBLIC_SERVER_URL=$PUBLIC_URL \
npm run serve:public
```

3) 把 `PUBLIC_URL` 发给外网玩家：

```text
https://abcd-1234.trycloudflare.com
```

说明：

- `npm run serve:public` 会先构建前端再启动 `server/public.ts`。
- 页面和 Socket.IO 都走同一个公网域名，跨域问题最少。
- 如果隧道地址变化，需要重新执行第 2 步再构建一次。

### 方案 A-2：ngrok（临时联机备选）

1) 启动 ngrok：

```bash
ngrok http 3000
```

2) 拿到 ngrok 的 `https://xxxx.ngrok-free.app` 后，同样设置：

```bash
PUBLIC_URL=https://xxxx.ngrok-free.app
PORT=3000 \
CLIENT_ORIGIN=$PUBLIC_URL \
PUBLIC_SERVER_URL=$PUBLIC_URL \
VITE_PUBLIC_SERVER_URL=$PUBLIC_URL \
npm run serve:public
```

### 方案 B：路由器端口映射（长期可用）

1) 本机启动：

```bash
PUBLIC_URL=http://你的公网IP或域名:3000
PORT=3000 \
CLIENT_ORIGIN=$PUBLIC_URL \
PUBLIC_SERVER_URL=$PUBLIC_URL \
VITE_PUBLIC_SERVER_URL=$PUBLIC_URL \
npm run serve:public
```

2) 在路由器做端口转发（NAT）：

- 外网 TCP `3000` -> 内网主机 `192.168.11.29:3000`

3) 放行防火墙：

- macOS 防火墙允许 Node 入站
- 路由器安全策略允许该端口

4) 外网测试：

```bash
curl -I http://你的公网IP:3000
```

能返回 HTTP 头即表示外网可达。

### 安全建议（公网必须看）

- 仅用于测试时，建议优先用隧道并在结束后立即关闭进程。
- 不要提交任何 token、临时公网地址、账号凭据到仓库。
- 若长期开放公网，建议至少增加：
	- 访问鉴权（房间口令或登录）
	- IP 级限流
	- HTTPS 反向代理
	- 服务端输入校验和日志审计

### Windows 玩家 1 分钟接入卡片

把下面这段直接发给外网玩家即可：

1) 打开你发来的公网地址（示例）：

```text
https://abcd-1234.trycloudflare.com
```

2) 进入后点击“团队死斗/爆破”并等待房间分配。

3) 如果显示“任务待命”或看不到其他玩家，按顺序检查：

- 刷新页面后重进一次。
- 确认地址栏是你发的公网域名，不是 `localhost` 或局域网 IP。
- 用 Chrome/Edge 独立窗口打开，允许鼠标锁定。

4) 仍无法联机时，回传这三条信息给房主排查：

- 地址栏完整 URL
- 大厅右上角网络状态文本
- 错误提示截图（若有）

### 房主 30 秒排障卡片

玩家反馈连不上时，房主按这个顺序执行：

1) 确认服务还在监听：

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

2) 本机接口自检：

```bash
curl -I http://127.0.0.1:3000
```

3) 如用隧道，确认公网地址还有效：

```bash
cloudflared tunnel --url http://localhost:3000
```

拿到新的公网 URL 后，必须重新启动：

```bash
PUBLIC_URL=https://你的新域名
PORT=3000 \
CLIENT_ORIGIN=$PUBLIC_URL \
PUBLIC_SERVER_URL=$PUBLIC_URL \
VITE_PUBLIC_SERVER_URL=$PUBLIC_URL \
npm run serve:public
```

4) 让玩家强制刷新后重连（Ctrl+F5 或清缓存后打开新链接）。

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

---

## 外网多人联机

默认情况下，服务器监听本地端口（`3000`），只有同一局域网或本机可以访问。  
要让**外网玩家**加入，需要将端口暴露到公网。以下提供三种方案。

---

### 方案 A：Cloudflare Tunnel（免费推荐）

Cloudflare Tunnel 无需公网 IP，也无需开放路由器端口，是最简单的外网方案。

**1. 安装 cloudflared**

```bash
# macOS (Homebrew)
brew install cloudflare/cloudflare/cloudflared

# Linux (Debian/Ubuntu)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Windows (管理员 PowerShell)
winget install --id Cloudflare.cloudflared
```

**2. 启动游戏服务器**

```bash
npm run dev   # 确保后端服务跑在 http://localhost:3000
```

**3. 创建临时隧道（无需登录）**

```bash
cloudflared tunnel --url http://localhost:3000
```

终端会输出一个类似 `https://xxxx-xxxx.trycloudflare.com` 的公网地址，将此地址告知其他玩家即可。

> **注意**：临时隧道每次运行会生成不同域名，适合临时组局。  
> 如需固定域名，先 `cloudflared login` 注册 Cloudflare 账号，再创建命名隧道。

---

### 方案 B：ngrok

ngrok 同样无需公网 IP，免费账号有每月流量和并发限制。

**1. 注册并安装**

前往 [https://ngrok.com](https://ngrok.com) 注册账号，下载并安装 ngrok。

```bash
# macOS
brew install ngrok/ngrok/ngrok

# Linux / Windows
# 从官网下载对应压缩包解压，将 ngrok 可执行文件加入 PATH
```

**2. 绑定 Authtoken**

```bash
ngrok config add-authtoken <你的token>   # 从 ngrok dashboard 复制
```

**3. 启动游戏服务器后开启隧道**

```bash
npm run dev
# 另开终端：
ngrok http 3000
```

终端会显示 `Forwarding https://xxxx.ngrok-free.app -> http://localhost:3000`，将该地址分享给玩家。

> **免费限制**：每月约 1 GB 流量，1 个在线隧道，随机域名。

---

### 方案 C：路由器端口映射（有公网 IP）

如果你的宽带分配了公网 IPv4，可直接映射端口，延迟最低。

**1. 查询本机局域网 IP**

```bash
# macOS / Linux
ip route get 1 | awk '{print $7}' || ifconfig | grep "inet "

# Windows
ipconfig | findstr "IPv4"
# 例：192.168.1.100
```

**2. 在路由器管理页面设置端口映射**

登录路由器（通常为 `192.168.1.1` 或 `192.168.0.1`），找到 **"端口转发"** 或 **"虚拟服务器"**：

| 外部端口 | 内部 IP         | 内部端口 | 协议 |
|---------|----------------|---------|------|
| 3000    | 192.168.1.100  | 3000    | TCP  |

**3. 开放防火墙**

```bash
# macOS（通常无需操作，系统防火墙默认允许）
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/bin/node

# Linux (Ubuntu/Debian)
sudo ufw allow 3000/tcp

# Windows（管理员 PowerShell）
netsh advfirewall firewall add rule name="FPS Game" protocol=TCP dir=in action=allow localport=3000
```

**4. 告知玩家公网 IP**

```bash
# 查询公网 IP
curl -s https://api.ipify.org
```

玩家在游戏房间地址栏输入 `http://<你的公网IP>:3000` 即可加入。

---

### 常见问题

**Q：延迟很高怎么办？**  
- Cloudflare / ngrok：选择离玩家最近的地区节点（cloudflared 可用 `--region` 参数指定）。  
- 端口映射：检查宽带运营商是否提供低延迟线路；游戏服务器的 tick rate 可在 `server/gameConfig.ts` 中调低。

**Q：玩家连不上怎么排查？**

```bash
# 1. 确认服务器正在监听
lsof -i :3000 | grep LISTEN   # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 2. 本机测试连通性
curl http://localhost:3000/health

# 3. Cloudflare / ngrok：检查终端输出的隧道地址是否正确
# 4. 端口映射：确认路由器防火墙和本机防火墙都已放行 3000 端口
```

**Q：服务器端口不是 3000 怎么办？**  
查看 `server/index.ts` 顶部的 `PORT` 变量，或检查环境变量 `PORT`，将上述命令中的 `3000` 替换为实际端口即可。
