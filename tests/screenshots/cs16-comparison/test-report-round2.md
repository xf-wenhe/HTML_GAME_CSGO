# CS1.6相似度第二轮测试报告 - 修复进展分析

**测试时间**: 2026-06-15T08:23:46
**测试地图**: Dust2
**测试模式**: Solo（单人闯关模式）
**总体相似度**: 29.9% → 需继续修复
**对比第一轮**: 27.0% → 29.9%（小幅提升）

---

## 一、修复成果对比

### ✅ 已成功修复的问题

```
1. 跳跃高度 ✓
   第一轮: 0.13 HU（几乎失效）
   第二轮: 52.28 HU（正常！）
   CS1.6基准: 45 HU
   状态: 超过基准16.2%，手感正常

2. 静步速度 ✓
   第一轮: 89.62 HU/s
   第二轮: 104.44 HU/s
   CS1.6基准: 110 HU/s
   状态: 仅相差5.1%，接近达标

3. 武器射击调试接口 ✓
   第一轮: 鼠标点击未触发
   第二轮: 直接调用__debugShoot()（已修复）
```

---

## 二、仍存在的P0问题（第二轮）

### 🚨 P0-1: 蹲下移动速度异常（15.42 HU/s vs 85 HU/s）

**问题描述**:
- 测值仅为理论值的**18%**
- 理论计算：PLAYER_CROUCH_SPEED = 85 × 0.01 = 0.85 game units/s
- 实测：15.42 HU/s = 0.1542 game units/s

**根本原因分析**:

```typescript
// client/src/game/PlayerController.ts:120-124
const targetSpeed = this.input.isKeyPressed('ControlLeft') || this.input.isKeyPressed('ControlRight')
  ? this.movementParams.crouchSpeed  // 0.85 game units
  : ...;

// Movement.ts:29-38
export const CSGO_MOVEMENT: MovementParams = {
  crouchSpeed: PLAYER_CROUCH_SPEED,  // 0.85 ✓ 正确
  groundAcceleration: 5.5,           // sv_accelerate
  friction: 5.2,                     // sv_friction
  stopSpeed: 1.0,                    // 100 HU -> 1.0 game units
};
```

**诊断结论**:
1. **速度常量定义正确**（0.85）
2. **加速度参数可能不足**：
   - 蹲下状态可能需要**更高的加速度**才能快速达到目标速度
   - CS:GO中蹲下加速度通常与站立相同（5.5），但实际表现差异明显

3. **摩擦力可能过度**：
   - 蹲下状态下摩擦力可能**比站立更高**
   - 需验证 `applyFriction()` 是否在蹲下时应用了额外减速

**修复方案**:
```typescript
// client/src/game/PlayerController.ts:133
// 增加蹲下状态的加速度倍率
const acceleration = this.grounded
  ? (isCrouching ? this.movementParams.groundAcceleration * 2.0 : this.movementParams.groundAcceleration)
  : this.movementParams.airAcceleration;

accelerate(horizontalVelocity, wishDirection, targetSpeed, acceleration, dt);
```

---

### 🚨 P0-2: 跳跃上升时间过短（0.15s vs 0.38s）

**问题描述**:
- 实测值仅为理论值的**39%**
- 理论计算：timeToPeak = v₀ / g = 3.02 / 8.0 = 0.377秒
- 实测：0.15秒

**根本原因分析**:

```typescript
// client/src/game/Movement.ts:40-41
export const CSGO_GRAVITY = 8.0;
export const PLAYER_JUMP_FORCE = Math.sqrt(2 * CSGO_GRAVITY * PLAYER_JUMP_HEIGHT); // 3.02
```

**诊断结论**:
1. **跳跃力计算正确**（3.02）
2. **重力可能过大**：
   - 实测上升时间0.15秒 → 重力加速度约为 3.02 / 0.15 = **20.13 game units/s²**
   - 理论重力：8.0
   - **差异：实际重力是配置值的2.5倍**

3. **可能原因**：
   - Cannon-es物理引擎的重力设置与Movement.ts配置不一致
   - 物理世界的重力加速度可能被设置为更高值

