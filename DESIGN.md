---
name: 小爱酱 | 幻想之境
description: 星界暗底上的玻璃魔法图书馆 — 个人主页设计系统（SPA 5 视图 + 双主题 + 毛玻璃卡片）
colors:
  void: "#0B0E14"
  astral: "#11162A"
  astral-elevated: "#181E38"
  astral-surface: "#1C2342"
  gold: "#D4A843"
  gold-bright: "#E8C456"
  gold-pale: "#B8943A"
  magic: "#9075D9"
  crimson: "#A82D3F"
  crimson-hover: "#C23A4F"
  text-primary: "#E8E2D9"
  text-secondary: "#A09888"
  text-muted: "#817769"
  glass-bg: "rgba(17,22,42,0.75)"
  glass-border: "rgba(255,255,255,0.06)"
  surface-border: "rgba(255,255,255,0.06)"
  surface-border-strong: "rgba(255,255,255,0.1)"
  gold-glow: "rgba(212,168,67,0.25)"
  magic-glow: "rgba(144,117,217,0.2)"
  wf-canvas: "#0B0E14"
  wf-ink: "#F2E8D5"
  wf-ink-strong: "#FFF6E8"
  wf-body: "#A09888"
  wf-mute: "#6B6458"
  wf-purple: "#9075D9"
  memo-bg: "#FDF6B2"
light-theme:
  void: "#F5F0E8"
  astral: "#FFFFFF"
  astral-elevated: "#FFFFFF"
  astral-surface: "#F2E8D5"
  text-primary: "#1C2342"
  text-secondary: "#5C4E3A"
  text-muted: "#6B5D49"
  glass-bg: "rgba(255,255,255,0.55)"
  glass-border: "rgba(0,0,0,0.08)"
  surface-border: "rgba(0,0,0,0.08)"
  surface-border-strong: "rgba(0,0,0,0.14)"
  wf-canvas: "#F5F0E8"
  wf-ink: "#1C2342"
  wf-ink-strong: "#0B0E14"
  wf-body: "#5C4E3A"
  wf-mute: "#8A7B65"
  wf-purple: "#6A4FB8"
  memo-bg: "#FFF3C4"
typography:
  display:
    fontFamily: "Cinzel, PingFang SC, Microsoft YaHei, serif"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.02em"
  body:
    fontFamily: "PingFang SC, Microsoft YaHei, Noto Sans SC, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  mono:
    fontFamily: "Cascadia Code, JetBrains Mono, Fira Code, Consolas, monospace"
    fontSize: "0.78em"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
  "20": "80px"
  "24": "96px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.void}"
    rounded: "{rounded.pill}"
    padding: "10px 28px"
  button-primary-hover:
    backgroundColor: "{colors.gold-bright}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    border: "1px {colors.surface-border-strong}"
  glass-card:
    backgroundColor: "{colors.glass-bg}"
    backdropFilter: "blur(12px)"
    rounded: "{rounded.lg}"
    border: "1px {colors.glass-border}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
  nav-item-active:
    indicator: "{colors.gold}"   # 底部金色下划线（::after 2px）
    textColor: "{colors.text-primary}"
---

# Design System: 小爱酱 | 幻想之境

## 1. Overview

**Creative North Star: "星界玻璃图书馆"**

一个悬浮在星云深处的魔法图书馆。访客穿越黑暗虚空，隔着毛玻璃推开一扇扇玻璃门——卡片是半透明的磨砂玻璃，星光在背后透过来，金色的星芒标记着每一段重要的记忆。东西不多但每件都用心，光线来自星体本身，暗而不冷。

这个系统是"幻想之境"：游戏官网的结构骨架（全屏轮播 → 内容分区 → 页脚），但填充的不是商业产品而是个人内容。核心张力：**暗色星界的宏大感 vs 玻璃卡片的通透感**。Cinzel 拉丁标题营造史诗氛围，中文系统字体保持阅读舒适。金色是唯一的亮色——出现在星芒装饰、按钮、轮播指示点——恰如星空中最亮的那颗。

**技术形态:** 单文件原生 HTML/CSS/JS（无构建），Cloudflare Pages + Worker + KV 后端，IndexedDB 本地缓存 + 云端同步。SPA 5 视图 + hash 路由（`#/home` 等），`VIEW_ITEMS` 常量驱动导航与视图渲染（`renderViewState()` / `renderMain()`）。

