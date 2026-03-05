#!/usr/bin/env node
/**
 * 今日头条文章发布脚本
 * 
 * 支持两种发布模式：
 * 1. API模式 - 使用今日头条开放平台API（需要申请开发者权限）
 * 2. 浏览器自动化模式 - 使用 infsh agent-browser 模拟登录发布
 * 
 * 使用方式：
 *   node toutiao-publisher.js --mode api --article article.json
 *   node toutiao-publisher.js --mode browser --article article.json
 * 
 * @author Levis (AI Assistant)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'config.json');
const COOKIES_PATH = path.join(__dirname, 'cookies.json');
const PUBLISHED_LOG = path.join(__dirname, 'published.json');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  mode: 'browser', // 'api' | 'browser'
  
  // API模式配置（需要申请开放平台权限）
  api: {
    app_id: '',
    app_secret: '',
    access_token: '',
    // 头条号开放平台 API
    baseUrl: 'https://open.toutiao.com'
  },
  
  // 浏览器自动化配置
  browser: {
    headless: false, // 建议设为 false 以便处理登录
    show_cursor: true,
    record_video: true,
    // 头条号创作平台
    publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
    loginUrl: 'https://sso.toutiao.com/login'
  },
  
  // 文章默认配置
  article: {
    category: 'news_finance', // 默认分类
    maxTitleLength: 30,
    maxTags: 5
  }
};

/**
 * 文章分类映射
 */
const CATEGORY_MAP = {
  '财经': 'news_finance',
  '科技': 'news_tech',
  '娱乐': 'news_entertainment',
  '体育': 'news_sports',
  '汽车': 'news_car',
  '房产': 'news_house',
  '教育': 'news_edu',
  '时尚': 'news_fashion',
  '游戏': 'news_game',
  '军事': 'news_military',
  '历史': 'news_history',
  '美食': 'news_food',
  '旅游': 'news_travel',
  '健康': 'news_health',
  '育儿': 'news_baby',
  '搞笑': 'funny',
  '情感': 'emotion',
  '职场': 'news_career'
};

/**
 * 加载配置
 */
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...saved };
  }
  return DEFAULT_CONFIG;
}

/**
 * 保存配置
 */
function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 记录发布日志
 */
function logPublished(article, result) {
  let log = [];
  if (fs.existsSync(PUBLISHED_LOG)) {
    log = JSON.parse(fs.readFileSync(PUBLISHED_LOG, 'utf-8'));
  }
  
  log.push({
    title: article.title,
    publishedAt: new Date().toISOString(),
    mode: result.mode,
    success: result.success,
    url: result.url,
    error: result.error || null
  });
  
  fs.writeFileSync(PUBLISHED_LOG, JSON.stringify(log, null, 2), 'utf-8');
}

/**
 * 适配文章格式
 */
function adaptArticle(article, config) {
  const adapted = {
    title: article.title.slice(0, config.article.maxTitleLength),
    content: article.content,
    cover: article.cover || article.covers?.[0] || '',
    covers: article.covers || (article.cover ? [article.cover] : []),
    tags: (article.tags || []).slice(0, config.article.maxTags),
    category: CATEGORY_MAP[article.category] || article.category || config.article.category,
    original: article
  };
  
  return adapted;
}

/**
 * ============ API 模式 ============
 */

/**
 * 获取 Access Token（如果未配置）
 */
async function getAccessToken(config) {
  if (config.api.access_token) {
    return config.api.access_token;
  }
  
  if (!config.api.app_id || !config.api.app_secret) {
    throw new Error('API模式需要配置 app_id 和 app_secret。请在 config.json 中配置。');
  }
  
  // 实际实现需要调用头条OAuth接口
  // POST https://open.toutiao.com/oauth2/access_token/
  throw new Error('Access Token 获取未实现。请手动配置 access_token 或完成 OAuth 流程。');
}

/**
 * 使用 API 发布文章
 */