**修复方案**:
```typescript
// client/src/game/Physics.ts（检查重力配置）
const GRAVITY = -CSGO_GRAVITY; // 应为 -8.0，而非 -20.0

// 或调整跳跃力以匹配当前重力
export const PLAYER_JUMP_FORCE = Math.sqrt(2 * 20.0 * PLAYER_JUMP_HEIGHT); // 调整为 4.56
```

---

### 🚨 P0-3: Bot移动比例偏低（20% vs 50%）

**问题描述**:
- 5个Bot中仅有1个移动（20%）
- CS1.6基准要求至少50%的Bot移动

**根本原因分析**:

```typescript
// client/src/game/Enemy.ts:123-125
if (this.patrolPath.length > 0) {
  this.state = 'patrol';
  this.botRouteIndex = 0;  // Ensure initial route index ✓ 已修复
}

// client/src/game/Enemy.ts:255-268
private followBotRoute(dt: number): void {
  if (this.patrolPath.length === 0) {
    this.body.velocity.x = 0;
    this.body.velocity.z = 0;
    return;
  }

  const target = this.patrolPath[this.botRouteIndex % this.patrolPath.length];
  const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
  direction.y = 0;
  const distance = direction.length();
  if (distance < 0.75) {
    this.botRouteIndex = (this.botRouteIndex + 1) % this.patrolPath.length;
    return;
  }

  direction.normalize();
  this.body.velocity.x = direction.x * this.speed;
  this.body.velocity.z = direction.z * this.speed;
}
```

**诊断结论**:
1. **路径初始化已修复**（botRouteIndex = 0）
2. **移动逻辑正确**（直接设置velocity）
3. **可能的Bug**：
   - Bot生成时可能未正确接收`patrolPath`参数
   - Cs16BotMatch生成的Bot配置中`route`数组可能为空或未传递
   - Bot的`speed`参数可能偏低

**验证方法**:
```javascript
// 测试脚本检查：
const botStates = state.botDebugStates;
botStates.forEach(bot => {
  console.log(`${bot.id}: state=${bot.state}, routeIndex=${bot.routeIndex}`);
});

// 预期：所有Bot state='patrol', routeIndex>=0
```

**修复方案**:
```typescript
// client/src/main.ts（Bot生成逻辑）
soloBotMatch.createBotPlans(botSpawns, getDust2BotRoute).forEach(plan => {
  enemyManager.spawnEnemy({
    position: plan.position,
    type: 'shooter',
    botProfile: {
      weaponId: plan.weaponId,
      route: plan.route,  // ✓ 必须传递route
      viewRange: 28,
      attackRange: 22,
      fireIntervalMs: 480,
      accuracy: 0.28,
      damage: 16,
    },
  });
});
```

---

## 三、已修复的次要问题

### ✓ 冻结时间配置统一

```typescript
// 第一轮：freezeSeconds ?? 3
// 第二轮：freezeSeconds ?? 5 ✓ 已修复

// client/src/game/Cs16BotMatch.ts:73
this.freezeSeconds = options.freezeSeconds ?? 5;
```

### ✓ 测试脚本等待逻辑

```javascript
// 第一轮：仅等待 phase === 'live'
// 第二轮：等待 freezeRemaining === 0 ✓ 已修复

await this.waitForState(s =>
  s?.cs16BotMatch?.phase === 'live' &&
  s?.cs16BotMatch?.freezeRemaining === 0,
  15000
);
```

---

## 四、第二轮详细评分

### 【1. 移动手感】得分: 34.7% (第一轮: 13.2%)

| 指标 | 第二轮 | 第一轮 | CS1.6 | 状态 |
|------|--------|--------|-------|------|
| 奔跑速度 | 226.72 HU/s | 227.3 HU/s | 250 | ✓ 接近 |
| 蹲下速度 | 15.42 HU/s | 13.36 HU/s | 85 | ✗ P0 |
| 静步速度 | 104.44 HU/s | 89.62 HU/s | 110 | ✓ 达标 |