**Key Characteristics:**
- **双主题**：默认暗色星界底（`#0B0E14`），顶部月亮/太阳 SVG 图标按钮一键切换浅色（`#F5F0E8`）。两套 token 均为完整定义，组件不写死底色。
- **毛玻璃卡片是唯一卡片语言**：所有容器用 `var(--glass-bg)` + `backdrop-filter: blur(12–16px)` + `1px var(--glass-border)`。半透明让背景壁纸/星光透过来，是"玻璃图书馆"的核心材质。
- 星芒金（`#D4A843`）覆盖 ≤5% 画面——星芒角饰、按钮、轮播指示点、导航激活态金色下划线。
- SVG Mask 星芒伪元素装饰卡片四角（`.star-corners` / `.star-corners-4`）。
- 12 列 Bento Grid 承载内容分区。
- Cinzel Display 仅用于英文标题/眉题，中文回退系统字体。
- 标题/正文文字使用渐变填充（`--grad-a → --grad-b`，`background-clip:text`）。
- `prefers-reduced-motion` 全程降级：动画近零、reveal 直接显示。

这个系统明确拒绝：企业商务冷淡感、技术炫技型交互、千篇一律 SaaS 模板、AI 默认紫/蓝渐变、纯文字无图像页面。

> **2026-08 设计对齐说明**：本文件已按当前线上页面重写。相比旧版删除了：重力相册（Matter.js）、羊皮纸卡片、暗色卡片——线上页面卡片实际全部为毛玻璃材质，`parchment-card`/`dark-card`/`bento-parchment` 类名仍在 CSS 中但未被任何视图渲染，故不作为设计语言收录。重力相册（Matter.js）浮层、按钮与物理引擎代码已全部下线。

## 2. Colors

深色星界基底 + 毛玻璃层 + 金色饰线的三层色彩体系。暗色层承载页面结构（背景、壁纸、导航），玻璃层承载内容容器（半透明 + 边框高光），金色仅在需要焦点的位置出现。

### Primary
- **星芒金 Gold** (`#D4A843`): 唯一 accent。按钮背景、链接、星芒角饰、轮播指示点、导航激活态下划线。禁止大面积铺底或渐变背景。Hover 上浮至亮金 (`#E8C456`)。
- **亮金 Gold Bright** (`#E8C456`): 主按钮 hover、链接 hover、地图城市标题、音乐卡片眉题。仅在交互态与强调文本出现。
- **暗金 Gold Pale** (`#B8943A`): 选中文字底色、滚动条滑块、页脚栏目标题、bento 卡 hover 描边。更低调的金色，用于不争抢注意力的位置。
- **金辉 Gold Glow** (`rgba(212,168,67,0.25)`): 卡片 hover 外发光、头像光环、轮播指示点。仅用作 box-shadow / 微光，不直接着底色。

### Secondary
- **魔法紫 Magic** (`#9075D9`): 副 accent，仅作小面积强调——`--wf-purple` 别名，用于轮播 slide 眉题。覆盖 <3% 面积，不与金色冲突。（地图相册的蓝色 `#38bdf8` 是数据可视化色，不属于 UI accent。）
- **紫辉 Magic Glow** (`rgba(144,117,217,0.2)`): hover 外发光备选。

### Neutral — 星界暗底（暗色主题基底）
- **虚空 Void** (`#0B0E14`): 页面底色、启动屏底色，最深的一层。
- **星界 Astral** (`#11162A`): 内容区背景渐变层，比虚空略亮，带蓝紫底调。
- **星界抬高 Astral Elevated** (`#181E38`): 壁纸视频切换按钮、返回顶部按钮底色。
- **星界面 Astral Surface** (`#1C2342`): 输入框背景、壁纸列表底色。

### Neutral — 文字（暗底）
- **主文字 Text Primary** (`#E8E2D9`): 暗底上的正文、标题。暖调白，不刺眼。
- **次文字 Text Secondary** (`#A09888`): 辅助描述、导航未激活态、渐变文字起点（`--grad-a`）。
- **弱文字 Text Muted** (`#817769`): 页脚、placeholder、日期、低优先级信息。
- **`--wf-*` 别名**: 暗色下 `--wf-canvas:#0B0E14`、`--wf-ink:#F2E8D5`、`--wf-ink-strong:#FFF6E8`、`--wf-body:#A09888`、`--wf-mute:#6B6458`、`--wf-mute-soft:rgba(255,255,255,0.12)`、`--wf-hairline:rgba(255,255,255,0.08)`。浅色下对应覆盖（见下）。

