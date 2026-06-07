---
name: 小爱酱 | 幻想之境
description: 星界暗底上的羊皮纸魔法图书馆 — 个人主页的游戏化重构
colors:
  void: "#0B0E14"
  astral: "#11162A"
  astral-elevated: "#181E38"
  astral-surface: "#1C2342"
  parchment: "#F2E8D5"
  parchment-warm: "#EDE0C8"
  parchment-dark: "#D4C4A2"
  parchment-border: "#C4B08A"
  gold: "#D4A843"
  gold-bright: "#E8C456"
  gold-pale: "#B8943A"
  magic: "#9075D9"
  crimson: "#A82D3F"
  crimson-hover: "#C23A4F"
  ink: "#2D2418"
  ink-muted: "#5C4E3A"
  ink-faint: "#8A7B65"
  text-primary: "#E8E2D9"
  text-secondary: "#A09888"
  text-muted: "#6B6458"
  glass-bg: "rgba(17,22,42,0.75)"
  glass-border: "rgba(255,255,255,0.06)"
  surface-border: "rgba(255,255,255,0.06)"
  surface-border-strong: "rgba(255,255,255,0.1)"
  gold-glow: "rgba(212,168,67,0.25)"
  magic-glow: "rgba(144,117,217,0.2)"
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
    padding: "12px 36px"
  button-primary-hover:
    backgroundColor: "{colors.gold-bright}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
  nav-item-active:
    backgroundColor: "rgba(212,168,67,0.08)"
    textColor: "{colors.gold-bright}"
  card-parchment:
    backgroundColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
  card-dark:
    backgroundColor: "{colors.astral-elevated}"
    rounded: "{rounded.lg}"
---

# Design System: 小爱酱 | 幻想之境

## 1. Overview

**Creative North Star: "星界图书馆"**

这是一个悬浮在星云深处的魔法图书馆。访客穿越黑暗虚空，推开玻璃门，眼前是漂浮在星辉中的羊皮纸卷轴——金色的星芒标记着每一段重要的记忆。东西不多但每件都用心，光线来自星体本身，暗而不冷。

这个系统的名字是"幻想之境"：游戏官网的结构骨架（全屏轮播 → 内容分区 → 页脚），但填充的不是商业产品而是个人内容。核心张力：**暗色星界的宏大感 vs 羊皮纸卡片的亲切感**。Cinzel 拉丁标题营造史诗氛围，中文系统字体保持阅读舒适。金色是唯一的亮色——出现在星芒装饰、按钮、激活态——恰如星空中最亮的那颗。

**Key Characteristics:**
- 星界暗底（#0B0E14）为唯一页面基调，不切换亮色模式
- 暖羊皮纸卡片（#F2E8D5）承载所有正文内容，是暗色海洋中的暖岛
- 星芒金（#D4A843）覆盖 ≤5% 画面——星芒角饰、按钮、导航激活态
- SVG Mask 星芒伪元素装饰卡片四角，对开或单角按卡片层级
- 12 列 Bento Grid 承载内容分区，图/文/暗卡混合排布
- Cinzel Display 字体仅用于英文标题/眉题，中文回退系统字体
- `backdrop-filter: blur(20px)` 仅用于顶部导航栏

这个系统明确拒绝：企业商务冷淡感、技术炫技型交互、千篇一律 SaaS 模板、AI 默认紫/蓝渐变、纯文字无图像页面。

## 2. Colors

深色星界基底之上，暖色羊皮纸 + 金饰的双层色彩体系。暗色层承载页面结构（背景、导航、暗卡），暖色层承载内容容器（羊皮纸卡、文字），金色仅在需要焦点的位置出现。

