# 运营系统数据目录

本目录存储运营系统的所有数据文件和脚本。

## 目录结构

```
operation/
├── config.json          # 账号配置（公众号API凭证）
├── schedule.json        # 发布排期
├── articles.json        # 文章状态追踪
├── track_articles.js    # 文章追踪脚本
├── api.js              # 数据API服务
├── analytics/          # 分析数据
│   └── 2026-03.json    # 月度分析
├── revenue/            # 收益数据
│   └── 2026-03.json    # 月度收益
└── inventory/          # 库存数据
    └── books.json      # 书籍库存
```

## 数据文件说明

### config.json - 账号配置
- `accounts`: A/B号配置信息
  - `wechat`: 公众号API凭证 (appId, appSecret, accessToken)
  - `credentials`: 凭证配置状态
- `wechat`: 全局微信配置
  - `apiEnabled`: API是否启用
  - `autoPublish`: 是否自动发布
  - `syncInterval`: 同步间隔

### schedule.json - 发布排期
- `config`: 发布时间配置
- `schedule`: 已排期文章列表
- `pending`: 待排期文章
- `history`: 发布历史
- `stats`: 统计信息

### articles.json - 文章状态
- `articles`: 文章列表
- `statusDefinitions`: 状态定义
- `categoryDefinitions`: 板块定义

状态流转: `IDEA → DRAFT → REVIEW → READY → SCHEDULED → PUBLISHED`

## 脚本使用

### track_articles.js - 文章追踪

```bash
# 查看统计
node track_articles.js stats

# 列出文章
node track_articles.js list
node track_articles.js list READY A

# 添加文章
node track_articles.js add "文章标题" A growth

# 更新状态
node track_articles.js update <id> READY
node track_articles.js update <id> PUBLISHED "新标题"

# 获取下一篇待发布
node track_articles.js next

# 初始化数据文件
node track_articles.js init
```

### api.js - 数据API服务

```bash
# 启动API服务（默认端口3001）
node api.js

# 指定端口
PORT=3002 node api.js

# 导出数据
node api.js export
```

**API接口:**
- `GET /api/dashboard` - 仪表盘聚合数据
- `GET /api/articles` - 文章列表
- `GET /api/schedule` - 发布排期
- `GET /api/revenue` - 收益数据
- `GET /api/analytics` - 分析数据
- `GET /api/inventory` - 库存数据
- `GET /api/config` - 配置信息

## 公众号API接入准备

1. 在 `config.json` 中填写各账号的 `appId` 和 `appSecret`
2. 设置 `wechat.apiEnabled: true`
3. 调用API获取 `accessToken`（有效期2小时）
4. 使用 token 调用公众号接口

**注意事项:**
- accessToken 需要缓存，避免频繁请求
- IP白名单需配置服务器IP
- 测试号可用于开发调试

## 数据同步

levis.html 页面支持从API动态加载数据：
1. 启动 API 服务: `node api.js`
2. 访问页面时会自动请求 `/api/dashboard`
3. 如API未启动，使用页面内静态数据

---
更新时间: 2026-03-05