# Dust2 B Tunnels + B Site 精雕设计

日期：2026-05-29

## 目标
在当前 Dust2 已完成 A Site + Mid 精雕的基础上，继续精修 **B Tunnels + B Site**，把 B 区从“结构像”推进到“第一视角看上去更像 CS:GO Dust2 原版”的级别。

本轮范围只包含：
- 几何精雕
- 视觉 props / 灯光 / 材质分区微调

本轮不做：
- 网络 / AI / 武器 /移动系统改动
- 重新设计 Dust2 全图主结构
- A Site / Mid / Long 的大改
- 官方 VMF 逐刷子级完整搬运

---

## 当前问题总结

### B Tunnels 当前问题
1. Lower / Upper B 目前已经有上下层和楼梯，但整体仍然偏“规则矩形走廊”。
2. 洞道的宽度变化、收口、拐弯压迫感不够。
3. Upper Dark 的暗角感和房体收缩感不够强。
4. B 洞出口到 B Site 的过渡还偏平，没有明显“洞口推出来”的感觉。
5. 壁灯虽然补上了，但灯光层次还偏均匀，洞内缺少局部明暗起伏。

### B Site 当前问题
1. B Site 平台、Default、Double stack、Car、Back Plat 已经存在，但层次还偏粗。
2. B Window 周边还不够像原版窗洞结构。
3. B Doors 门框与门洞厚度仍然偏简化。
4. Car / Default / Back Plat 之间的相对空间组织还不够真实。
5. B Site 右侧（水箱区域）已有道具，但和包点平台的空间耦合度还不够强。

---

## 方案

### 采用方案：B 洞道收口 + B 包点层次精雕

做法：
- 保留当前 B Tunnels / B Site 主坐标和主路线。
- 细化 Lower B、Upper B、Upper Dark、B 出口、B Window、B Doors、Default / Double / Car / Back Plat 的局部几何。
- 增加少量帮助辨识空间的视觉 props 和更局部化的灯光。

采用原因：
- 这是当前 Dust2 剩余最明显的“不够像原版”的大块区域。
- 做完之后整张 Dust2 的 A/B 两边完成度会更均衡。

---

## 设计细节

## 1. B Tunnels 精雕

### 1.1 Lower B 走廊断面变化
改进目标：
- 让 Lower B 不再是单纯统一宽度直筒。
- 在靠近入口、中段、近楼梯、近出口分别做轻微断面变化。
- 通过局部凸出墙体、收口块、矮挡块，让玩家感到洞道在压迫和释放之间变化。

### 1.2 Upper Tunnels / Upper Dark
改进目标：
- Upper Tunnels 平台边沿增加层次。
- Upper Dark 做成更像真实暗室，收口更强。
- 让玩家从 Upper Dark 看向 B 出口时的框景更接近原版。

### 1.3 B 洞出口 → B Site 过渡
改进目标：
- 让洞口不是简单矩形开口。
- 在出口前增加门洞厚度 / 收口 / 偏移遮挡。
- 让出洞后视野先落到 Default / Car / Window，而不是一下子把整个 B 平面摊开。

### 1.4 B 洞楼梯与侧墙
改进目标：
- 保留现有楼梯功能，但强化楼梯旁的侧墙压迫感。
- 让 Lower → Upper 的转折更像真实空间，而不是“台阶堆起来”。

---

## 2. B Site 精雕

### 2.1 平台层次
改进目标：
- 把 B Site 平台拆成 base / edge / lip 这种更真实的层次。
- 让平台前缘和后缘更清晰。

### 2.2 Default / Double stack
改进目标：
- 把 Default 箱区拆成底座 + 上层块。
- Double stack 明确成两块可辨识叠放结构，而不是单纯一组统一方块。

### 2.3 Car / Back Plat / Water Tank 关系
改进目标：
- 让 Car 更像真正占据 B 点右前区域的视觉锚点。
- Back Plat 更像“后方高台”，不是单个高块。
- Water Tank 与 B 平台右侧空间的耦合更明显。

### 2.4 B Window
改进目标：
- 窗洞前沿、窗台、低矮可蹲墙体做得更清晰。
- 让 Window 不只是一个平台，而是一个明确的“洞口/射击点”。

### 2.5 B Doors
改进目标：
- 强化门洞前后厚度。
- 让 B Doors 区域更像建筑开口，而不是平面门框。

---

## 3. 视觉 props 与灯光

### B Tunnels
- 增强壁灯的局部明暗衰减
- Upper Dark 保持更暗
- Lower B 与 Upper B 用不同亮度层次体现空间变化

### B Site
- 增强平台边沿视觉识别
- Car / Water Tank / Window 周边增加局部高光或阴影层次
- 保持 B Site 比 B Tunnels 更亮，但比 A Site 更封闭

### 本轮 props 策略
仍然保持克制：
- 只补直接帮助识别空间结构的 props
- 不把这轮变成“环境杂物大堆砌”

---

## 4. 数据与代码边界

本轮只改：
- `client/src/game/Dust2Layout.ts`
- `client/src/game/MapData.ts`
- `client/src/game/Scene.ts`

不改：
- 其他地图
- UI
- 网络/AI/武器逻辑

---

## 5. 测试与验证

### 自动验证
- `npm run build` 必须通过

### 手动验证
重点观察：
1. Lower B 是否比现在更像真实洞道
2. Upper Dark 是否更像一个暗角房体
3. 从 B 洞出 B 是否更像原版 Dust2 的视野组织
4. B Site 的 Car / Default / Double / Back Plat 是否更清晰
5. B Window / B Doors 是否不再像薄平门窗

### 成功标准
- B Tunnels 不再像规则直走廊
- B Site 不再像单一平台 + 几个方块
- 玩家第一眼更能认出这是 CS:GO 的 B 区
- 不引入新的构建错误

---

## 6. 实施顺序
1. 精雕 B Tunnels 断面、收口、Upper Dark、楼梯转折
2. 精雕 B Site 平台、Default、Double、Car、Back Plat、Window、Doors
3. 补 B 区局部 props / 材质 / 灯光
4. 构建验证
5. 再做下一轮 Dust2 对比

---

## 7. 范围控制
这一轮目标不是把整个 Dust2 一次性做成官方 VMF 逐刷子复制品。
目标是把 **B Tunnels + B Site** 提升到和当前 A Site + Mid 接近的精度等级。

做完这轮后，Dust2 整体会进入：
- A 区：高可玩精雕
- 中路：高可玩精雕
- B 区：高可玩精雕

剩余工作就主要集中在：
- 全图脏污/材质微差
- 更细颗粒度折角
- 更高级别视觉旧化
