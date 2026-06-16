// 浏览器控制台诊断脚本
// 在浏览器中打开 http://localhost:5173，按 F12 打开控制台，粘贴此脚本并回车

console.log('=== 开始诊断 ===');

// 1. 检查当前状态
console.log('1. 当前状态:');
console.log('  inputMode:', window.__debugInputState?.()?.mode);
console.log('  pointerLocked:', window.__debugInputState?.()?.pointerLocked);
console.log('  gameRunning:', window.__debugInputState?.()?.gameRunning);
console.log('  pointerLockElement:', document.pointerLockElement?.tagName);

// 2. 检查 HUD 和菜单的CSS
console.log('\n2. UI元素状态:');
const hud = document.querySelector('.hud');
const menu = document.querySelector('.main-menu');
console.log('  HUD visibility:', hud ? window.getComputedStyle(hud).visibility : 'N/A');
console.log('  HUD pointer-events:', hud ? window.getComputedStyle(hud).pointerEvents : 'N/A');
console.log('  Menu visibility:', menu ? window.getComputedStyle(menu).visibility : 'N/A');
console.log('  Menu pointer-events:', menu ? window.getComputedStyle(menu).pointerEvents : 'N/A');
console.log('  Menu z-index:', menu ? window.getComputedStyle(menu).zIndex : 'N/A');

// 3. 监听全局点击事件
console.log('\n3. 设置全局点击监听器来诊断问题:');
let clickCount = 0;
document.addEventListener('click', (e) => {
  clickCount++;
  console.log(`  [全局点击 ${clickCount}] target:`, e.target.tagName, e.target.className);
  console.log('    pointer-events:', window.getComputedStyle(e.target).pointerEvents);
  console.log('    z-index:', window.getComputedStyle(e.target).zIndex);
}, true);

console.log('\n=== 诊断脚本已加载 ===');
console.log('现在请按以下步骤操作，观察控制台输出:');
console.log('1. 点击"团队死斗"按钮');
console.log('2. 等待连接成功后，点击画布锁定鼠标');
console.log('3. 尝试移动鼠标和按键');
console.log('4. 按 ESC 退出');
console.log('5. 尝试点击主菜单按钮');
console.log('\n如果点击无反应，请查看上面打印的点击事件的 target 信息');
