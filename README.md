# FC 经典游戏模拟器

纯浏览器端 NES/FC 游戏模拟器，基于 [jsnes](https://github.com/bfirsh/jsnes) 构建。

## 功能特性

- ✅ 纯前端实现，无需后端服务器
- ✅ 支持上传 .nes 格式 ROM 文件
- ✅ 键盘控制：方向键 + Z/X/Enter/Shift
- ✅ 暂停/重置/全屏功能
- ✅ 响应式设计，支持移动端
- ✅ 复古游戏界面风格

## 快速开始

### 方式一：直接打开 HTML（最简单）

```bash
cd /run/csi/mount-root/nas/4079184d856ecc166ed19d4887083405/workspaces/default/fc-games
# 双击 index.html 在浏览器中打开
```

**注意：** 直接打开 HTML 文件时，部分浏览器可能限制文件上传功能。建议使用本地服务器。

### 方式二：使用 Python 服务器（推荐）

```bash
cd /run/csi/mount-root/nas/4079184d856ecc166ed19d4887083405/workspaces/default/fc-games
python3 -m http.server 8080
```

然后在浏览器访问：http://localhost:8080

### 方式三：使用 Node.js 服务器

```bash
cd /run/csi/mount-root/nas/4079184d856ecc166ed19d4887083405/workspaces/default/fc-games
npx http-server -p 8080
```

## 使用方法

1. **选择游戏**：点击游戏卡片或上传自己的 ROM 文件
2. **开始游戏**：ROM 加载后点击游戏卡片开始
3. **操控**：
   - `↑↓←→` 方向键移动
   - `Z` A 键（跳跃/确认）
   - `X` B 键（射击/加速）
   - `Enter` Start 键
   - `Shift` Select 键
   - `R` 重置游戏
   - `Space` 暂停/继续

## 项目结构

```
fc-games/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式表
├── js/
│   ├── jsnes.min.js    # NES 模拟器核心
│   └── app.js          # 应用逻辑
└── assets/             # 游戏资源（可选）
```

## 技术说明

- **模拟器核心**：jsnes - JavaScript 实现的 NES 模拟器
- **音频支持**：Web Audio API
- **视频渲染**：Canvas 2D
- **ROM 加载**：HTML5 File API

## 关于游戏 ROM

- 本站不托管任何游戏 ROM 文件
- 用户需要自行准备 .nes 格式的游戏文件
- 仅供个人学习研究使用
- 请尊重游戏版权

## 部署建议

### GitHub Pages（免费）
1. 将项目推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 访问 https://用户名.github.io/仓库名

### Vercel/Netlify（免费）
1. 将项目推送到 GitHub
2. 在 Vercel/Netlify 导入项目
3. 自动部署并获取访问链接

### 本地服务器
使用任意静态服务器工具，如：
- `python3 -m http.server 8080`
- `npx serve .`
- `npx http-server .`

## 开发说明

### 添加新游戏

在 `js/app.js` 的 `GAMES` 对象中添加：

```javascript
const GAMES = {
    // ... 现有游戏
    newgame: {
        name: '新游戏名称',
        icon: '🎮',
        desc: '游戏描述',
        rom: null  // 用户通过上传加载
    }
};
```

### 自定义样式

编辑 `css/style.css`，修改 CSS 变量：

```css
:root {
    --primary: #6366f1;      /* 主色调 */
    --secondary: #ec4899;    /* 辅助色 */
    --bg-dark: #0f172a;      /* 背景色 */
    /* ... */
}
```

## 常见问题

**Q: 为什么上传 ROM 后无法加载？**
A: 请确保 ROM 文件是标准的 .nes 格式，文件大小通常是 256KB-4MB。

**Q: 游戏没有声音？**
A: 部分浏览器需要用户交互后才能播放音频，请先点击页面任意位置。

**Q: 游戏运行卡顿？**
A: 尝试关闭其他标签页，或使用性能更好的设备。

**Q: 如何保存游戏进度？**
A: 目前版本不支持存档功能，这是 NES 模拟器的固有限制。

## 许可证

本项目基于 MIT 许可证开源。
jsnes 项目地址：https://github.com/bfirsh/jsnes
