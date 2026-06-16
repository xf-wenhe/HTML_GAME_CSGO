# 手动诊断指南 - 找出根本原因

## 前提条件
- 服务器已启动（http://localhost:5173）
- 浏览器开发者工具已打开（F12）

## 步骤1：收集初始状态证据

打开控制台，运行以下诊断命令：

```javascript
// 检查初始状态
console.log('初始状态:', {
  inputMode: window.__debugInputState?.()?.mode,
  pointerLocked: window.__debugInputState?.()?.pointerLocked,
  gameRunning: window.__debugInputState?.()?.gameRunning
});
```

**预期输出**：
```
初始状态: { inputMode: 'menu', pointerLocked: false, gameRunning: false }
```

---

## 步骤2：测试死斗模式（问题1）

### 2.1 点击"团队死斗"按钮
观察控制台日志，查找：
```
[Debug] roomJoined triggered { spectator: ..., gameRunning: ..., inputMode: ... }
[Debug] Requesting pointer lock from roomJoined
[Debug] requestGameFocus called { gameRunning: true, inputMode: 'playing', ... }
[Debug] Pointer lock result: true/false
```

**关键问题**：
- `roomJoined` 是否触发？
- `requestGameFocus` 是否被调用？
- `Pointer lock result` 是 true 还是 false？

### 2.2 点击画布锁定鼠标
观察控制台日志：
```
[Global Click] { target: 'CANVAS', inputMode: 'playing', pointerLocked: false }
[Debug] Click detected, requesting game focus
[Debug] requestGameFocus called { ... }
[Debug] Pointer lock result: true/false
```

### 2.3 检查玩家是否可移动
在控制台运行：
```javascript
console.log('移动条件:', {
  inputMode: window.__debugInputState?.()?.mode,
  pointerLocked: window.__debugInputState?.()?.pointerLocked,
  canMove: window.__debugInputState?.()?.mode === 'playing' || window.__debugInputState?.()?.mode === 'scoreboard',
  hasGameplayFocus: !!document.pointerLockElement,
  gameRunning: window.__debugInputState?.()?.gameRunning
});
```

**关键条件**：
- `canMove` 必须为 `true`（inputMode === 'playing'）
- `hasGameplayFocus` 必须为 `true`（document.pointerLockElement 存在）
- `gameRunning` 必须为 `true`

**如果这三个都正确但仍无法移动**，说明问题在 `player.update()` 内部，请运行：
```javascript
// 检查玩家对象
console.log('玩家状态:', {
  playerExists: typeof window.__debugPlayerPosition === 'function',
  playerPosition: window.__debugPlayerPosition?.(),
  playerGrounded: window.__debugInputState?.()?.grounded,
  horizontalSpeed: window.__debugInputState?.()?.horizontalSpeed
});
```

---

## 步骤3：测试退出功能（问题2）

### 3.1 按 ESC 退出
观察控制台日志：
```
[Debug] endGame called { gameRunning: true, inputMode: 'playing' }
[Debug] endGame complete { inputMode: 'menu', gameRunning: false }
```

### 3.2 检查菜单状态
在控制台运行：
```javascript
// 检查菜单CSS
const menu = document.querySelector('.main-menu');
const hud = document.querySelector('.hud');
console.log('UI状态:', {
  menuVisible: menu ? window.getComputedStyle(menu).visibility : null,
  menuPointerEvents: menu ? window.getComputedStyle(menu).pointerEvents : null,
  menuZIndex: menu ? window.getComputedStyle(menu).zIndex : null,
  hudVisible: hud ? window.getComputedStyle(hud).visibility : null,
  hudPointerEvents: hud ? window.getComputedStyle(hud).pointerEvents : null
});
```

**预期输出**：
```
UI状态: {
  menuVisible: 'visible',
  menuPointerEvents: 'auto',
  menuZIndex: '100',
  hudVisible: 'hidden',
  hudPointerEvents: 'none'
}
```

### 3.3 点击任意菜单按钮
观察控制台日志：
```
[Global Click] { target: 'BUTTON', className: '...', inputMode: 'menu', gameRunning: false, pointerLocked: false }
```

**如果点击无反应或卡死**，请检查：
- `target` 是什么元素？
- `pointer-events` CSS值是什么？
- 是否有其他遮挡元素？

运行：
```javascript
// 检查遮挡元素
const buttons = document.querySelectorAll('.main-menu button');
buttons.forEach((btn, i) => {
  const rect = btn.getBoundingClientRect();
  const topElement = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
  console.log(`按钮 ${i}:`, {
    text: btn.textContent,
    pointerEvents: window.getComputedStyle(btn).pointerEvents,
    isVisible: window.getComputedStyle(btn).visibility,
    topElement: topElement?.tagName,
    topElementClass: topElement?.className
  });
});
```

---

## 关键诊断代码

将以下代码粘贴到控制台并回车，然后按步骤操作：

```javascript
// 设置持续监听
let lastState = {};
setInterval(() => {
  const currentState = {
    inputMode: window.__debugInputState?.()?.mode,
    pointerLocked: window.__debugInputState?.()?.pointerLocked,
    gameRunning: window.__debugInputState?.()?.gameRunning,
    pointerLockElement: !!document.pointerLockElement
  };
  if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
    console.log('[状态变化]', currentState);
    lastState = currentState;
  }
}, 100);
console.log('监听已启动，现在开始测试...');
```

---

## 反馈要求

请按照以上步骤测试，并将控制台中所有 `[Debug]`、`[状态变化]`、`[Global Click]` 日志复制给我，特别是：

1. **问题1关键日志**：
   - `roomJoined` 是否触发
   - `Pointer lock result` 是true还是false
   - 指针锁定失败的原因（如果有）

2. **问题2关键日志**：
   - 点击菜单按钮时的 `[Global Click]` 输出
   - 阻挡元素的tagName和className（如果有）

根据这些证据，我将找出真正的根本原因并提供修复。