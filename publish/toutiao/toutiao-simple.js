#!/usr/bin/env node
/**
 * 今日头条文章发布脚本 - 简化版
 * 使用 OpenClaw 内置的 browser 工具进行自动化
 * 
 * 使用方式：
 *   node toutiao-simple.js --article article.json
 * 
 * 或通过 OpenClaw 直接调用：
 *   在 AI 助手中说："帮我发布一篇文章到今日头条"
 * 
 * @author Levis (AI Assistant)
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
  loginUrl: 'https://sso.toutiao.com/login',
  cookiesPath: path.join(__dirname, 'cookies.json'),
  publishedLog: path.join(__dirname, 'published.json')
};

// 分类映射
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
 * 适配文章格式
 */
function adaptArticle(article) {
  return {
    title: article.title.slice(0, 30),
    content: article.content,
    cover: article.cover || article.covers?.[0] || '',
    tags: (article.tags || []).slice(0, 5),
    category: CATEGORY_MAP[article.category] || article.category || 'news_career'
  };
}

/**
 * 生成浏览器自动化指令
 * 返回可以在 OpenClaw 中执行的步骤
 */
function generatePublishSteps(article) {
  const adapted = adaptArticle(article);
  
  return {
    description: '今日头条文章发布自动化流程',
    article: adapted,
    steps: [
      {
        step: 1,
        action: '打开发布页面',
        tool: 'browser',
        params: {
          action: 'open',
          targetUrl: CONFIG.publishUrl
        }
      },
      {
        step: 2,
        action: '等待页面加载',
        tool: 'browser',
        params: {
          action: 'snapshot'
        },
        note: '检查是否需要登录'
      },
      {
        step: 3,
        action: '填写标题',
        tool: 'browser',
        params: {
          action: 'act',
          request: {
            kind: 'type',
            text: adapted.title
          }
        },
        note: '需要找到标题输入框的元素引用'
      },
      {
        step: 4,
        action: '填写内容',
        tool: 'browser',
        params: {
          action: 'act',
          request: {
            kind: 'type',
            text: adapted.content
          }
        },
        note: '可能需要点击编辑器区域'
      },
      {
        step: 5,
        action: '上传封面',
        condition: adapted.cover && fs.existsSync(adapted.cover),
        tool: 'browser',
        params: {
          action: 'upload',
          paths: [path.resolve(adapted.cover)]
        }
      },
      {
        step: 6,
        action: '选择分类',
        tool: 'browser',
        params: {
          action: 'click'
        },
        note: '点击分类下拉框选择对应分类'
      },
      {
        step: 7,
        action: '添加标签',
        condition: adapted.tags.length > 0,
        loop: true,
        tool: 'browser',
        params: {
          action: 'act',
          request: {
            kind: 'type'
          }
        },
        tags: adapted.tags
      },
      {
        step: 8,
        action: '点击发布',
        tool: 'browser',
        params: {
          action: 'act',
          request: {
            kind: 'click'
          }
        }
      },
      {
        step: 9,
        action: '确认发布成功',
        tool: 'browser',
        params: {
          action: 'snapshot'
        }
      }
    ],
    
    // 登录流程（如果需要）
    loginSteps: [
      {
        step: 1,
        action: '打开登录页',
        tool: 'browser',
        params: {
          action: 'navigate',
          targetUrl: CONFIG.loginUrl
        }
      },
      {
        step: 2,
        action: '用户手动登录',
        note: '等待用户在浏览器中完成登录操作'
      },
      {
        step: 3,
        action: '保存Cookie',
        tool: 'browser',
        note: '登录成功后保存Cookie以便下次使用'
      }
    ]
  };
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  let articlePath = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--article' || args[i] === '-a') {
      articlePath = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
今日头条文章发布脚本 - 简化版

使用方式:
  node toutiao-simple.js --article <path>

参数:
  --article, -a  文章JSON文件路径
  --help, -h     显示帮助信息

注意:
  此脚本生成自动化步骤，需要配合 OpenClaw 的 browser 工具使用。
  建议直接在 OpenClaw AI 助手中说："帮我发布一篇文章到今日头条"

示例:
  node toutiao-simple.js --article ./sample-article.json
`);
      process.exit(0);
    }
  }
  
  if (!articlePath) {
    console.error('错误: 请指定文章文件路径 (--article)');
    process.exit(1);
  }
  
  if (!fs.existsSync(articlePath)) {
    console.error(`错误: 文章文件不存在: ${articlePath}`);
    process.exit(1);
  }
  
  const article = JSON.parse(fs.readFileSync(articlePath, 'utf-8'));
  console.log(`\n📝 文章: ${article.title}`);
  
  const steps = generatePublishSteps(article);
  console.log('\n📋 自动化步骤:');
  console.log(JSON.stringify(steps, null, 2));
  
  // 输出给 OpenClaw 使用的指令
  console.log('\n🤖 OpenClaw 指令:');
  console.log('---');
  console.log(`请在 OpenClaw 中执行以下操作：`);
  console.log(`1. 使用 browser 工具打开: ${CONFIG.publishUrl}`);
  console.log(`2. 如果需要登录，等待用户登录`);
  console.log(`3. 填写标题: ${steps.article.title}`);
  console.log(`4. 填写内容（长度: ${steps.article.content.length} 字符）`);
  if (steps.article.cover) console.log(`5. 上传封面: ${steps.article.cover}`);
  console.log(`6. 选择分类: ${article.category || '职场'}`);
  if (steps.article.tags.length > 0) console.log(`7. 添加标签: ${steps.article.tags.join(', ')}`);
  console.log(`8. 点击发布按钮`);
  console.log('---\n');
}

module.exports = {
  generatePublishSteps,
  adaptArticle,
  CATEGORY_MAP,
  CONFIG
};

if (require.main === module) {
  main().catch(console.error);
}