### Primary
- **星芒金 Gold** (#D4A843): 唯一 accent。按钮背景、导航激活态文字、星芒角饰、链接。禁止大面积铺底或渐变背景。Hover 上浮至亮金 (#E8C456)。
- **亮金 Gold Bright** (#E8C456): 主按钮 hover、链接 hover。仅在交互态出现。
- **暗金 Gold Pale** (#B8943A): 卡片眉题、作品链接、分割线。更低调的金色，用于不争抢注意力的位置。
- **金辉 Gold Glow** (rgba(212,168,67,0.25)): 卡片 hover 外发光、头像光环。仅用作 box-shadow，不直接着底色。

### Secondary
- **魔法紫 Magic** (#9075D9): 暗色卡片 accent——"联系我"卡片的眉题色、暗卡的交互强调。覆盖 <3% 面积，只在暗底上出现，不与金色冲突。
- **紫辉 Magic Glow** (rgba(144,117,217,0.2)): 暗卡的 hover 外发光备选。

### Neutral — 星界暗底
- **虚空 Void** (#0B0E14): 页面底色，最深的一层。
- **星界 Astral** (#11162A): 内容区背景渐变层，比虚空略亮，带蓝紫底调。
- **星界抬高 Astral Elevated** (#181E38): 暗色卡片、管理面板背景。
- **星界面 Astral Surface** (#1C2342): 输入框背景、壁纸列表底色。

### Neutral — 羊皮纸
- **羊皮纸 Parchment** (#F2E8D5): 主卡片容器背景。暖而不黄，刚好从暗底浮出。
- **暖羊皮纸 Parchment Warm** (#EDE0C8): 卡片渐变中间色，增加层次。
- **暗羊皮纸 Parchment Dark** (#D4C4A2): 卡片内标签 pill 背景、删除按钮底色。
- **羊皮纸边框 Parchment Border** (#C4B08A): 羊皮纸卡片 1px 边框色。

### Neutral — 墨色（羊皮纸上的文字）
- **墨 Ink** (#2D2418): 羊皮纸卡片正文。深棕黑，对 parchment 底 4.5:1+。
- **淡墨 Ink Muted** (#5C4E3A): 卡片辅助文字、描述。
- **浅墨 Ink Faint** (#8A7B65): 日期、三级信息。

### Neutral — 暗底文字
- **主文字 Text Primary** (#E8E2D9): 暗底上的正文、标题。暖调白，不刺眼。
- **次文字 Text Secondary** (#A09888): 暗底辅助描述、导航未激活态。
- **弱文字 Text Muted** (#6B6458): 页脚、placeholder、低优先级信息。

### Functional
- **封印朱红 Crimson** (#A82D3F): 破坏性操作按钮文字色。不使用纯红 (#FF0000)。
- **朱红 Hover Crimson Hover** (#C23A4F): 删除操作 hover 态。

### Glass & Dividers
- **玻璃底 Glass BG** (rgba(17,22,42,0.75)): 导航栏滚动后毛玻璃背景。
- **玻璃边框 Glass Border** (rgba(255,255,255,0.06)): 导航栏底部 1px 分割线。
- **面边框 Surface Border** (rgba(255,255,255,0.06)): 暗色卡片、输入框默认边框。
- **强面边框 Surface Border Strong** (rgba(255,255,255,0.1)): 暗色卡片 hover、幽灵按钮边框。

### Named Rules
**The One Accent Rule.** 星芒金覆盖不超过任何一屏 5% 的面积。它的稀有性是它被注意到的原因。按钮、星芒角、激活态——三个地方用完，不加第四个。

**The Parchment Island Rule.** 羊皮纸色只在卡片容器内出现。背景永远是暗色星界系。不要在页面背景上出现羊皮纸色区块。

**The Magic Is Secondary Rule.** 魔法紫色永远在暗底上出现（暗色卡片、bento dark tile），永远不在羊皮纸上出现。金与紫不在同一基底上竞争。

## 3. Typography

**Display Font:** Cinzel (Latin), fallback to PingFang SC / Microsoft YaHei (CJK)
**Body Font:** System CJK stack — PingFang SC, Microsoft YaHei, Noto Sans SC, system sans-serif
**Mono Font:** Cascadia Code, JetBrains Mono, Fira Code, Consolas

**Character:** Cinzel 的古典衬线带来奇幻史诗感——但仅用于英文眉题和标题。中文内容全部使用系统字体，保证阅读效率和跨平台一致性。一个 Display + 一个 Body + 一个 Mono，三家族上限。

### Hierarchy
- **Display** (Cinzel, 800, clamp(1.5rem,4vw,2.8rem), 1.15): 轮播大标题、分区标题。仅在 Hero 级位置使用。
- **Title** (Cinzel, 700, 1.15em, 1.3): 羊皮纸卡片标题、暗色卡片标题。
- **Body** (System CJK, 400, 16px, 1.75): 正文、卡片内文字。最宽 65ch。
- **Label** (Cinzel, 600, 0.7em, 0.15em letter-spacing, uppercase): 卡片眉题。金棕色 (#B8943A)。
- **Caption** (System CJK, 400, 0.78em, 1.6): 页脚、辅助信息。
- **Mono** (0.78em): 日期标签、版本号。

### Named Rules
**The One Display Rule.** Cinzel 仅用于英文。中文标题使用系统字体继承，不加第二个 display 字体。

**The Italic Descender Rule.** 当 Cinzel 标题中包含 g/y/j/p/q 字母且 `leading-[1]` 时，必须改用 `leading-[1.1]` + `pb-1`。本系统目前不使用 Italic，此规则作为将来 guard。

## 4. Elevation

这是一个暗色扁平系统，深度来自色彩层次而非投影。暗底从虚空 (void) → 星界 (astral) → 星界抬高 (elevated) → 星界面 (surface) 形成四级亮度阶梯。羊皮纸卡片天然从暗底"浮出"，靠的是色彩对比而非阴影强度。

### Shadow Vocabulary
- **星芒浮影 Card** (`0 4px 24px rgba(0,0,0,0.4)`): 羊皮纸卡和暗卡的默认投影。深而柔，不刺眼。
- **金辉浮影 Card Hover** (`0 8px 40px rgba(0,0,0,0.5), 0 0 30px var(--gold-glow)`): 卡片 hover 时叠加金色外发光。仅当卡片被交互时出现。

### z-index Scale
- `0`: 壁纸层
- `1`: 内容区 (section)
- `990`: 管理入口齿轮
- `998`: 返回顶部按钮 + 壁纸控点
- `999`: 移动端展开导航
- `1000`: 固定导航栏
- `9998`: 管理面板遮罩
- `9999`: 管理面板
- `10000`: 登录弹窗
- `10001`: Toast 通知

### Named Rules
**The Flat-By-Default Rule.** 卡片静止时投影仅用一层。金色外发光只在 hover 态叠加。没有永久发光的 UI 元素。

**The Depth-By-Color Rule.** 同等亮度下，暖色（羊皮纸）感知"近"，冷暗色（星界）感知"远"。利用色温差制造层次，不加额外投影。

## 5. Components

### Buttons
- **Shape:** 全圆角 pill (9999px)，无直角按钮。
- **Primary:** 星芒金底 (#D4A843) + 虚空色字 (#0B0E14)，padding 12px × 36px。Hover 升亮金 (#E8C456) + 上移 2px + 金辉投影。Active 缩至 97%。
- **Ghost:** 透明底 + 次文字色 + 1px 强面边框。Hover 边框变金 + 文字变亮金 + 微上移。用于取消、次要操作。
- **Danger:** 透明底 + 朱红字。Hover 朱红浅底。仅用于重置等破坏性操作。

### Navigation
- **Desktop Nav:** 固定顶部 64px 高度。透明底 → 滚动后毛玻璃 (blur 20px + 75% opacity astral 底)。每个 nav item 为 pill 形按钮，透明底 + 次文字色。Hover 微提亮。Active 状态：亮金色文字 + 8% 金底。
- **Mobile Nav:** ≤768px 汉堡菜单展开。毛玻璃底 + 全宽 pill 按钮垂直排列。
- **Scroll Spy:** IntersectionObserver 自动跟踪当前 section 并高亮对应 nav item。

### Cards — Parchment
- **Shape:** 16px 圆角 (--radius-lg)。
- **Background:** 径向金微光叠加线性羊皮纸渐变 (parchment → parchment-warm → #E8DCC8)。
- **Border:** 1px 羊皮纸边框色 (#C4B08A)。
- **Shadow:** 星芒浮影 (card)。Hover 上浮 4px + 金辉浮影。
- **Star Corners:** 使用 SVG mask-image 星芒伪元素。`.star-corners` 为对角的两个大星 (40px)，`.star-corners-4` 为对角两个小星 (28px)。星芒色为金色，初始 opacity 0.5，hover 0.85。
- **Padding:** 32px (--space-8)。

### Cards — Dark
- **Shape:** 16px 圆角 (--radius-lg)。
- **Background:** 星界抬高色 (#181E38)。
- **Border:** 1px 面边框 (rgba(255,255,255,0.06))。
- **Shadow:** 星芒浮影。Hover 边框变强 + 投影加深。
- **Padding:** 32px (--space-8)。

### Carousel Banner
- **Slide:** 全视口高度 (100dvh)，绝对定位 + opacity 淡入淡出 (1s ease)。
- **Background:** 图片 cover + brightness(0.45) + 径向 vignette 遮罩。
- **Content:** 居中，max-width 720px。头像 (100px 圆 + 3px 金边 + 金辉光环) → 眉题 → 大标题 → 简介 → CTA。
- **Controls:** 底部圆点指示器 + 左右箭头 (毛玻璃圆形按钮) + 键盘左右键 + 触屏滑动。
- **Auto-play:** 6s 间隔，hover 或交互时不暂停。

### Admin Panel
- **Entry:** 左下角固定 38px² 齿轮图标。星界面底 + 面边框，opacity 0.4。Hover opacity 1 + 金边。
- **Overlay:** 全屏 rgba(0,0,0,0.45) 遮罩，flexbox 居中。
- **Panel:** 星界底 + 强面边框 + 20px 圆角。max-width 620px，max-height 88vh 可滚动。内 padding 32px。
- **Section Headers:** Cinzel 字 + 金色。
- **Inputs:** 星界抬高底 + 面边框 + 6px 圆角。Focus 金边。

### Toast
- 固定底部居中，三色：成功绿 (#38A169)、错误朱红 (#A82D3F)、消息主文字色底 + 虚空字。
- 6px 圆角，入场 translateY(10px) → 0 + opacity，2.5s 自动消失。

### Wallpaper System
- **Image Mode:** 全屏固定背景，opacity 淡入淡出 (1.2s)，右下圆点切换。
- **Video Mode:** 全屏固定 `<video>`，静音循环，右下暂停按钮。

## 6. Do's and Don'ts

### Do:
- **Do** 用星芒金 (#D4A843) 作为唯一 accent——仅在按钮、星芒角、导航激活态出现。面积 ≤5%。
- **Do** 保持暗色星界基底贯穿全页。羊皮纸色只在卡片容器内使用。
- **Do** 给每张卡片明确的 hover 反馈——上浮 4px + 金辉外发光。
- **Do** 对羊皮纸卡片使用星芒角装饰 (`.star-corners` / `.star-corners-4`)。
- **Do** 尊重 `prefers-reduced-motion`——禁用动画、reveal 元素直接显示。
- **Do** 使用 Cinzel 仅用于英文眉题和标题，中文使用系统字体。
- **Do** 保持圆角在 6px–20px 之间（除了 pill 9999px 用于按钮）。

### Don't:
- **Don't** 在羊皮纸卡片以外的区域使用暖色调背景。星界暗底是全页基调。
- **Don't** 引入第二个饱和 accent 色与金色平起平坐。魔法紫仅在暗卡上做辅助强调。
- **Don't** 在导航栏和 Hero 之外使用毛玻璃。玻璃效果靠稀有性维持分量。
- **Don't** 使用企业官网式的商务冷淡排版（大段文字、无图像、直角卡片）。
- **Don't** 使用技术炫技型交互（过度动画、复杂 scroll-jack、无节制的 GSAP）。
- **Don't** 套用千篇一律 SaaS 落地页模板（hero metrics → three equal feature cards → CTA）。
- **Don't** 使用 AI 默认紫/蓝渐变、纯黑 (#000000) 或纯白 (#FFFFFF) 纯色大面积铺底。
- **Don't** 堆叠卡片（card inside card）。每个卡片独立，不嵌套。
- **Don't** 在 `< 768px` 视口隐藏内容。所有 section 移动端垂直堆叠。
- **Don't** 使用 border-left 或 border-right > 1px 做彩色条纹装饰。
