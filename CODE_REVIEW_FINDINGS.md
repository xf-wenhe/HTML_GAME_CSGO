# 代码审查发现报告

## 一、正确性问题（高风险）

### 1. WeaponManager.ts - 空指针解引用
**位置**: 第90行
**问题**: `getCurrentWeapon()` 使用非空断言 `!`，但 `currentWeaponId` 可能无效
**风险**: TypeError 导致游戏崩溃

### 2. WeaponManager.ts - 静默 Promise 忽略
**位置**: 第62行、第85行
**问题**: `void this.applyWeaponModel()` 忽略了模型加载失败的情况
**风险**: 武器模型加载失败但用户无感知

### 3. server/index.ts - Delta 压缩完全失效
**位置**: 第274-292行
**问题**: `lastSnapshots` 在每次 tick 都重新创建，导致 prev 永远是 undefined
**影响**: 网络流量数倍于预期，没有增量压缩

### 4. server/index.ts - 类型错误的房间配置
**位置**: 第153行
**问题**: `data.mode` 为 falsy 时传递字符串 'tdm' 而非配置对象
**风险**: 服务器运行时错误

---

## 二、代码重复问题

### 5. 8个地图布局文件重复定义辅助函数
**文件**: Dust2Layout.ts, InfernoLayout.ts, MirageLayout.ts, NukeLayout.ts, WarehouseLayout.ts, OverpassLayout.ts, TrainLayout.ts, ItalyLayout.ts, BloodStrikeLayout.ts
**问题**: 每个文件都重新定义 `wall()`, `box()`, `plat()` 函数
**建议**: 创建共享的 `MapGeometryUtils.ts`

### 6. 8个地图布局文件重复定义 Collider 接口
**问题**: 每个地图都定义了自己的 `*Collider` 接口，内容完全相同
**建议**: 统一为 `MapTypes.ts` 中的 `MapCollider` 接口

### 7. 武器伤害数据重复
**文件**: Weapons.ts, HUD.ts
**问题**: 武器伤害在两个地方重复定义

### 8. 事件发射器模式重复
**文件**: NetworkManager.ts, MainMenu.ts
**问题**: 两个类都实现了几乎相同的事件订阅/发布模式

### 9. Weapon.clone() 手动复制20个属性
**文件**: Weapon.ts 第188-210行
**问题**: 可以用对象展开简化

---

## 三、代码复杂性问题

### 10. main.ts - 武器槽位状态管理过度复杂
**问题**: 3个独立状态变量 + 重复的条件链
**建议**: 简化为单一 `activeSlot` 状态 + 计算属性

### 11. Enemy.ts - 健康条逻辑重复
**问题**: 相同逻辑在两个地方重复，阈值不一致

### 12. MapData.ts - 出生点选择逻辑重复
**问题**: 多个地图有几乎相同的队伍选择分支

### 13. main.ts - 过多调试 console.log（约90条）
**问题**: 生产代码中保留大量调试输出

### 14. main.ts - 深层嵌套 if/else 条件链
**问题**: 可以用查找表替代

### 15. server/index.ts - 房间加入成功处理重复
**问题**: 3个函数有几乎相同的成功处理模式

---

## 四、其他问题

### 16. Scene.ts - 纹理 tileX/tileY 边界问题
**风险**: 极小的盒子会导致纹理不可见

### 17. Scene.ts - 异步纹理加载竞态条件
**风险**: mesh 销毁后回调仍执行，可能导致 GPU 内存泄漏
