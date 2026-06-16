# 测试修复的三个问题

## 测试前准备
1. 启动服务器: `npm run dev` (已完成，端口 5173)
2. 打开浏览器访问 http://localhost:5173

## 测试步骤

### 问题1: 死斗模式无法转向移动跳跃
**根本原因**: 多人模式 `startGame()` 时网络未连接，`requestGameFocus()` 失败。`roomJoined` 回调中没有重新请求指针锁定。

**测试步骤**:
1. 打开浏览器控制台（F12）
2. 点击"团队死斗"按钮
3. 等待连接成功（看到通知"团队死斗 房间已就绪"）
4. 点击画布锁定鼠标
5. **预期结果**: 鼠标锁定成功，可以移动鼠标转向，WASD 移动，空格跳跃
6. **验证**: 按 F12 检查 `window.__debugInputState().pointerLocked` 应为 `true`

**修复代码** (client/src/main.ts:538):
```typescript
// Fix: Request pointer lock after room is joined (network is now connected)
if (!isSpectating && gameRunning && inputMode === 'playing') {
  requestGameFocus();
}
```

---

### 问题2: 死斗模式退出后界面卡死
**根本原因分析中...**

**测试步骤**:
1. 在问题1测试完成后
2. 按 ESC 键退出游戏
3. **预期结果**: 返回主菜单，所有按钮可点击
4. 点击"单人任务"或其他按钮测试

---

### 问题3: 其他模式进入后人物上下闪动
**根本原因**: `setPosition()` 设置 `grounded = false`，导致物理引擎在下一帧误判玩家在空中，产生垂直速度振荡。

**测试步骤**:
1. 点击"单人任务"或"爆破"模式
2. 观察人物出生瞬间
3. **预期结果**: 人物平稳落地，无上下闪动
4. **修复代码** (client/src/game/PlayerController.ts:437-443):
```typescript
// Fix: Force immediate grounded check instead of setting to false
// This prevents physics oscillation when spawning
this.grounded = this.canJump();
```

---

## 自动化验证
运行 E2E 测试（如需要）：
```bash
npx playwright test tests/e2e/debug-tdm-issues.spec.mjs --headed
```

## 检查清单
- [ ] 问题1修复验证：死斗模式可转向移动跳跃
- [ ] 问题2修复验证：退出后界面可点击
- [ ] 问题3修复验证：人物出生无闪动
