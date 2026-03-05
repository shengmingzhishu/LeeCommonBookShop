// 知乎文章发布脚本 - Playwright 版本
// 运行: node publish-now.mjs

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIES_FILE = path.join(__dirname, 'zhihu-cookies.json');
const ZHIHU_WRITE_URL = 'https://zhuanlan.zhihu.com/write';

// 文章内容
const ARTICLE = {
  title: "测试文章：自动化发布系统搭建",
  content: `## 前言

这是一篇测试文章，用于验证知乎自动发布系统。

## 正文

通过 agent-browser 技术，我们可以实现浏览器自动化，从而自动发布文章到各个平台。

### 主要优势

1. **效率提升**：减少重复性工作
2. **格式统一**：保证内容一致性
3. **批量操作**：支持多平台同步

## 总结

自动化发布系统可以帮助创作者更专注于内容创作本身。

---

*本文由自动发布系统生成*`,
  topics: ["自动化", "效率工具"]
};

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
      console.log('! cookies 文件格式错误');
    }
  } else {
    console.log('! 未找到 cookies 文件，请先运行登录脚本');
  }
  
  const page = await context.newPage();
  
  try {
    // 导航到写作页面
    console.log('打开知乎写作页面...');
    await page.goto(ZHIHU_WRITE_URL, { waitUntil: 'networkidle' });
    
    // 检查是否需要登录
    const currentUrl = page.url();
    if (currentUrl.includes('signin') || currentUrl.includes('login')) {
      console.log('\n需要登录！请先运行: node zhihu-login.mjs');
      throw new Error('需要登录');
    }
    
    // 等待编辑器加载
    console.log('等待编辑器加载...');
    await page.waitForSelector('.WriteIndex-content, [contenteditable="true"], .TitleInput', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // 填写标题
    console.log('填写标题:', ARTICLE.title);
    const titleInput = page.locator('input[placeholder*="标题"], .TitleInput input').first();
    await titleInput.click();
    await titleInput.fill(ARTICLE.title);
    await page.waitForTimeout(500);
    
    // 填写内容
    console.log('填写内容...');
    const contentEditor = page.locator('.WriteIndex-content, .public-DraftEditor-content').first();
    await contentEditor.click();
    await contentEditor.fill(ARTICLE.content);
    await page.waitForTimeout(500);
    
    // 添加话题
    if (ARTICLE.topics && ARTICLE.topics.length > 0) {
      console.log('添加话题:', ARTICLE.topics.join(', '));
      
      for (const topic of ARTICLE.topics) {
        try {
          // 查找并点击添加话题按钮
          const addTopicBtn = page.locator('.TopicSelector-trigger, button:has-text("添加话题"), .TopicSelectButton').first();
          
          if (await addTopicBtn.isVisible({ timeout: 2000 })) {
            await addTopicBtn.click();
            await page.waitForTimeout(500);
            
            // 等待话题输入框出现
            const topicInput = page.locator('input[placeholder*="搜索话题"], input[placeholder*="输入话题"]').first();
            await topicInput.waitFor({ state: 'visible', timeout: 3000 });
            await topicInput.fill(topic);
            await page.waitForTimeout(1000);
            
            // 选择第一个匹配项
            await page.keyboard.press('Enter');
            await page.waitForTimeout(300);
            
            console.log(`  ✓ 添加话题: ${topic}`);
          }
        } catch (e) {
          console.log(`  ! 添加话题失败: ${topic} - ${e.message}`);
        }
      }
    }
    
    // 发布文章
    console.log('点击发布按钮...');
    const publishBtn = page.locator('button:has-text("发布"), .PublishButton').first();
    
    // 先截图确认内容
    await page.screenshot({ path: path.join(__dirname, 'before-publish.png') });
    console.log('✓ 发布前截图已保存');
    
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const confirm = await new Promise(resolve => rl.question('\n确认发布? (y/n): ', resolve));
    rl.close();
    
    if (confirm.toLowerCase() === 'y') {
      await publishBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ 发布完成！');
      console.log('✓ 当前 URL:', page.url());
    } else {
      console.log('已取消发布');
    }
    
    // 保存 cookies
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    
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