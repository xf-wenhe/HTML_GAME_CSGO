/**
 * Inferno 全图走查测试
 * 验证所有关键路线的可达性和碰撞
 */
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/Volumes/新/work/html/scripts/screenshots';
const TEST_TIMEOUT = 120000; // 2分钟超时

// Inferno 关键路线测试点
const TEST_ROUTES = {
  // T 出生点 → Banana → B Site
  'T Spawn to Banana': {
    waypoints: [
      { x: -20, z: 0, name: 'T Spawn' },
      { x: -15, z: 10, name: 'Banana Start' },
      { x: -10, z: 20, name: 'Banana Middle' },
      { x: -5, z: 30, name: 'Banana End' },
      { x: 0, z: 40, name: 'B Site Entrance' },
    ]
  },
  // T 出生点 → Mid → A Site
  'T Spawn to A Site via Mid': {
    waypoints: [
      { x: -20, z: 0, name: 'T Spawn' },
      { x: -10, z: -10, name: 'Mid Entrance' },
      { x: 0, z: -20, name: 'Mid' },
      { x: 10, z: -25, name: 'A Site Approach' },
      { x: 20, z: -20, name: 'A Site' },
    ]
  },
  // CT 出生点 → B Site
  'CT Spawn to B Site': {
    waypoints: [
      { x: 30, z: 20, name: 'CT Spawn' },
      { x: 25, z: 25, name: 'B Site Approach' },
      { x: 20, z: 30, name: 'B Site' },
    ]
  },
  // CT 出生点 → A Site
  'CT Spawn to A Site': {
    waypoints: [
      { x: 30, z: 20, name: 'CT Spawn' },
      { x: 25, z: 10, name: 'A Site Approach' },
      { x: 20, z: 0, name: 'A Site' },
    ]
  },
  // Apartments 测试
  'Apartments Route': {
    waypoints: [
      { x: -25, z: -5, name: 'Apartments Start' },
      { x: -30, z: -10, name: 'Apartments Middle' },
      { x: -35, z: -15, name: 'Apartments End' },
    ]
  },
};

interface TestResult {
  route: string;
  success: boolean;
  issues: string[];
  screenshots: string[];
}

async function runWalkTest(page: Page, routeName: string, waypoints: any[]): Promise<TestResult> {
  const issues: string[] = [];
  const screenshots: string[] = [];
  
  console.log(`\n📍 测试路线: ${routeName}`);
  
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    console.log(`  → 移动到 ${wp.name} (${wp.x}, ${wp.z})`);
    
    // 设置玩家位置
    await page.evaluate((pos) => {
      if ((window as any).__debugSetPlayerPosition) {
        (window as any).__debugSetPlayerPosition(pos.x, 2, pos.z);
      }
    }, { x: wp.x, z: wp.z });
    
    await page.waitForTimeout(500);
    
    // 检查玩家位置
    const playerPos = await page.evaluate(() => {
      if ((window as any).__debugGetPlayerPosition) {
        return (window as any).__debugGetPlayerPosition();
      }
      return null;
    });
    
    if (playerPos) {
      const dx = Math.abs(playerPos.x - wp.x);
      const dz = Math.abs(playerPos.z - wp.z);
      
      if (dx > 5 || dz > 5) {
        issues.push(`${wp.name}: 位置偏移过大 (期望: ${wp.x}, ${wp.z}, 实际: ${playerPos.x.toFixed(1)}, ${playerPos.z.toFixed(1)})`);
      }
    }
    
    // 截图
    const screenshotPath = path.join(SCREENSHOT_DIR, `inferno-walktest-${routeName.replace(/\s+/g, '-')}-${i}-${wp.name.replace(/\s+/g, '-')}.png`);
    await page.screenshot({ path: screenshotPath });
    screenshots.push(screenshotPath);
    console.log(`    ✓ 截图已保存: ${path.basename(screenshotPath)}`);
  }
  
  return {
    route: routeName,
    success: issues.length === 0,
    issues,
    screenshots
  };
}

async function main() {
  console.log('🚀 Inferno 全图走查测试开始');
  console.log('================================');
  
  // 确保截图目录存在
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  
  const browser: Browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security']
  });
  
  const page: Page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // 导航到游戏页面
    console.log('\n📡 正在加载游戏页面...');
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
    
    // 选择 Inferno 地图
    console.log('🗺️  选择 Inferno 地图...');
    const infernoButton = await page.$('button:has-text("Inferno")') || 
                          await page.$('[data-map="inferno"]') ||
                          await page.$('text=Inferno');
    
    if (infernoButton) {
      await infernoButton.click();
      await page.waitForTimeout(1000);
    }
    
    // 开始游戏
    console.log('🎮 开始游戏...');
    const startButton = await page.$('button:has-text("开始")') ||
                         await page.$('button:has-text("Start")') ||
                         await page.$('[data-action="start"]');
    
    if (startButton) {
      await startButton.click();
      await page.waitForTimeout(3000);
    }
    
    // 初始截图
    const startScreenshot = path.join(SCREENSHOT_DIR, 'inferno-walktest-game-start.png');
    await page.screenshot({ path: startScreenshot });
    console.log(`📸 初始截图: ${path.basename(startScreenshot)}`);
    
    // 运行所有路线测试
    const results: TestResult[] = [];
    
    for (const [routeName, route] of Object.entries(TEST_ROUTES)) {
      const result = await runWalkTest(page, routeName, route.waypoints);
      results.push(result);
    }
    
    // 汇总结果
    console.log('\n\n📊 测试结果汇总');
    console.log('================================');
    
    let totalIssues = 0;
    for (const result of results) {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      console.log(`${status} ${result.route}`);
      
      if (result.issues.length > 0) {
        for (const issue of result.issues) {
          console.log(`    ⚠️  ${issue}`);
          totalIssues++;
        }
      }
    }
    
    console.log(`\n总计问题数: ${totalIssues}`);
    
    // 保存测试报告
    const reportPath = path.join(SCREENSHOT_DIR, 'inferno-walktest-report.txt');
    const reportContent = `
Inferno 全图走查测试报告
=======================
时间: ${new Date().toISOString()}

测试结果:
${results.map(r => `${r.success ? '✅' : '❌'} ${r.route}`).join('\n')}

问题列表:
${results.flatMap(r => r.issues).map(i => `- ${i}`).join('\n') || '无问题'}

总计问题数: ${totalIssues}
`;
    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n📄 测试报告已保存: ${path.basename(reportPath)}`);
    
    // 保持浏览器打开以便手动检查
    console.log('\n⏳ 浏览器保持打开，按 Ctrl+C 关闭...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ 测试出错:', error);
    
    const errorScreenshot = path.join(SCREENSHOT_DIR, 'inferno-walktest-error.png');
    await page.screenshot({ path: errorScreenshot });
    console.log(`📸 错误截图: ${path.basename(errorScreenshot)}`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
