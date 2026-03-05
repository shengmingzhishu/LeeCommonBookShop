#!/usr/bin/env node
/**
 * 知乎文章发布脚本
 * 
 * 此脚本生成浏览器自动化指令，需要配合以下工具之一使用：
 * 1. OpenClaw browser 工具（推荐）
 * 2. agent-browser (infsh CLI)
 * 3. Playwright 脚本
 * 
 * 功能：
 * - 登录态保存/恢复
 * - 发布文章到专栏
 * - 添加话题标签
 * 
 * 使用方法：
 * node zhihu-publisher.js login              # 生成登录指令
 * node zhihu-publisher.js publish <file>    # 生成发布指令
 * node zhihu-publisher.js script <file>     # 生成 Playwright 脚本
 */

const fs = require('fs');
const path = require('path');

const ZHIHU_WRITE_URL = 'https://zhuanlan.zhihu.com/write';
const ZHIHU_LOGIN_URL = 'https://www.zhihu.com/signin';
const COOKIES_FILE = path.join(__dirname, 'zhihu-cookies.json');

// ==================== 工具函数 ====================

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// ==================== Playwright 脚本生成 ====================

function generatePlaywrightScript(article, isLogin = false) {
  if (isLogin) {
    return `// 知乎登录脚本 - Playwright 版本
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
    console.log('打开知乎写作页面...');
    await page.goto(ZHIHU_WRITE_URL, { waitUntil: 'networkidle' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('signin') || currentUrl.includes('login')) {
      console.log('\\n========================================');
      console.log('请在打开的浏览器中完成登录');
      console.log('支持: 扫码登录 / 账号密码登录');
      console.log('========================================\\n');
      
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      await new Promise(resolve => rl.question('登录完成后按 Enter 继续... ', resolve));
      rl.close();
    }
    
    // 保存 cookies
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log('\\n✓ 登录态已保存到:', COOKIES_FILE);
    console.log('✓ 当前 URL:', page.url());
    
  } catch (error) {
    console.error('错误:', error.message);
    await page.screenshot({ path: path.join(__dirname, 'error-screenshot.png') });
  }
  
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('\\n按 Enter 关闭浏览器... ', resolve));
  rl.close();
  
  await browser.close();
}

main().catch(console.error);
`;
  }

  return `// 知乎文章发布脚本 - Playwright 版本
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

const ARTICLE = ${JSON.stringify(article, null, 2)};

async function main() {
  console.log('启动浏览器...');
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  
  const context = await browser.newContext();
  
  if (fs.existsSync(COOKIES_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
      await context.addCookies(cookies);
      console.log('✓ 已加载保存的登录态');
    } catch (e) {
      console.log('! cookies 文件格式错误');
    }
  }
  
  const page = await context.newPage();
  
  try {
    console.log('打开知乎写作页面...');
    await page.goto(ZHIHU_WRITE_URL, { waitUntil: 'networkidle' });
    
    if (page.url().includes('signin') || page.url().includes('login')) {
      throw new Error('需要登录，请先运行 node zhihu-login.mjs');
    }
    
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
    
    ${article.topics && article.topics.length > 0 ? `
    // 添加话题
    console.log('添加话题:', ARTICLE.topics.join(', '));
    for (const topic of ARTICLE.topics) {
      try {
        const addTopicBtn = page.locator('.TopicSelector-trigger, button:has-text("添加话题")').first();
        if (await addTopicBtn.isVisible({ timeout: 2000 })) {
          await addTopicBtn.click();
          await page.waitForTimeout(500);
          const topicInput = page.locator('input[placeholder*="搜索话题"], input[placeholder*="输入话题"]').first();
          await topicInput.waitFor({ state: 'visible', timeout: 3000 });
          await topicInput.fill(topic);
          await page.waitForTimeout(1000);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
          console.log('  ✓ 添加话题:', topic);
        }
      } catch (e) {
        console.log('  ! 添加话题失败:', topic);
      }
    }
    ` : ''}
    
    // 发布
    console.log('准备发布...');
    await page.screenshot({ path: path.join(__dirname, 'before-publish.png') });
    
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const confirm = await new Promise(resolve => rl.question('\\n确认发布? (y/n): ', resolve));
    rl.close();
    
    if (confirm.toLowerCase() === 'y') {
      const publishBtn = page.locator('button:has-text("发布"), .PublishButton').first();
      await publishBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ 发布完成！');
      console.log('✓ 当前 URL:', page.url());
    }
    
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    
  } catch (error) {
    console.error('错误:', error.message);
    await page.screenshot({ path: path.join(__dirname, 'error-screenshot.png') });
  }
  
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('\\n按 Enter 关闭浏览器... ', resolve));
  rl.close();
  
  await browser.close();
}

main().catch(console.error);
`;
}

// ==================== OpenClaw Browser 工具指令生成 ====================

