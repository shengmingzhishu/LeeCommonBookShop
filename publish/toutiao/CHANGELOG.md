# 今日头条发布脚本开发日志

## 2025-03-05 开发记录

### 研究结论

1. **API 模式**
   - 今日头条开放平台（https://open.toutiao.com/）提供文章发布 API
   - 需要申请开发者权限和审核，流程较复杂
   - API 文档：`POST /article/v2/create`
   - 参数：title, content, cover_images, category, tags
   - 适合批量发布和自动化程度高的场景

2. **浏览器自动化模式**（推荐）
   - 使用 infsh agent-browser 或 OpenClaw 内置 browser 工具
   - 无需申请 API 权限
   - 模拟人工操作，更灵活
   - 发布页面：https://mp.toutiao.com/profile_v4/graphic/publish

### 已完成

- ✅ 创建 `/root/.openclaw/workspace/LeeCommonBookShop/publish/toutiao/` 目录
- ✅ 开发 `toutiao-publisher.js` - 完整版脚本（支持 API 和浏览器模式）
- ✅ 开发 `toutiao-simple.js` - 简化版脚本（配合 OpenClaw 使用）
- ✅ 创建 `config.json` - 配置文件模板
- ✅ 创建 `sample-article.json` - 示例文章
- ✅ 创建 `README.md` - 使用文档

### 文件结构

```
publish/toutiao/
├── toutiao-publisher.js  # 主脚本（两种模式）
├── toutiao-simple.js    # 简化版（配合 OpenClaw）
├── config.json          # 配置文件
├── sample-article.json  # 示例文章
├── README.md            # 使用文档
└── CHANGELOG.md         # 本日志
```

### 使用方式

#### 方式一：命令行脚本

```bash
# 浏览器模式（推荐）
node toutiao-publisher.js --mode browser --article ./sample-article.json

# API 模式（需配置）
node toutiao-publisher.js --mode api --article ./sample-article.json
```

#### 方式二：OpenClaw 内置浏览器

在 OpenClaw 中直接使用 browser 工具：

```
"帮我发布一篇文章到今日头条"
```

### 待完善

- [ ] 浏览器模式元素选择器需要根据实际页面调整
- [ ] API 模式需要完善 OAuth 认证流程
- [ ] 添加封面图片上传的完整实现
- [ ] 添加发布状态检测和重试机制
- [ ] 添加 Cookie 持久化存储

### 注意事项

1. 今日头条有内容审核机制
2. 发布频率不宜过高
3. 标题建议 5-30 字
4. 最多 5 个标签
5. 建议使用封面图