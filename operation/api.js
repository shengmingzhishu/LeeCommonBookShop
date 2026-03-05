/**
 * 运营数据 API 服务
 * 提供文章、排期、收益等数据的查询和更新接口
 * 
 * 使用方法:
 *   node api.js              启动HTTP服务 (默认端口3001)
 *   node api.js --port=3002  指定端口
 *   node api.js export       导出所有数据为JSON
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname;
const PORT = process.env.PORT || 3001;

// 数据文件路径
const FILES = {
  articles: path.join(DATA_DIR, 'articles.json'),
  schedule: path.join(DATA_DIR, 'schedule.json'),
  config: path.join(DATA_DIR, 'config.json'),
  revenue: path.join(DATA_DIR, 'revenue', '2026-03.json'),
  analytics: path.join(DATA_DIR, 'analytics', '2026-03.json'),
  inventory: path.join(DATA_DIR, 'inventory', 'books.json')
};

// 加载JSON文件
function loadJSON(filepath, defaultValue = null) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading ${filepath}:`, e.message);
  }
  return defaultValue;
}

// 保存JSON文件
function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// 聚合统计数据
function getDashboardData() {
  const articles = loadJSON(FILES.articles, { articles: [] });
  const schedule = loadJSON(FILES.schedule, { schedule: [], stats: {} });
  const revenue = loadJSON(FILES.revenue, { summary: {}, daily: [] });
  const analytics = loadJSON(FILES.analytics, { accounts: {} });
  const inventory = loadJSON(FILES.inventory, { books: [] });
  const config = loadJSON(FILES.config, { accounts: {} });
  
  const articleList = articles.articles || [];
  
  // 统计文章数据
  const published = articleList.filter(a => a.status === 'PUBLISHED');
  const totalViews = published.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalLikes = published.reduce((sum, a) => sum + (a.likes || 0), 0);
  
  // 按账号统计
  const accountA = {
    articles: articleList.filter(a => a.account === 'A' && a.status === 'PUBLISHED').length,
    views: published.filter(a => a.account === 'A').reduce((sum, a) => sum + (a.views || 0), 0),
    followers: analytics.accounts?.A?.followers_end || 0,
    sales: revenue.daily?.filter(d => d.account === 'A').reduce((sum, d) => sum + (d.sales || 0), 0) || 0,
    progress: {
      current: articleList.filter(a => a.account === 'A').length,
      total: config.accounts?.A?.targetArticles || 50
    }
  };
  
  const accountB = {
    articles: articleList.filter(a => a.account === 'B' && a.status === 'PUBLISHED').length,
    views: published.filter(a => a.account === 'B').reduce((sum, a) => sum + (a.views || 0), 0),
    followers: analytics.accounts?.B?.followers_end || 0,
    progress: {
      current: articleList.filter(a => a.account === 'B').length,
      total: config.accounts?.B?.targetArticles || 50
    }
  };
  
  return {
    lastUpdate: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' (UTC)',
    overview: {
      totalArticles: published.length,
      totalViews: totalViews,
      totalSales: revenue.summary?.total_sales || 0,
      totalRevenue: revenue.summary?.total_revenue || 0
    },
    accountA,
    accountB,
    schedule: {
      pending: (schedule.pending || []).length,
      thisMonth: schedule.stats?.thisMonth || 0
    },
    recentArticles: articleList
      .filter(a => a.status !== 'IDEA')
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        account: a.account,
        status: a.status,
        views: a.views,
        updatedAt: a.updatedAt
      }))
  };
}

// 简易HTTP服务
function startServer() {
  const http = require('http');
  
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    try {
      let data;
      
      switch (url.pathname) {
        case '/api/dashboard':
          data = getDashboardData();
          break;
        case '/api/articles':
          const articles = loadJSON(FILES.articles, { articles: [] });
          data = articles;
          break;
        case '/api/schedule':
          data = loadJSON(FILES.schedule, {});
          break;
        case '/api/revenue':
          data = loadJSON(FILES.revenue, {});
          break;
        case '/api/analytics':
          data = loadJSON(FILES.analytics, {});
          break;
        case '/api/inventory':
          data = loadJSON(FILES.inventory, {});
          break;
        case '/api/config':
          data = loadJSON(FILES.config, {});
          break;
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data, null, 2));
      
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  
  server.listen(PORT, () => {
    console.log(`运营数据API服务启动: http://localhost:${PORT}`);
    console.log('\n可用接口:');
    console.log('  GET /api/dashboard  - 仪表盘数据');
    console.log('  GET /api/articles  - 文章列表');
    console.log('  GET /api/schedule  - 发布排期');
    console.log('  GET /api/revenue   - 收益数据');
    console.log('  GET /api/analytics - 分析数据');
    console.log('  GET /api/inventory - 库存数据');
    console.log('  GET /api/config    - 配置信息');
  });
}

// 导出数据
function exportData() {
  const data = getDashboardData();
  console.log(JSON.stringify(data, null, 2));
}

// CLI
if (process.argv[2] === 'export') {
  exportData();
} else {
  startServer();
}

// 导出函数供其他模块使用
module.exports = { getDashboardData, loadJSON, saveJSON };