### Light Theme（浅色主题覆盖）
- **虚空 Void** → `#F5F0E8`（暖白纸感）；**星界 Astral / Elevated** → `#FFFFFF`；**星界面 Surface** → `#F2E8D5`。
- **主文字** → `#1C2342`（深藏蓝）；次文字 → `#5C4E3A`；弱文字 → `#6B5D49`。
- **`--wf-*` 别名**: `--wf-canvas:#F5F0E8`、`--wf-ink:#1C2342`、`--wf-ink-strong:#0B0E14`、`--wf-body:#5C4E3A`、`--wf-mute:#8A7B65`、`--wf-purple:#6A4FB8`。
- **玻璃**：`--glass-bg:rgba(255,255,255,0.55)`、`--glass-border:rgba(0,0,0,0.08)`。
- **浅色专项覆盖**：管理面板/登录框、输入框、轮播箭头、按钮 hover 均有一组 `[data-theme="light"]` 专用规则（背景转白/边框转暗，文字转深色）。

### Functional
- **封印朱红 Crimson** (`#A82D3F`): 破坏性操作按钮文字色、Toast 错误底。不使用纯红 (`#FF0000`)。
- **朱红 Hover Crimson Hover** (`#C23A4F`): 删除操作 hover 态。
- **便利贴 Memo** (`--memo-bg:#FDF6B2` 暗 / `#FFF3C4` 浅): 说说卡片的便签黄底。

### Glass & Dividers
- **玻璃底 Glass BG** (暗 `rgba(17,22,42,0.75)` / 浅 `rgba(255,255,255,0.55)`): 所有卡片、导航滚动后、管理面板弹窗的毛玻璃背景。
- **玻璃边框 Glass Border** (暗 `rgba(255,255,255,0.06)` / 浅 `rgba(0,0,0,0.08)`): 卡片与面板 1px 边框。
- **面边框 Surface Border / Strong** (`rgba(255,255,255,0.06)` / `0.1`): 按钮、输入框默认与 hover 边框。

### Named Rules
**The One Accent Rule.** 星芒金覆盖不超过任何一屏 5% 的面积。它的稀有性是它被注意到的原因。按钮、星芒角、轮播指示点——三个地方用完，不加第四个。

**The Glass Island Rule.** 卡片永远是半透明玻璃（`glass-bg` + blur），背景永远是星界基底或壁纸。不要用纯色不透光的卡片挡住星光，也不要让玻璃上再叠玻璃。

**The Magic Is Secondary Rule.** 魔法紫色永远做小面积强调，永远不与金色在同一元素上竞争。

## 3. Typography

**Display Font:** Cinzel (Latin), fallback to PingFang SC / Microsoft YaHei (CJK)
**Body Font:** System CJK stack — PingFang SC, Microsoft YaHei, Noto Sans SC, system sans-serif
**Mono Font:** Cascadia Code, JetBrains Mono, Fira Code, Consolas

**Character:** Cinzel 的古典衬线带来奇幻史诗感——但仅用于英文眉题和标题。中文内容全部使用系统字体，保证阅读效率和跨平台一致性。一个 Display + 一个 Body + 一个 Mono，三家族上限。

### Hierarchy
- **Display** (Cinzel, 800, clamp(1.5rem,4vw,2.8rem), 1.15): 轮播大标题、分区标题。仅在 Hero 级位置使用。
- **Title** (Cinzel, 700, 1.15em, 1.3): 卡片标题、分区标题。
- **Body** (System CJK, 400, 16px, 1.75): 正文、卡片内文字。最宽 65ch。
- **Label** (Cinzel, 600, 0.7em, 0.15em letter-spacing, uppercase): 卡片眉题。金棕色 (`#B8943A`)。
- **Caption** (System CJK, 400, 0.78em, 1.6): 页脚、辅助信息、照片说明。
- **Mono** (0.78em): 日期标签、版本号 (`v250606.starfall`)、说说日期。