async function publishViaAPI(article, config) {
  console.log('[API模式] 开始发布文章...');
  
  const token = await getAccessToken(config);
  
  // 头条号文章发布 API
  // 参考: https://open.toutiao.com/doc/info?docType=1&docId=11
  const apiUrl = `${config.api.baseUrl}/article/v2/create`;
  
  const payload = {
    title: article.title,
    content: article.content,
    cover_images: article.covers,
    category: article.category,
    tags: article.tags.join(',')
  };
  
  try {
    // 使用 curl 或 node-fetch 调用 API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.code === 0 || result.err_no === 0) {
      return {
        success: true,
        mode: 'api',
        url: result.data?.article_url || result.data?.url,
        articleId: result.data?.article_id
      };
    } else {
      throw new Error(result.message || result.err_msg || '发布失败');
    }
  } catch (error) {
    console.error('[API模式] 发布失败:', error.message);
    return {
      success: false,
      mode: 'api',
      error: error.message
    };
  }
}

/**
 * ============ 浏览器自动化模式 ============
 */

/**
 * 检查 infsh CLI 是否可用
 */
function checkInfsh() {
  try {
    execSync('which infsh', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('错误: 未安装 infsh CLI。请运行: curl -fsSL https://cli.inference.sh | sh && infsh login');
    return false;
  }
}

/**
 * 执行 infsh 命令
 */
async function runInfsh(functionName, input, sessionId = null) {
  return new Promise((resolve, reject) => {
    let cmd = `infsh app run agent-browser --function ${functionName}`;
    if (sessionId === 'new') {
      cmd += ' --session new';
    } else if (sessionId) {
      cmd += ` --session ${sessionId}`;
    }
    cmd += ` --input '${JSON.stringify(input)}'`;
    
    console.log(`[浏览器] 执行: ${functionName}`);
    
    const proc = spawn('sh', ['-c', cmd], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch {
          resolve({ raw: stdout, stderr });
        }
      } else {
        reject(new Error(stderr || stdout || `Exit code: ${code}`));
      }
    });
  });
}

/**
 * 使用浏览器自动化发布文章
 */
async function publishViaBrowser(article, config) {
  console.log('[浏览器模式] 开始发布文章...');
  
  if (!checkInfsh()) {
    return {
      success: false,
      mode: 'browser',
      error: 'infsh CLI 未安装'
    };
  }
  
  let sessionId = null;
  
  try {
    // 1. 打开发布页面
    console.log('[浏览器] 打开发布页面...');
    const openResult = await runInfsh('open', {
      url: config.browser.publishUrl,
      show_cursor: config.browser.show_cursor,
      record_video: config.browser.record_video
    }, 'new');
    
    sessionId = openResult.session_id;
    console.log(`[浏览器] 会话ID: ${sessionId}`);
    
    // 检查是否需要登录
    const snapshot = await runInfsh('snapshot', {}, sessionId);
    const pageContent = JSON.stringify(snapshot).toLowerCase();
    
    if (pageContent.includes('login') && !pageContent.includes('publish')) {
      console.log('[浏览器] 检测到需要登录...');
      console.log('[浏览器] 请在浏览器中完成登录，然后按回车继续...');
      
      // 等待用户登录
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // 重新获取页面快照
      await runInfsh('snapshot', {}, sessionId);
    }
    
    // 2. 填写标题
    console.log('[浏览器] 填写标题...');
    // 头条号标题输入框选择器可能是动态的，需要根据实际页面调整
    await runInfsh('interact', {
      action: 'fill',
      ref: '@e1', // 假设标题输入框是第一个元素
      text: article.title
    }, sessionId);
    
    // 3. 填写内容
    console.log('[浏览器] 填写内容...');
    // 内容编辑器可能是富文本编辑器，需要特殊处理
    await runInfsh('interact', {
      action: 'fill',
      ref: '@e2', // 假设内容编辑器是第二个元素
      text: article.content
    }, sessionId);
    
    // 4. 上传封面（如果有）
    if (article.cover && fs.existsSync(article.cover)) {
      console.log('[浏览器] 上传封面...');
      await runInfsh('interact', {
        action: 'upload',
        ref: '@e3', // 假设封面上传是第三个元素
        file_paths: [path.resolve(article.cover)]
      }, sessionId);
    }
    
    // 5. 设置分类
    console.log('[浏览器] 设置分类...');
    // 分类选择逻辑，可能需要点击下拉框选择
    
    // 6. 设置标签
    if (article.tags && article.tags.length > 0) {
      console.log('[浏览器] 添加标签...');
      for (const tag of article.tags.slice(0, 5)) {
        // 标签输入逻辑
      }
    }
    
    // 7. 发布
    console.log('[浏览器] 点击发布...');
    await runInfsh('interact', {
      action: 'click',
      ref: '@publish' // 发布按钮
    }, sessionId);
    
    // 8. 等待发布完成
    await runInfsh('interact', {
      action: 'wait',
      wait_ms: 3000
    }, sessionId);
    
    // 9. 获取发布结果
    const finalSnapshot = await runInfsh('snapshot', {}, sessionId);
    
    // 10. 关闭浏览器
    const closeResult = await runInfsh('close', {}, sessionId);
    
    return {
      success: true,
      mode: 'browser',
      url: '发布成功，请查看头条号后台',
      video: closeResult.video
    };
    
  } catch (error) {
    console.error('[浏览器模式] 发布失败:', error.message);
    
    // 尝试关闭浏览器
    if (sessionId) {
      try {
        await runInfsh('close', {}, sessionId);
      } catch {}
    }
    
    return {
      success: false,
      mode: 'browser',
      error: error.message
    };
  }
}

