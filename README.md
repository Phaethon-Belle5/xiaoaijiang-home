# 伶俜 | 幻想之境

小爱酱的个人主页 —— 一个自留地式的个人空间：**星界暗底 + 毛玻璃卡片 + 星芒金饰**，单文件 HTML 部署于 Cloudflare Pages。

> 线上访问：[home.xiaoaijiang.cloud](https://home.xiaoaijiang.cloud)

## 特性

- **单文件 SPA**：原生 HTML/CSS/JS（无构建、无框架），5 视图 + hash 路由（首页 / 内容 / 说说 / 映像馆 / 联系）
- **双主题**：暗色星界底 / 浅色暖纸感，一键切换
- **毛玻璃设计语言**：玻璃卡片 + 星芒金唯一 accent + Cinzel 英文标题（已自托管，国内可加载）
- **页内管理面板**：密码鉴权后直接编辑资料、壁纸、音乐、说说、作品、照片、轮播文案，无需独立后台
- **离线优先**：IndexedDB 本地缓存 + Cloudflare Worker/KV 云端同步，断网也能看
- **内容系统**：网易云歌单播放（Meting API）、ECharts 中国地图相册、说说 + GitHub 登录评论、桌面宠物、自定义光标
- **可访问性**：`prefers-reduced-motion` 全程降级、skip-link、键盘导航、暗色模式

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 单文件 `index.html`（原生 HTML/CSS/JS） |
| 托管 | Cloudflare Pages（`home.xiaoaijiang.cloud`） |
| 后端 | Cloudflare Worker + KV（`/api/*`：登录、数据读写、评论 OAuth） |
| 存储 | Cloudflare R2（照片、壁纸视频）、IndexedDB（本地缓存） |
| 依赖 | ECharts（懒加载）、Meting API（网易云歌曲）、Cinzel（自托管字体） |

## 本地开发

```bash
# 直接打开即可（纯静态，无需构建）
python -m http.server 8080
# 或任意静态服务器
```

编辑 `index.html` 即可；设计规范见 [`DESIGN.md`](DESIGN.md)。

## 目录结构

```
index.html          # 全部页面、样式与逻辑（单文件）
assets/             # 图片、字体、桌宠动图、地图数据
_headers            # Cloudflare Pages 响应头
DESIGN.md           # 设计系统文档
PRODUCT.md          # 产品定位文档
```

## 管理后台

页面左下角齿轮图标 → 输入密码（Worker `/api/login` 校验，24h token 存 sessionStorage）。

## 许可证

[MIT](LICENSE)