### 文字渐变（本页特征）
标题/正文在全局 `h1–h4, p, .card-text, .slide-bio, .portfolio-title …` 上使用 `linear-gradient(110deg, var(--grad-a) 30%, var(--grad-b) 48% …)` + `background-clip:text` 做两色渐变填充。暗色下 `--grad-a:var(--text-secondary)`（暖灰）→ `--grad-b:#ffffff`；浅色下 `--grad-b:var(--text-primary)`。这是本系统文字质感的核心，避免任何饱和色文字。`.shiny-text` / `.shiny-text-gold` 类保留用于 Hero 级标题，当前动画关闭（`animation:none!important`），仅作渐变填充。

### Named Rules
**The One Display Rule.** Cinzel 仅用于英文。中文标题使用系统字体继承，不加第二个 display 字体。

**The Gradient-On-Base Rule.** 渐变只作用于文字填充，不用于背景色块。白/浅底上 `--grad-b` 必须换成深色（`text-primary`），避免对比不足。

## 4. Elevation

这是一个暗色扁平系统，深度来自色彩层次与毛玻璃而非硬投影。卡片从背景"浮出"靠的是半透明玻璃层 + 柔和投影 + 金色 hover 微光。

### Shadow Vocabulary
- **星芒浮影 Card** (`0 4px 24px rgba(0,0,0,0.4)`; 浅色 `rgba(31,38,60,0.10)`): 卡片的默认投影。深而柔，不刺眼。
- **金辉浮影 Card Hover** (`0 8px 40px rgba(0,0,0,0.5), 0 0 30px var(--gold-glow)`): 卡片 hover 时叠加金色外发光。仅当卡片被交互时出现。

### z-index Scale
- `0`: 壁纸层 (`#wp-stage`) + 轮播非激活 slide
- `1`: 内容区 (section) + 激活 slide
- `2`: 轮播 slide 内容 / 星芒角
- `10`: 轮播指示点与箭头
- `990`: 管理入口齿轮
- `995`: 悬浮音乐播放器 (FAB)
- `996`: 桌面宠物
- `998`: 返回顶部 + 壁纸控制点
- `999`: 移动端展开导航
- `1000`: 固定导航栏
- `9998`: 管理面板遮罩
- `9999`: 管理面板
- `10000`: 登录弹窗
- `10001`: Toast 通知
- `10100`: 灯箱
- `100000`: 启动屏 + 自定义光标

### Named Rules
**The Flat-By-Default Rule.** 卡片静止时投影仅用一层。金色外发光只在 hover 态叠加。没有永久发光的 UI 元素。

**The Glass-Is-Flat Rule.** 玻璃卡片本身不叠厚重投影——层次来自透出的星光与边框高光。投影只在卡片被 hover 时才明显。

## 5. SPA 视图体系（信息架构）

单一 `#main` 容器 + hash 路由。`VIEW_ITEMS` 定义 5 个视图，导航项与视图 `data-view` 一一对应，`renderViewState()` 切换 `.active`/`.on` 并展开激活项金色下划线。

| id | 导航标签 | 内容 |
|---|---|---|
| `home` | 首页 | 全屏轮播 Hero + 主页音乐卡片 |
| `content` | 内容 | 12 列 Bento 模块 + 个人精选作品 |
| `memos` | 说说 | 玻璃留言卡片（pinned 置顶 + 微倾斜） |
| `gallery` | 映像馆 | ECharts 中国地图相册 + 灯箱 |
| `contact` | 联系 | 联系方式卡片 |

- **路由**：`navigateTo(id)` 更新 hash；启动时读 hash 定位视图，无效 hash 回退 `home`。
- **渲染**：`renderMain()` 一次性生成 5 个视图 DOM；`renderViewState()` 只切换类名，不重建。
- **Reveal 入场**：`reveal` + `reveal-d1..5` 依次延迟，IO 触发；切视图时同步 `initReveal()`。
- **轮播联动**：仅 `home` 视图激活时 `startCarousel()`，切走即 `stopCarousel()`。

## 6. Components

### 按钮 Buttons
- **Shape:** 全圆角 pill (9999px)，无直角按钮。
- **Primary `.btn`**: 星芒金底 (`--gold`) + 深色字 (`--void`)，padding 10px × 28px，字重 600。Hover 升亮金 (`--gold-bright`) + 上移 2px + 金辉投影。Active 缩至 96%。用于管理面板、登录确认等确认性操作。
- **Ghost `.btn-ghost`**: 透明底 + 次文字色 + 1px 强面边框。Hover 边框变金 + 文字变亮金。用于取消、次要操作。
- **Glass `.glass-btn` / `.slide-cta`**: 毛玻璃 pill（`glass-bg` + `blur(8–10px)` + 玻璃边框）+ 主文字色。Hover 边框与文字转金。用于轮播 CTA、壁纸/功能入口等浮在内容上的按钮。

