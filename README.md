# FC 经典游戏模拟器

纯浏览器端 NES/FC 游戏模拟器，基于 [jsnes](https://github.com/bfirsh/jsnes) 构建。

## 🌐 在线体验

**访问地址**: https://zhufanhaosha.github.io/fc-games/

## 功能特性

- ✅ 纯前端实现，无需后端服务器
- ✅ 支持上传 .nes 格式 ROM 文件
- ✅ 键盘控制：方向键 + Z/X/Enter/Shift
- ✅ 暂停/重置/全屏功能
- ✅ 响应式设计，支持移动端
- ✅ 复古游戏界面风格

## 使用方法

### 本地运行
```bash
cd fc-games
python3 -m http.server 8080
```
然后访问 http://localhost:8080

### 使用网站
1. 打开 https://zhufanhaosha.github.io/fc-games/
2. 点击「选择 ROM 文件」上传你的 .nes 游戏
3. 选择游戏开始游玩

### 操控说明
| 按键 | 功能 |
|------|------|
| ↑↓←→ | 方向键移动 |
| Z | A 键（跳跃/确认） |
| X | B 键（射击/加速） |
| Enter | Start 键 |
| Shift | Select 键 |
| R | 重置游戏 |
| Space | 暂停/继续 |

## 项目结构

```
fc-games/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式表
├── js/
│   ├── jsnes.min.js    # NES 模拟器核心
│   └── app.js          # 应用逻辑
├── README.md
└── COMPLETE.md
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

## 许可证

MIT License
