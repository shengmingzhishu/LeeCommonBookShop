#!/usr/bin/env node
/**
 * 文章状态追踪脚本
 * 用于追踪和管理文章从选题到发布的完整生命周期
 * 
 * 使用方法:
 *   node track_articles.js [command] [options]
 * 
 * Commands:
 *   list              列出所有文章
 *   add               添加新文章
 *   update <id>       更新文章状态
 *   stats             显示统计信息
 *   next              获取下一篇待发布文章
 *   sync              同步发布状态（需要公众号API配置）
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// 文章状态定义
const STATUS = {
  IDEA: { name: '选题', color: '\x1b[36m', order: 1 },
  DRAFT: { name: '草稿', color: '\x1b[33m', order: 2 },
  REVIEW: { name: '审核中', color: '\x1b[35m', order: 3 },
  READY: { name: '待发布', color: '\x1b[34m', order: 4 },
  SCHEDULED: { name: '已排期', color: '\x1b[36m', order: 5 },
  PUBLISHED: { name: '已发布', color: '\x1b[32m', order: 6 },
  FAILED: { name: '发布失败', color: '\x1b[31m', order: 0 }
};

// 板块定义
const CATEGORIES = {
  career: { name: '职场', account: 'B' },
  growth: { name: '成长', account: 'AB' },
  health: { name: '健康', account: 'A' },
  emotion: { name: '情感', account: 'A' }
};

// 加载数据
function loadJSON(filepath, defaultValue = {}) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error(`加载文件失败: ${filepath}`, e.message);
  }
  return defaultValue;
}

// 保存数据
function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// 加载文章列表
function loadArticles() {
  return loadJSON(ARTICLES_FILE, { articles: [], updated: new Date().toISOString() });
}

// 保存文章列表
function saveArticles(data) {
  data.updated = new Date().toISOString();
  saveJSON(ARTICLES_FILE, data);
}

// 生成文章ID
function generateId() {
  const now = new Date();
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

// 列出文章
function listArticles(filter = {}) {
  const data = loadArticles();
  let articles = data.articles || [];
  
  if (filter.status) {
    articles = articles.filter(a => a.status === filter.status);
  }
  if (filter.account) {
    articles = articles.filter(a => a.account === filter.account);
  }
  if (filter.category) {
    articles = articles.filter(a => a.category === filter.category);
  }
  
  console.log('\n📚 文章列表\n');
  console.log('ID          | 标题               | 账号 | 状态     | 板块   | 更新日期');
  console.log('-'.repeat(75));
  
  articles.forEach(a => {
    const status = STATUS[a.status] || { name: a.status, color: '' };
    const category = CATEGORIES[a.category] || { name: a.category || '-' };
    const title = (a.title || '未命名').substring(0, 18).padEnd(18);
    console.log(
      `${a.id.padEnd(11)} | ${title} | ${a.account || '-'}    | ` +
      `${status.color}${status.name}\x1b[0m`.padEnd(14) +
      ` | ${category.name.padEnd(6)} | ${a.updatedAt?.split('T')[0] || '-'}`
    );
  });
  
  console.log(`\n共 ${articles.length} 篇文章`);
}

// 添加文章
function addArticle(options) {
  const data = loadArticles();
  const article = {
    id: generateId(),
    title: options.title || '',
    account: options.account || 'A',
    category: options.category || 'growth',
    status: options.status || 'IDEA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null,
    publishDate: null,
    wechatMediaId: null,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    tags: options.tags || [],
    notes: options.notes || ''
  };
  
  data.articles.push(article);
  saveArticles(data);
  
  console.log(`\n✅ 已添加文章: ${article.id}`);
  console.log(`   标题: ${article.title || '未命名'}`);
  console.log(`   账号: ${article.account} | 状态: ${STATUS[article.status].name}`);
  
  return article;
}

// 更新文章
function updateArticle(id, updates) {
  const data = loadArticles();
  const index = data.articles.findIndex(a => a.id === id);
  
  if (index === -1) {
    console.error(`❌ 未找到文章: ${id}`);
    return null;
  }
  
  const article = data.articles[index];
  
  // 处理状态变更
  if (updates.status === 'PUBLISHED' && article.status !== 'PUBLISHED') {
    updates.publishedAt = new Date().toISOString();
  }
  
  Object.assign(article, updates, { updatedAt: new Date().toISOString() });
  data.articles[index] = article;
  saveArticles(data);
  
  console.log(`\n✅ 已更新文章: ${id}`);
  return article;
}

// 统计信息
function showStats() {
  const data = loadArticles();
  const articles = data.articles || [];
  const schedule = loadJSON(SCHEDULE_FILE);
  
  console.log('\n📊 文章统计\n');
  
  // 按状态统计
  console.log('按状态:');
  Object.entries(STATUS).forEach(([key, info]) => {
    const count = articles.filter(a => a.status === key).length;
    if (count > 0) {
      console.log(`  ${info.color}${info.name}\x1b[0m: ${count} 篇`);
    }
  });
  
  // 按账号统计
  console.log('\n按账号:');
  ['A', 'B'].forEach(account => {
    const count = articles.filter(a => a.account === account).length;
    const published = articles.filter(a => a.account === account && a.status === 'PUBLISHED').length;
    console.log(`  ${account}号: ${count} 篇 (已发布: ${published})`);
  });
  
  // 按板块统计
  console.log('\n按板块:');
  Object.entries(CATEGORIES).forEach(([key, info]) => {
    const count = articles.filter(a => a.category === key).length;
    if (count > 0) {
      console.log(`  ${info.name}: ${count} 篇`);
    }
  });
  
  // 发布数据
  const published = articles.filter(a => a.status === 'PUBLISHED');
  const totalViews = published.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalLikes = published.reduce((sum, a) => sum + (a.likes || 0), 0);
  
  console.log('\n发布数据:');
  console.log(`  总阅读: ${totalViews}`);
  console.log(`  总点赞: ${totalLikes}`);
  console.log(`  已发布: ${published.length} 篇`);
  
  console.log(`\n最后更新: ${data.updated}`);
}

// 获取下一篇待发布文章
function getNextArticle() {
  const data = loadArticles();
  const articles = data.articles || [];
  
  // 优先级: READY > SCHEDULED > REVIEW > DRAFT
  const priority = ['READY', 'SCHEDULED', 'REVIEW', 'DRAFT'];
  
  for (const status of priority) {
    const article = articles.find(a => a.status === status);
    if (article) {
      console.log(`\n下一篇待发布:`);
      console.log(`  ID: ${article.id}`);
      console.log(`  标题: ${article.title || '未命名'}`);
      console.log(`  账号: ${article.account}号`);
      console.log(`  状态: ${STATUS[article.status].name}`);
      return article;
    }
  }
  
  console.log('\n暂无待发布文章');
  return null;
}

// 初始化文章数据文件
function initArticles() {
  if (!fs.existsSync(ARTICLES_FILE)) {
    const template = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      articles: [],
      statusDefinitions: STATUS,
      categoryDefinitions: CATEGORIES
    };
    saveJSON(ARTICLES_FILE, template);
    console.log('✅ 已创建文章数据文件');
  }
}

// CLI 入口
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'stats';
  
  switch (command) {
    case 'list':
      const filter = {};
      if (args[1]) filter.status = args[1].toUpperCase();
      if (args[2]) filter.account = args[2].toUpperCase();
      listArticles(filter);
      break;
      
    case 'add':
      initArticles();
      addArticle({
        title: args[1] || '',
        account: args[2]?.toUpperCase() || 'A',
        category: args[3] || 'growth',
        status: 'IDEA'
      });
      break;
      
    case 'update':
      if (!args[1]) {
        console.error('用法: node track_articles.js update <id> [status] [title]');
        process.exit(1);
      }
      const updates = {};
      if (args[2]) updates.status = args[2].toUpperCase();
      if (args[3]) updates.title = args.slice(3).join(' ');
      updateArticle(args[1], updates);
      break;
      
    case 'stats':
      showStats();
      break;
      
    case 'next':
      getNextArticle();
      break;
      
    case 'init':
      initArticles();
      console.log('✅ 初始化完成');
      break;
      
    default:
      console.log(`
文章状态追踪脚本

Commands:
  list [status] [account]  列出文章
  add <title> [account] [category]  添加新文章
  update <id> <status> [title]  更新文章
  stats                     显示统计
  next                      获取下一篇待发布
  init                      初始化数据文件

Status: IDEA, DRAFT, REVIEW, READY, SCHEDULED, PUBLISHED, FAILED
Category: career, growth, health, emotion
      `);
  }
}

main();