### 导航 Navigation
- **Desktop Nav:** 固定顶部 `64px`（移动端 `48px`）。透明底 → 滚动 >40px 后加 `.scrolled`：毛玻璃 (`blur(14px)` + 玻璃底 + 1px 底边框)。
- **Pill Nav:** 导航项为透明按钮，底色 `transparent`、文字次文字色。**激活态为底部金色下划线**（`::after` 2px 金线，`transform: scaleX` 0→1 展开）。激活项文字转 `--text-primary` + 加粗——克制、以金色细线呼应唯一 accent，不再用滑动底色块。
- **Mobile Nav:** ≤768px 汉堡菜单展开，固定下拉层 (z-999) 毛玻璃底 + 全宽 pill 按钮垂直排列。
- **滚动高亮**: `IntersectionObserver` 跟踪当前 section，高亮对应导航项并展开下划线。

### 轮播 Hero（首页）
- **Slide:** 全视口高度 (`100dvh`)，绝对定位 + opacity 淡入淡出 (1s ease)。背景图 `cover` + `brightness(0.45)` + `bgDrift` 12s 缓动 + 径向 vignette 遮罩（底部渐入 `--wf-canvas`）。
- **Content:** `.slide-content` 玻璃面板（`rgba(10,16,30,0.35)` + `blur(14px)` + 1px 白边框 + 20px 圆角），居中 max-width 720px。顺序：头像 (100px 圆 + 金边 + 金辉光环) → 眉题 (Cinzel 大写 + **魔法紫**) → 大标题 → 简介 → CTA。`heroReveal` 依次入场（0.1s 头像 → 0.2s 眉题 → 0.35s 标题 → 0.5s 简介 → 0.65s CTA）。
- **CTA:** 毛玻璃 pill 按钮（`glass-bg` + `blur(10px)` + 玻璃边框）+ 箭头，hover 时边框与文字转金。入场后 1.5s 开始 `pulse` 呼吸光晕。
- **Controls:** 底部圆点指示器 + 左右箭头 (毛玻璃圆形按钮) + 键盘左右键 + 触屏滑动。**自动播放 6s**（`CAROUSEL_INTERVAL=6000`）；`mouseenter`/`mouseleave` 与 `visibilitychange` 时暂停/恢复，避免打断阅读。
- **浅色覆盖:** `[data-theme="light"]` 下玻璃面板转白底，箭头转亮。

### 音乐系统（主页卡片 + 悬浮播放器）
双入口、同一状态机（`_playlist` / `_plIdx` / `_audio`），通过 Meting API（`api.injahow.cn/meting/?server=netease&type=song&id=`）拉取网易云直链与 LRC 歌词，逐句 typewriter 高亮。

- **主页音乐卡片** `.music-card`: 玻璃卡 (blur 16px / 20px 圆角)。左：**黑胶唱片** `.mc-disc`（170px 圆形，同心圆纹 + 金色盘芯；播放时 8s 匀速旋转 `discspin`；有封面时以 500×500 封面替代盘芯渐变）。右：眉题 `♪ Music Player` → 歌名 → 歌词舞台 (`.mc-stage` 高 120px，`.mc-lyric` 金亮色居中 + `.mc-playlist` 播放列表 overlay) → 进度条 → 上一首/播放/下一首 + 播放列表按钮。
- **悬浮播放器** `#music-float` (z-995, 右下): FAB 圆形按钮（金色音符 SVG + 三条均衡器动画条，无背景边框）；展开面板含歌名、进度、控制、音量滑杆、播放列表。**两者互斥**：打开任一播放列表时切换。
- **播放列表**: 显示歌名/歌手，当前首高亮金。歌曲源顺序由 `cloudMusicIds` 决定；单曲无直链则静默跳过。未配歌曲 ID 时回退 `bgm` 直链单曲循环。
- **封面**: Meting 返回的封面 URL 经 HEAD 重定向 + `param=500y500` 取 500×500。

