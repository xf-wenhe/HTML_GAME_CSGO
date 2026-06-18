# Dust2 单人模式开发任务分解

## 目标 1: 添加击杀信息显示 (Kill Feed)

### 实现
**文件**:
- 新建: `client/src/ui/KillFeed.ts`
- 修改: `client/src/main.ts`
- 修改: `client/src/game/Cs16BotMatch.ts` (添加击杀事件)

**步骤**:
1. 创建 `KillFeed` 类，管理击杀信息显示
2. 在 `main.ts` 中集成 KillFeed 到 HUD
3. 在 `Cs16BotMatch` 中添加击杀事件回调
4. 添加 CSS 样式，放在屏幕右上角
5. 实现信息自动淡出功能 (3秒)

### 测试
**单元测试**:
- 新建: `client/src/ui/test/KillFeed.test.ts`
- 测试: 添加击杀、自动移除、渲染正确性

**E2E 测试**:
- 运行现有 Bot 对战测试，验证击杀信息显示
- 手动测试: 击杀 Bot 后检查 Kill Feed

### Review
检查点:
- 代码结构清晰，易于维护
- 样式符合 CS 1.6 风格
- 性能: 添加/移除 DOM 元素高效
- 没有内存泄漏

### 提交
```
feat(ui): add kill feed display

- Add KillFeed component for showing recent kills
- Integrate with Cs16BotMatch kill events
- Add auto-fadeout after 3 seconds
- Style kill feed in top-right corner
```

---

## 目标 2: 添加计分板 (Scoreboard)

### 实现
**文件**:
- 新建: `client/src/ui/Scoreboard.ts`
- 修改: `client/src/main.ts`
- 修改: `client/src/game/Cs16BotMatch.ts` (添加计分统计)

**步骤**:
1. 创建 `Scoreboard` 类，显示玩家列表和统计
2. 添加 Tab 键显示/隐藏逻辑
3. 显示 CT/T 阵营、击杀、死亡、Ping
4. 显示当前比分和剩余时间
5. 添加半透明背景样式

### 测试
**单元测试**:
- 新建: `client/src/ui/test/Scoreboard.test.ts`
- 测试: 渲染、更新、显示/隐藏

**E2E 测试**:
- 手动测试: 按 Tab 键验证计分板显示
- 验证数据更新正确

### Review
检查点:
- Tab 键响应灵敏
- 数据准确实时更新
- 样式美观，不遮挡游戏
- 响应式布局适配不同分辨率

### 提交
```
feat(ui): add scoreboard display

- Add Scoreboard component with player stats
- Tab key toggles scoreboard visibility
- Show team scores, player kills/deaths
- Add semi-transparent background styling
```

---

## 目标 3: 修复冻结时间 (Freeze Time)

### 实现
**文件**:
- 修改: `client/src/game/Cs16BotMatch.ts`

**步骤**:
1. 检查当前冻结时间实现，找出问题
2. 确保游戏开始时 phase 为 'freezeTime'
3. 添加 5 秒倒计时显示
4. 冻结时间内禁止移动和射击
5. 冻结时间结束后自动切换到 'live'

### 测试
**单元测试**:
- 修改: `client/src/game/test/Cs16BotMatch.test.ts`
- 测试: 冻结时间状态转换、倒计时

**E2E 测试**:
- 运行: `node tests/e2e/cs16-bot-match-smoke.mjs`
- 手动测试: 验证冻结时间内无法移动/射击

### Review
检查点:
- 冻结时间确实是 5 秒
- 冻结期间 Bot 也不移动/射击
- HUD 显示倒计时清晰
- 状态转换流畅无 bug

### 提交
```
fix(gameplay): ensure freeze time works correctly

- Fix phase to start in freezeTime
- Add 5 second countdown display
- Prevent movement/shooting during freeze
- Auto-transition to live phase after freeze
```

---

## 目标 4: 添加击中反馈和屏幕震动

### 实现
**文件**:
- 新建: `client/src/game/FeedbackEffects.ts`
- 修改: `client/src/game/PlayerController.ts`
- 修改: `client/src/game/Scene.ts`
- 修改: `client/src/ui/HUD.ts`

**步骤**:
1. 创建 `FeedbackEffects` 类管理屏幕震动和效果
2. 在 `PlayerController` 中集成击中检测
3. 添加击中时的屏幕中心标记
4. 射击时轻微震动、被击中时大幅震动
5. 在 HUD 中添加命中图标动画

### 测试
**单元测试**:
- 新建: `client/src/game/test/FeedbackEffects.test.ts`
- 测试: 震动效果、状态重置

**E2E 测试**:
- 手动测试: 射击时体验震动效果
- 验证击中标记显示正确

### Review
检查点:
- 震动效果自然不过度
- 击中反馈清晰明显
- 性能: 效果不影响帧率
- 代码解耦良好

### 提交
```
feat(gameplay): add hit feedback and screen shake

- Add FeedbackEffects class for visual/audio effects
- Screen shake on shooting and being hit
- Hit marker in center of screen when hitting enemies
- Animated kill icons for feedback
```

---

