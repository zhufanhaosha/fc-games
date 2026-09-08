# FC 经典游戏模拟器

纯浏览器端 NES/FC 游戏模拟器，基于 [jsnes](https://github.com/bfirsh/jsnes) 构建。

## 功能特性

- ✅ 纯前端实现，无需后端服务器
- ✅ 支持上传 .nes 格式 ROM 文件
- ✅ 键盘控制：方向键 + Z/X/Enter/Shift
- ✅ 暂停/重置/全屏功能
- ✅ 响应式设计，支持移动端
- ✅ 复古游戏界面风格

## 在线体验

🌐 **访问地址**: https://github.com/zhufanhaosha/fc-games

部署到 GitHub Pages: https://zhufanhaosha.github.io/fc-games/

## 使用方法

### 本地运行
```bash
cd fc-games
python3 -m http.server 8080
```
然后访问 http://localhost:8080

### 使用方式
1. 打开网站
2. 点击「选择 ROM 文件」上传你的 .nes 游戏
3. 选择游戏开始游玩
4. 使用键盘操控：
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
└── README.md
```

## 技术说明

- **模拟器核心**: jsnes - JavaScript 实现的 NES 模拟器
- **音频支持**: Web Audio API
- **视频渲染**: Canvas 2D
- **ROM 加载**: HTML5 File API

## 关于游戏 ROM

- 本站不托管任何游戏 ROM 文件
- 用户需要自行准备 .nes 格式的游戏文件
- 仅供个人学习研究使用
- 请尊重游戏版权

## 部署

### GitHub Pages
1. 推送代码到 GitHub
2. 在仓库设置中启用 GitHub Pages
3. 访问 https://用户名.github.io/仓库名

### Vercel/Netlify
1. 推送项目到 GitHub
2. 在 Vercel/Netlify 导入项目
3. 自动部署获取访问链接

## 许可证

MIT License