### 内容视图 Content
- **Section Header**: 眉题（系统字体、大写、`--wf-mute`）→ 大标题（Cinzel + `shiny-text-gold` 渐变填充）→ 描述。`section-divider` 120px 1px hairline 分割线。
- **Bento Grid**: 12 列网格（≤1024px 6 列，≤768px 1 列）。模块卡 `.bento-tile.bento-dark` = 玻璃材质 (`glass-bg` + `blur(12px)`) + `star-corners-4` 星芒角 + `reveal-d2..5` 依次入场。`wide/medium/small/mini` 控制跨度。
- **个人精选 Portfolio**: `portfolio-item` 卡（图片 + hover 遮罩"查看详情" + 标题 + `linkName` 链接名）。有 URL 则整卡可点击新标签打开。

### 说说视图 Memos
- **说说卡** `.memo-card`: 240px 宽，**玻璃材质**（`glass-bg` + `blur(14px)` + 玻璃边框），`rotate(±2deg)` 微倾斜，hover 转正 + 上浮 + 金色辉光。`pinned` 置顶卡金色描边 + 26px 金辉。（`--memo-bg` 便利贴黄色变量保留但当前未使用。）
- 排序：pinned 优先 → 日期倒序。日期右下角 mono 字体。
- 空白态: 图片 + 引导文案。

### 映像馆视图 Gallery（地图相册）
**主内容为 ECharts 中国地图相册**（参考 Your-China-Travel 风格），照片按后台填写的 `location`（城市）点亮地图。

- **地图**: `#china-map` 容器（高 680px），`echarts.registerMap('china', CHINA_GEO)` 省界地图。`roam:true`、zoom 1.55、center `[105, 36.5]`、深底 + 灰蓝省界线 (`#475569`)。**已记录省份高亮**：`geo.regions` 给含照片的省 `areaColor rgba(56,189,248,0.22)` + 亮蓝描边。
- **城市点**: `effectScatter` 蓝点 (`#38bdf8`，14px 辉光 + 涟漪) + 照片数 label；坐标查 `CITIES_GEO`（去掉市/自治州/地区后缀比对，再降级省名省会，均无 → 未标注区）。
- **点击城市点** → 下方 `#city-photo-panel` 显示该城照片网格（`map-photo` 卡，hover 上浮 + 底部渐变 caption），点照片 `openLightbox(原始扁平下标)`。
- **未标注照片**: 底部 `<details>` 折叠区"未标注地点的照片（N 张）"。
- **懒加载**: 进入映像馆视图时 `ensureMapDeps()` 动态注入 ECharts CDN + 地图数据，失败 toast；切走 `echarts.dispose()` 释放。空数据时显示引导文案"在管理后台给照片填地点"。

### 灯箱 Lightbox
- 全屏 `rgba(0,0,0,0.92)` 遮罩 (z-10100)。图片 92vw×90vh contain。左上关闭 + 左右圆形毛玻璃箭头 + 底部 caption。点图/遮罩/ESC 关闭，键盘左右切换。

### 壁纸系统 Wallpaper
- **Layer**: `#wp-stage` 全屏固定 (z-0)。图片模式多张 `wp-img` opacity 1.2s 交叉淡入，按 `interval` 秒轮播；视频模式 MP4 `object-fit:cover` 静音循环，多视频顺序播放队列。
- **Controls** (z-998 右下): 圆点切换器（`.wp-dot` 金亮激活）+ 视频播放/暂停按钮 (⏯)。每图可键盘 Enter 切换。

### 桌面宠物 Pet
- 右下角固定 (z-996)，`leimiaier1-6.gif` 序列表情切换 + 气泡 `qp1.png` 底图 + 文字。可拖拽移动位置。移动端缩小。

### 自定义光标 + 点击粒子
- **Cursor**: 金色 6px 圆点 (`cursor-dot`) + 32px 圆环 (`cursor-ring`)，hover 交互元素时圆环扩至 52px + 金底填充。z-100000。
- **点击粒子**: 点击迸发金色粒子。二者均可在管理面板开关（localStorage `fx-click` / `fx-cursor`）。

### 启动屏 Splash
- 全屏 `#0B0E14` 盖层 (z-100000)，背景视频 `assets/薇尔莉特.mp4` (`2x` 播放)，右下"跳过 →"按钮。播放完成后 fade-out 0.8s 移除 DOM；自动播放被拦截时立即隐藏。