function generateOpenClawInstructions(article) {
  const instructions = [];
  
  instructions.push({
    step: 1,
    action: 'navigate',
    params: { targetUrl: ZHIHU_WRITE_URL },
    note: '导航到知乎写作页面'
  });
  
  instructions.push({
    step: 2,
    action: 'snapshot',
    params: { refs: 'aria' },
    note: '获取页面元素快照，检查是否需要登录'
  });
  
  instructions.push({
    step: 3,
    action: 'fill',
    params: { 
      selector: 'input[placeholder*="标题"], .TitleInput input',
      text: article.title 
    },
    note: '填写标题'
  });
  
  instructions.push({
    step: 4,
    action: 'fill',
    params: {
      selector: '.WriteIndex-content, [contenteditable="true"]',
      text: article.content
    },
    note: '填写内容'
  });
  
  if (article.topics && article.topics.length > 0) {
    article.topics.forEach((topic, i) => {
      instructions.push({
        step: 5 + i,
        action: 'addTopic',
        params: { topic },
        note: `添加话题: ${topic}`
      });
    });
  }
  
  instructions.push({
    step: instructions.length + 1,
    action: 'click',
    params: { selector: 'button:has-text("发布")' },
    note: '发布文章'
  });
  
  return instructions;
}

// ==================== 主函数 ====================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'login': {
      console.log('\n=== 知乎登录流程 ===\n');
      console.log('方式 1: 使用 Playwright');
      console.log('运行生成的脚本进行交互式登录\n');
      
      const script = generatePlaywrightScript(null);
      const scriptPath = path.join(__dirname, 'zhihu-login.mjs');
      fs.writeFileSync(scriptPath, script);
      console.log(`已生成: ${scriptPath}`);
      console.log('运行: node zhihu-login.mjs\n');
      
      console.log('方式 2: OpenClaw Browser 工具');
      console.log('1. 在 Chrome 中打开 https://www.zhihu.com/signin');
      console.log('2. 点击 OpenClaw 扩展图标附加当前 tab');
      console.log('3. 使用 browser 工具完成登录');
      console.log('4. 导出 cookies 并保存到 zhihu-cookies.json\n');
      break;
    }
      
    case 'publish': {
      const filePath = args[1];
      if (!filePath) {
        console.error('用法: node zhihu-publisher.js publish <article.json>');
        process.exit(1);
      }
      
      const articlePath = path.resolve(filePath);
      if (!fs.existsSync(articlePath)) {
        console.error(`文件不存在: ${articlePath}`);
        process.exit(1);
      }
      
      const article = JSON.parse(fs.readFileSync(articlePath, 'utf-8'));
      
      console.log('\n=== 发布文章 ===\n');
      console.log('标题:', article.title);
      console.log('话题:', article.topics?.join(', ') || '无');
      console.log('');
      
      // 生成 Playwright 脚本
      const script = generatePlaywrightScript(article);
      const scriptPath = path.join(__dirname, 'publish-now.mjs');
      fs.writeFileSync(scriptPath, script);
      console.log(`方式 1: 运行 Playwright 脚本`);
      console.log(`node ${scriptPath}\n`);
      
      // 生成 OpenClaw 指令
      console.log('方式 2: OpenClaw Browser 工具指令:');
      const instructions = generateOpenClawInstructions(article);
      console.log(JSON.stringify(instructions, null, 2));
      console.log('');
      break;
    }
      
    case 'script': {
      const filePath = args[1];
      if (!filePath) {
        // 生成登录脚本
        const script = generatePlaywrightScript(null);
        const scriptPath = path.join(__dirname, 'zhihu-login.mjs');
        fs.writeFileSync(scriptPath, script);
        console.log(`已生成登录脚本: ${scriptPath}`);
        console.log('运行: node zhihu-login.mjs');
      } else {
        const articlePath = path.resolve(filePath);
        if (!fs.existsSync(articlePath)) {
          console.error(`文件不存在: ${articlePath}`);
          process.exit(1);
        }
        const article = JSON.parse(fs.readFileSync(articlePath, 'utf-8'));
        const script = generatePlaywrightScript(article);
        const scriptPath = path.join(__dirname, 'publish-now.mjs');
        fs.writeFileSync(scriptPath, script);
        console.log(`已生成发布脚本: ${scriptPath}`);
        console.log('运行: node publish-now.mjs');
      }
      break;
    }
      
    default:
      console.log(`
知乎文章发布脚本

用法:
  node zhihu-publisher.js login              生成登录脚本/指令
  node zhihu-publisher.js publish <file>     生成发布脚本/指令
  node zhihu-publisher.js script [file]      生成 Playwright 脚本

文章 JSON 格式:
{
  "title": "文章标题",
  "content": "文章内容（支持 Markdown）",
  "topics": ["话题1", "话题2"]
}

输出:
  - Playwright 脚本 (.mjs 文件)
  - OpenClaw Browser 工具指令 (JSON)
`);
  }
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});