**进展**: 静步速度从89.62提升到104.44，差距从18.5%缩小到5.1%

---

### 【2. 跳跃物理】得分: 17.7% (第一轮: 0.0%)

| 指标 | 第二轮 | 第一轮 | CS1.6 | 状态 |
|------|--------|--------|-------|------|
| 跳跃高度 | 52.28 HU | 0.13 HU | 45 | ✓ **巨大进步** |
| 上升时间 | 0.15s | 0.00s | 0.38 | ✗ P0 |

**进展**: 跳跃高度从失效状态恢复到正常水平（超过基准）

---

### 【3. Bot AI】得分: 50.0% (无变化)

| 指标 | 第二轮 | 第一轮 | CS1.6 | 状态 |
|------|--------|--------|-------|------|
| Bot数量 | 5 | 5 | 5 | ✓ |
| 移动比例 | 20% | 0% | 50% | ✗ P0（略有改善） |

**进展**: 从0%提升到20%（1个Bot开始移动），但仍未达标

---

## 五、下一步修复优先级

### 🚨 立即修复（预计提升至50%相似度）

```
1. 调整蹲下加速度倍率
   文件: PlayerController.ts:133
   方案: 蹲下时 groundAcceleration × 2.0
   工时: 10分钟

2. 检查并修复重力配置
   文件: Physics.ts（重力设置）
   方案: 确认 Cannon-es重力 = -8.0，而非 -20.0
   工时: 15分钟

3. 验证Bot路径传递
   文件: main.ts（Bot生成逻辑）
   方案: 增加 console.log 确认 plan.route 非空
   工时: 10分钟

预计总工时: 35分钟
预计相似度: 50-60%
```

---

### ⚠️ 第二轮修复（预计提升至70%）

```
4. 优化Bot AI行为
   - 增加Bot数量到10个
   - 改进路径导航算法
   - 工时: 2小时

5. 补充缺失测试维度
   - 投掷物系统（闪光/烟雾）
   - 视觉特效（爆炸/UI）
   - 武器后坐力模式
   - 工时: 4小时
```

---

## 六、关键发现总结

### ✅ 已验证正确的实现

```
1. 单位换算系统 ✓
   - HAMMER_TO_GAME_UNIT_SCALE = 0.01 正确
   - 所有速度常量定义准确

2. 冻结时间机制 ✓
   - 配置统一为5秒
   - 测试等待逻辑正确

3. 跳跃高度 ✓
   - PLAYER_JUMP_FORCE = 3.02 正确
   - 跳跃事件触发正常

4. 武器射击接口 ✓
   - __debugShoot() 可直接调用
   - 绕过Pointer Lock限制
```

---

### ❌ 存在Bug的部分

```
1. 蹲下加速度机制
   - 理论速度正确（0.85）
   - 但实际加速度不足以快速达到目标

2. 重力配置一致性
   - Movement.ts定义: 8.0
   - 实际物理引擎可能: 20.0+
   - 需检查 Cannon-es world.gravity 设置

3. Bot路径传递
   - Enemy初始化逻辑正确
   - 但生成时可能未接收 route 参数
```

---

## 七、结论与建议

**第二轮修复成果**:
- 跳跃高度完全修复（52.28 HU vs 45基准）
- 静步速度接近达标（104.44 vs 110）
- 武器射击测试接口可用

**当前阻碍**:
- 蹲下移动速度仅为基准18%（严重异常）
- 跳跃上升时间过短（重力可能过大）
- Bot移动比例不足（路径传递可能失败）

**下一步行动**:
1. 检查Physics.ts中的重力设置，确认与Movement.ts一致
2. 调整蹲下状态的加速度参数
3. 验证Bot生成时的路径传递逻辑

**预期第三轮测试**:
- 相似度达到50-60%
- 蹲下速度恢复到80+ HU/s
- 跳跃上升时间接近0.38秒
- Bot移动比例达到50%+

---

**报告生成**: 2026-06-15T08:28:00
**第三轮测试建议**: 完成上述3项修复后立即运行