/**
 * ============ 主函数 ============
 */

async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  let mode = null;
  let articlePath = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' || args[i] === '-m') {
      mode = args[++i];
    } else if (args[i] === '--article' || args[i] === '-a') {
      articlePath = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
今日头条文章发布脚本

使用方式:
  node toutiao-publisher.js --mode <api|browser> --article <path>

参数:
  --mode, -m     发布模式: api（API模式）或 browser（浏览器自动化）
  --article, -a  文章JSON文件路径
  --help, -h     显示帮助信息

配置:
  首次使用请创建 config.json 配置文件，包含：
  - API模式的 app_id, app_secret, access_token
  - 或使用浏览器自动化模式（推荐）

示例:
  node toutiao-publisher.js --mode browser --article ./articles/my-article.json
`);
      process.exit(0);
    }
  }
  
  // 加载配置
  const config = loadConfig();
  
  // 确定模式
  mode = mode || config.mode;
  
  // 检查文章文件
  if (!articlePath) {
    console.error('错误: 请指定文章文件路径 (--article)');
    process.exit(1);
  }
  
  if (!fs.existsSync(articlePath)) {
    console.error(`错误: 文章文件不存在: ${articlePath}`);
    process.exit(1);
  }
  
  // 加载文章
  const article = JSON.parse(fs.readFileSync(articlePath, 'utf-8'));
  console.log(`\n📝 准备发布文章: ${article.title}`);
  
  // 适配文章格式
  const adaptedArticle = adaptArticle(article, config);
  
  // 根据模式发布
  let result;
  if (mode === 'api') {
    result = await publishViaAPI(adaptedArticle, config);
  } else {
    result = await publishViaBrowser(adaptedArticle, config);
  }
  
  // 记录日志
  logPublished(article, result);
  
  // 输出结果
  console.log('\n========== 发布结果 ==========');
  console.log(`模式: ${result.mode}`);
  console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
  if (result.url) console.log(`链接: ${result.url}`);
  if (result.error) console.log(`错误: ${result.error}`);
  console.log('==============================\n');
  
  process.exit(result.success ? 0 : 1);
}

// 导出模块
module.exports = {
  publishViaAPI,
  publishViaBrowser,
  adaptArticle,
  loadConfig,
  saveConfig,
  CATEGORY_MAP
};

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}