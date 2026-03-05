// 知乎登录脚本 - Playwright 版本
// 运行: node zhihu-login.mjs

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIES_FILE = path.join(__dirname, 'zhihu-cookies.json');
const ZHIHU_WRITE_URL = 'https://zhuanlan.zhihu.com/write';

async function main() {
  console.log('启动浏览器...');
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  
  const context = await browser.newContext();
  
  // 加载已保存的 cookies
  if (fs.existsSync(COOKIES_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
      await context.addCookies(cookies);
      console.log('✓ 已加载保存的登录态');
    } catch (e) {
      console.log('! cookies 文件格式错误，将重新登录');
    }
  }
  
  const page = await context.newPage();
  
  try {
    // 导航到写作页面
    console.log('打开知乎写作页面...');
    await page.goto(ZHIHU_WRITE_URL, { waitUntil: 'networkidle' });
    
    // 检查是否需要登录
    const currentUrl = page.url();
    if (currentUrl.includes('signin') || currentUrl.includes('login')) {
      console.log('\n========================================');
      console.log('请在打开的浏览器中完成登录');
      console.log('支持: 扫码登录 / 账号密码登录');
      console.log('========================================\n');
      
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      await new Promise(resolve => rl.question('登录完成后按 Enter 继续... ', resolve));
      rl.close();
      
      // 等待跳转
      try {
        await page.waitForURL('**/zhuanlan.zhihu.com/**', { timeout: 30000 });
      } catch (e) {
        // 可能已经在正确页面
      }
    }
    
    // 保存 cookies
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log(`\n✓ 登录态已保存到: ${COOKIES_FILE}`);
    console.log(`✓ 当前 URL: ${page.url()}`);
    
  } catch (error) {
    console.error('错误:', error.message);
    await page.screenshot({ path: path.join(__dirname, 'error-screenshot.png') });
    console.log('! 错误截图已保存');
  }
  
  // 保持浏览器打开
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('\n按 Enter 关闭浏览器... ', resolve));
  rl.close();
  
  await browser.close();
}

main().catch(console.error);