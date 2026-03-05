# 知乎文章发布系统

基于 `agent-browser` 的知乎专栏文章自动发布脚本。

## 功能

- ✅ 登录态保存（通过 session 管理）
- ✅ 发布文章到知乎专栏
- ✅ 支持添加话题标签
- ✅ 支持 Markdown 格式内容

## 安装依赖

```bash
# 安装 infsh CLI
curl -fsSL https://cli.inference.sh | sh && infsh login
```

## 使用方法

### 1. 登录知乎

```bash
node zhihu-publisher.js login
```

这将打开知乎登录页面，你可以：
- 扫码登录
- 账号密码登录

登录成功后，session 会自动保存。

### 2. 发布文章

准备文章 JSON 文件：

```json
{
  "title": "我的文章标题",
  "content": "文章正文，支持 **Markdown** 格式。\n\n第二段内容...",
  "topics": ["人工智能", "技术分享"]
}
```

发布：

```bash
node zhihu-publisher.js publish article.json
```

### 3. 测试连接

```bash
node zhihu-publisher.js test
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `zhihu-publisher.js` | 主脚本 |
| `zhihu-cookies.json` | Cookies 存储（可选） |
| `.zhihu-session` | Session ID 存储 |
| `topics.json` | 话题标签映射（可选） |

## 话题标签

知乎话题需要在发布时通过 `#` 触发选择器选择。脚本支持自动添加话题：

```json
{
  "topics": ["人工智能", "职场", "职业发展"]
}
```

## 注意事项

1. **登录态有效期**：知乎登录态一般持续较长时间，但如遇过期需重新登录
2. **发布频率**：建议间隔发布，避免触发风控
3. **内容规范**：确保内容符合知乎社区规范
4. **图片上传**：目前脚本暂不支持自动上传图片，需要手动处理

## API 参考

### publishArticle(article)

发布文章到知乎专栏。

```javascript
await publishArticle({
  title: '文章标题',
  content: '文章内容',
  topics: ['话题1', '话题2'],
  cover: '/path/to/cover.jpg' // 可选
});
```

## 相关文档

- [知乎发布方案](../../book-marketing/知乎发布方案.md)
- [agent-browser 技能](~/.agents/skills/agent-browser/SKILL.md)