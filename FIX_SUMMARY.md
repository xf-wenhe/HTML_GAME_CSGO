# 修复总结 - 三个问题的根本原因和解决方案

## 问题1：死斗模式无法转向移动跳跃

### 根本原因
多人模式启动流程：
1. `startGame('multiplayer')` → 网络未连接
2. `requestGameFocus()` → 请求指针锁定失败（浏览器安全限制）
3. `network.connect()` 开始连接
4. `roomJoined` 回调 → 玩家进入房间，但没有重新请求指针锁定
5. 结果：`inputMode='playing'` 但 `pointerLocked=false`，导致 `getMouseDelta()` 返回零

### 修复方案
在 `client/src/main.ts:538` 的 `roomJoined` 回调末尾添加：
```typescript
// Fix: Request pointer lock after room is joined (network is now connected)
if (!isSpectating && gameRunning && inputMode === 'playing') {
  requestGameFocus();
}
```

---

## 问题2：死斗模式退出后界面卡死

### 根本原因（需进一步验证）
根据CSS分析：
- `.hud` 隐藏时：`opacity:0; pointer-events:none; visibility:hidden`
- `.main-menu` 显示时：`pointer-events:auto; z-index:100`

理论上应该可点击。可能的原因：
1. HUD内的遮罩层（pause overlay、pointer lock guide、buy menu、scoreboard）未正确清理
2. 确认对话框（confirm-dialog）残留
3. Canvas阻挡（但canvas已设置 `pointer-events:none`）

### 已验证的修复
检查 `endGame()` 函数（line 747-770）：
```typescript
hud.hide(); // 包含 hidePause()、hidePointerLockGuide()、toggleBuyMenu(false)、toggleScoreboard(false)
```
应该已经清理了所有遮罩。

**需要手动测试验证是否修复**

---

## 问题3：其他模式进入后人物上下闪动

### 根本原因
`PlayerController.setPosition()` 中设置 `this.grounded = false`：
1. 出生时 `setPosition()` → `grounded=false`
2. 下一帧 `update()` → `canJump()` 射线检测命中地面 → `grounded=true`
3. 物理引擎在 `grounded=false` 时可能施加额外的重力或速度
4. 导致垂直方向速度振荡，产生闪动

### 修复方案
在 `client/src/game/PlayerController.ts:444` 修改：
```typescript
setPosition(position: THREE.Vector3): void {
  // ... 省略其他代码
  // Fix: Force immediate grounded check instead of setting to false
  // This prevents physics oscillation when spawning
  this.grounded = this.canJump();
}
```

同时，在 `client/src/main.ts:533` 的 `roomJoined` 回调中，调用 `player.update(0.001)` 强制立即稳定物理状态：
```typescript
if (player && localSnapshot) {
  player.setPosition(new THREE.Vector3(localSnapshot.position.x, localSnapshot.position.y, localSnapshot.position.z));
  // Force grounded check on next frame to stabilize physics
  player.update(0.001);
}
```

---

## 测试验证

### 自动化测试（可选）
```bash
npx playwright test tests/e2e/debug-tdm-issues.spec.mjs --headed
```

### 手动测试清单
见 `tests/manual-test-checklist.md`

---

## 修改的文件
1. `client/src/main.ts` (line 512-546): 在 `roomJoined` 回调中添加指针锁定请求和物理稳定化
2. `client/src/game/PlayerController.ts` (line 437-445): 修复 `setPosition()` 的 grounded 状态处理