## 目标 5: 改善 Bot AI 和防卡住逻辑

### 实现
**文件**:
- 修改: `client/src/game/Enemy.ts`
- 修改: `client/src/game/EnemyManager.ts`

**步骤**:
1. 添加 stuck 检测: 如果 Bot 几秒没移动就视为卡住
2. 添加恢复逻辑: 随机选择新的路径点或 teleport
3. 改善瞄准平滑度，不要瞬间转向
4. 添加射击冷却，不要每秒都射
5. 改善路径寻路，添加简单的障碍物躲避

### 测试
**单元测试**:
- 修改: `client/src/game/test/Enemy.test.ts`
- 测试: stuck 检测、恢复逻辑

**E2E 测试**:
- 运行长时间 Bot 对战测试，验证不卡住
- 手动测试: 观察 Bot 行为是否自然

### Review
检查点:
- Bot 不再卡住
- Bot 行为更自然流畅
- 难度适中，有挑战性但可战胜
- 性能: Bot 逻辑不影响帧率

### 提交
```
fix(ai): improve bot AI and add stuck prevention

- Add stuck detection and recovery logic
- Smooth out bot aiming behavior
- Add firing cooldowns for more realistic behavior
- Improve path following with simple obstacle avoidance
```

---

## 目标 6: 添加无线电命令菜单

### 实现
**文件**:
- 新建: `client/src/ui/RadioMenu.ts`
- 修改: `client/src/main.ts`

**步骤**:
1. 创建 `RadioMenu` 类，管理无线电菜单
2. Z/X/C 键打开不同的菜单页
3. 数字键选择命令
4. 在屏幕左侧显示无线电消息
5. 添加简单的音效

### 测试
**单元测试**:
- 新建: `client/src/ui/test/RadioMenu.test.ts`
- 测试: 菜单打开/关闭、命令选择

**E2E 测试**:
- 手动测试: 验证 Z/X/C 菜单功能正常
- 验证消息显示正确

### Review
检查点:
- 菜单导航直观
- 消息显示位置合适
- 样式符合 CS 1.6 风格
- 没有快捷键冲突

### 提交
```
feat(ui): add radio command menu

- Add RadioMenu component with Z/X/C menus
- Number keys select commands
- Display radio messages on left side of screen
- Add basic radio sound effects
```

---

## 目标 7: 完善武器后坐力模式

### 实现
**文件**:
- 修改: `client/src/game/RecoilPatterns.ts`
- 修改: `client/src/game/WeaponManager.ts`

**步骤**:
1. 为每把武器添加完整的后坐力模式数据
2. 实现准星扩散和恢复
3. 添加连射时的后坐力叠加
4. 改善后坐力手感，更接近 CS 1.6
5. 添加蹲伏减少后坐力的逻辑

### 测试
**单元测试**:
- 修改: `client/src/game/test/WeaponManager.test.ts`
- 测试: 后坐力模式、准星扩散

**E2E 测试**:
- 手动测试: 体验各武器的后坐力
- 验证连续射击的手感

### Review
检查点:
- 后坐力模式准确
- 手感流畅，接近原版
- 不同武器差异明显
- 蹲伏效果正确

### 提交
```
feat(weapons): complete recoil patterns for all weapons

- Add full recoil pattern data for every weapon
- Implement crosshair spread and recovery
- Add recoil accumulation for continuous fire
- Improve feel to match CS 1.6 more closely
- Add crouch recoil reduction
```

---

## 目标 8: 添加准星自定义选项

### 实现
**文件**:
- 新建: `client/src/ui/CrosshairEditor.ts`
- 修改: `client/src/ui/HUD.ts`
- 修改: `client/src/main.ts`

**步骤**:
1. 创建准星自定义菜单
2. 支持颜色、大小、粗细、中心点、外框等选项
3. 实时预览准星效果
4. 保存设置到 localStorage
5. 在游戏中应用自定义准星

### 测试
**单元测试**:
- 新建: `client/src/ui/test/CrosshairEditor.test.ts`
- 测试: 设置保存、渲染正确性

**E2E 测试**:
- 手动测试: 验证自定义选项都能正常工作
- 验证设置重启后保存

### Review
检查点:
- 自定义选项丰富
- UI 直观易用
- 设置正确保存和加载
- 准星渲染清晰

### 提交
```
feat(ui): add crosshair customization

- Add CrosshairEditor with size/color/style options
- Real-time preview of crosshair changes
- Save settings to localStorage
- Apply custom crosshair in-game
```

---

## 总体验证计划

### 集成测试
所有目标完成后:
1. 运行完整单元测试: `npm run test -- --run`
2. 运行所有 E2E 测试
3. 进行完整的游戏流程测试

### 性能检查
- 验证帧率没有明显下降
- 检查内存使用正常
- 验证长时间游戏稳定

### 最终提交
```
chore: complete dust2 solo mode improvements

Summary of all improvements:
- Kill feed display
- Scoreboard (Tab key)
- Fixed freeze time
- Hit feedback and screen shake
- Improved bot AI with stuck prevention
- Radio command menu (Z/X/C)
- Complete weapon recoil patterns
- Crosshair customization
```
