# 今日头条发布脚本

自动发布文章到今日头条（头条号）的脚本工具。

## 功能特性

- ✅ 支持两种发布模式：API 模式和浏览器自动化模式
- ✅ 自动适配文章格式（标题长度、标签数量等）
- ✅ 支持封面图片上传
- ✅ 发布日志记录
- ✅ 浏览器自动化支持视频录制

## 安装依赖

```bash
# 安装 infsh CLI（浏览器自动化模式必需）
curl -fsSL https://cli.inference.sh | sh
infsh login

# 或使用 API 模式（需要头条开放平台权限）
```

## 配置

1. 复制 `config.json` 并填入你的配置：

```json
{
  "mode": "browser",
  "api": {
    "app_id": "你的AppID",
    "app_secret": "你的AppSecret",
    "access_token": "你的AccessToken"
  },
  "browser": {
    "headless": false,
    "show_cursor": true,
    "record_video": true
  }
}
```

### API 模式

需要申请今日头条开放平台权限：

1. 访问 https://open.toutiao.com/
2. 注册开发者账号
3. 创建应用并获取 App ID 和 App Secret
4. 获取 Access Token

### 浏览器自动化模式（推荐）

无需申请 API 权限，模拟人工操作：

1. 安装 infsh CLI
2. 登录 inference.sh
3. 运行脚本时在弹出的浏览器中登录头条号

## 使用方法

### 基本用法

```bash
# 浏览器模式（推荐）
node toutiao-publisher.js --mode browser --article ./sample-article.json

# API 模式
node toutiao-publisher.js --mode api --article ./sample-article.json
```

### 文章格式

文章使用 JSON 格式：

```json
{
  "title": "文章标题（最多30字）",
  "content": "文章内容（支持HTML格式）",
  "cover": "封面图片路径",
  "covers": ["封面图1", "封面图2", "封面图3"],
  "tags": ["标签1", "标签2", "标签3"],
  "category": "职场"
}
```

### 支持的分类

- 财经、科技、娱乐、体育、汽车、房产
- 教育、时尚、游戏、军事、历史
- 美食、旅游、健康、育儿
- 搞笑、情感、职场

## 文件说明

```
toutiao/
├── toutiao-publisher.js  # 主脚本
├── config.json           # 配置文件
├── sample-article.json   # 示例文章
├── published.json        # 发布日志（自动生成）
├── cookies.json          # 登录Cookie（可选）
└── README.md             # 本文档
```

## 注意事项

1. **API 模式**：需要申请头条开放平台权限，审核周期较长
2. **浏览器模式**：首次使用需要手动登录，之后可以使用保存的 Cookie
3. **发布频率**：建议控制发布频率，避免被判定为垃圾内容
4. **内容审核**：今日头条有内容审核机制，敏感内容会被拦截

## 故障排除

### 浏览器模式无法启动

```bash
# 检查 infsh 是否安装
which infsh

# 重新登录
infsh login
```

### API 模式认证失败

```bash
# 检查配置
cat config.json

# 确保 access_token 有效
```

## 相关链接

- [头条号开放平台](https://open.toutiao.com/)
- [头条号创作平台](https://mp.toutiao.com/)
- [inference.sh 文档](https://inference.sh/docs)

## License

MIT