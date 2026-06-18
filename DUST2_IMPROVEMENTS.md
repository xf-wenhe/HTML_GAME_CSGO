# Dust2 单人模式改进建议

## 快速总结

经过测试，以下是需要改进的主要方面：

### 🔴 高优先级

1. **UI 缺失**
   - ❌ 击杀信息显示 (Kill Feed)
   - ❌ 计分板 (Tab 键)
   - ❌ 击中/击杀视觉反馈

2. **游戏体验**
   - ❌ 缺少冻结时间 (freezeTime)
   - ❌ Bot 有时会卡住
   - ❌ 缺少屏幕震动等反馈效果

3. **功能完善**
   - ❌ 无线电命令 (Z/X/C)
   - ❌ 手雷轨迹预览

### 🟡 中优先级

1. **武器系统**
   - ⚠️ 完善后坐力模式
   - ⚠️ 更好的武器切换动画

2. **UI 改进**
   - ⚠️ 购买菜单导航优化
   - ⚠️ 准星自定义选项

3. **性能**
   - ⚠️ 多 Bot 射击时的帧率优化

## 建议的修改顺序

1. **第一天**: 添加击杀信息、计分板、修复冻结时间
2. **第二天**: 改善 Bot AI、添加击中反馈和屏幕震动
3. **第三天**: 添加无线电命令、手雷预览、完善购买菜单
4. **第四天**: 武器后坐力优化、准星自定义、性能优化

## 主要文件需要修改

- `client/src/main.ts` - 集成新功能
- `client/src/game/Cs16BotMatch.ts` - 修复冻结时间
- `client/src/game/Enemy.ts` - 改善 Bot AI
- `client/src/ui/HUD.ts` - 扩展 HUD
- 新建 `client/src/ui/KillFeed.ts`、`Scoreboard.ts` 等

详细计划请查看: `/Users/fengye/.claude/plans/dust-3-npc-md-flickering-reef.md`