### 管理面板 Admin
- **入口**: 左下角固定 38px² 齿轮 (z-990)，暗底半透明，hover 提亮。
- **鉴权**: 密码弹窗 → `POST /api/login` → 24h session token（KV 存储）→ `Authorization: Bearer`。token 存 sessionStorage；`authHeaders()` 统一附加。登录态存内存变量 `isAdmin` / `sessionToken`。
- **面板** (z-9999, 实色暗底 `#1a1a1a` + 1px `#333` 边框 + 8px 圆角, max-width 620px, 88vh 可滚动; 浅色主题下整体转白底深字): 分区编辑——
  - **资料**: 头像上传 / 名字 / 标语 / 简介 / 主题色。
  - **壁纸**: 类型（图片轮播 / 视频 MP4）、上传 MP4、间隔秒数。
  - **音乐**: 网易云歌曲 ID 输入框（逗号分隔）+ **调整歌曲顺序**列表（每行 `↑↓` 上下移动、自动识别歌名、防抖保存）；背景音乐直链。
  - **特效**: 点击粒子 / 自定义光标开关。
  - **关于**: 长文本。
  - **说说**: 逐条编辑（文字/日期/置顶）。
  - **作品**: 逐条编辑（标题/链接名/URL/上传图）。
  - **照片**: 逐条编辑（说明/日期/**地点(城市)**/上传图）。
  - **轮播内容**: 三张 slide 各自的眉题/标题/按钮文字/背景图 URL/上传。
- **持久化**: 编辑即 `saveData()` → IndexedDB + 防抖 POST 云端 (Worker `/api/data`)。`mergeData()` 浅合并远端与本地（`cloudMusicIds` 差异检测）。

### Toast
- 固定底部居中 (z-10001)。三色：成功绿 (`#38A169`) / 错误朱红 (`--crimson`) / 消息 (`text-primary` 底 + void 字)。6px 圆角，入场 translateY(10px)→0 + opacity，2.5s 自动消失。

## 7. Do's and Don'ts

### Do:
- **Do** 用星芒金 (`#D4A843`) 作为唯一 accent——仅在按钮、星芒角、轮播指示点、导航激活态下划线出现。面积 ≤5%。
- **Do** 保持星界基底贯穿全页。卡片一律用毛玻璃（`glass-bg` + blur），不用不透明纯色卡。
- **Do** 给每张卡片明确的 hover 反馈——上浮 + 金辉外发光。
- **Do** 对 bento / 重点卡片使用星芒角装饰 (`.star-corners` / `.star-corners-4`)。
- **Do** 尊重 `prefers-reduced-motion`——禁用动画、reveal 直接显示、轮播/粒子降级。
- **Do** 使用 Cinzel 仅用于英文眉题和标题，中文使用系统字体。
- **Do** 保持圆角在 6px–20px 之间（除了 pill 9999px 用于按钮），玻璃面板可用 20px。
- **Do** 标题/正文渐变文字使用 `--grad-a → --grad-b`，浅色下务必让 `--grad-b` 变深。

### Don't:
- **Don't** 在星界基底之外引入第二套背景色体系。玻璃卡永远透出壁纸/星光，不要垫不透明底色。
- **Don't** 引入第二个饱和 accent 色与金色平起平坐。魔法紫仅做小面积强调。
- **Don't** 过度堆叠玻璃（glass inside glass 会让层次丢失）；卡片层级最多两层。
- **Don't** 使用企业官网式的商务冷淡排版（大段文字、无图像、直角卡片）。
- **Don't** 使用技术炫技型交互（过度动画、复杂 scroll-jack、无节制的 GSAP）。
- **Don't** 套用千篇一律 SaaS 落地页模板（hero metrics → three equal feature cards → CTA）。
- **Don't** 使用 AI 默认紫/蓝渐变、纯黑 (`#000000`) 或纯白 (`#FFFFFF`) 纯色大面积铺底（玻璃底用 `rgba` 半透明）。
- **Don't** 堆叠卡片（card inside card）。每个卡片独立，不嵌套。
- **Don't** 在 `< 768px` 视口隐藏内容。所有 section 移动端垂直堆叠。
- **Don't** 使用 border-left 或 border-right > 1px 做彩色条纹装饰。
