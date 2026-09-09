/**
 * FC 经典游戏模拟器 - 主应用逻辑
 * 基于 jsnes 开源项目
 */

(function() {
    'use strict';

    // 获取 jsnes 库
    const jsnes = window.jsnes;
    const NES = jsnes.NES;
    const Controller = jsnes.Controller;

    // 游戏配置
    const GAMES = {
        demo: {
            name: '演示程序',
            icon: '🎮',
            desc: '测试模拟器功能',
            rom: null
        },
        supermario: {
            name: '超级马里奥',
            icon: '🍄',
            desc: '经典平台跳跃',
            rom: null
        },
        tetris: {
            name: '俄罗斯方块',
            icon: '🧱',
            desc: '经典益智游戏',
            rom: null
        },
        contra: {
            name: '魂斗罗',
            icon: '🔫',
            desc: '经典射击游戏',
            rom: null
        },
        smw: {
            name: '马里奥赛车',
            icon: '🏎️',
            desc: '赛车竞速',
            rom: null
        }
    };

    // 游戏状态
    let nes = null;
    let audioContext = null;
    let gameLoop = null;
    let isPaused = false;
    let isPlaying = false;
    let currentGame = null;
    let romData = null;
    let imageData = null;
    let canvasCtx = null;

    // DOM 元素
    const gameGrid = document.getElementById('gameGrid');
    const romUpload = document.getElementById('romUpload');
    const emulatorSection = document.getElementById('emulatorSection');
    const gameCanvas = document.getElementById('gameCanvas');
    const screenOverlay = document.getElementById('screenOverlay');
    const resetBtn = document.getElementById('resetBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // 初始化
    function init() {
        console.log('初始化模拟器...');
        initNES();
        renderGameGrid();
        setupEventListeners();
        setupKeyboardControls();
    }

    // 初始化 NES 模拟器
    function initNES() {
        try {
            // 创建音频上下文
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 获取 Canvas 上下文
            canvasCtx = gameCanvas.getContext('2d');
            
            // 创建离屏 Canvas（NES 原生 256x240）
            const offscreen = document.createElement('canvas');
            offscreen.width = 256;
            offscreen.height = 240;
            const offCtx = offscreen.getContext('2d');
            imageData = offCtx.createImageData(256, 240);
            
            // 创建 NES 实例
            nes = new NES({
                onFrame: function(frameBuffer) {
                    // frameBuffer 是 Uint32Array(61440)，每像素 32 位
                    // 转换为 RGBA Uint8ClampedArray
                    const data = imageData.data;
                    for (let i = 0; i < 61440; i++) {
                        const p = frameBuffer[i];
                        const idx = i * 4;
                        data[idx]     = (p >> 16) & 0xFF; // R
                        data[idx + 1] = (p >> 8) & 0xFF;  // G
                        data[idx + 2] = p & 0xFF;         // B
                        data[idx + 3] = 0xFF;             // A
                    }
                    // 先画到离屏 Canvas
                    offCtx.putImageData(imageData, 0, 0);
                    // 再缩放到显示 Canvas（CSS 负责视觉放大）
                    canvasCtx.drawImage(offscreen, 0, 0);
                },
                onAudioSample: function(l, r) {
                    // 音频处理
                }
            });
            
            console.log('NES 模拟器初始化完成');
            return true;
        } catch (e) {
            console.error('模拟器初始化失败:', e);
            alert('模拟器初始化失败，请刷新页面重试');
            return false;
        }
    }

    // 渲染游戏选择网格
    function renderGameGrid() {
        gameGrid.innerHTML = '';
        
        Object.entries(GAMES).forEach(([key, game]) => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = key;
            card.innerHTML = `
                <div class="game-card-icon">${game.icon}</div>
                <div class="game-card-name">${game.name}</div>
                <div class="game-card-desc">${game.desc}</div>
            `;
            
            card.addEventListener('click', () => selectGame(key));
            gameGrid.appendChild(card);
        });
    }

    // 选择游戏
    function selectGame(gameKey) {
        if (romData) {
            startGame(romData, GAMES[gameKey].name);
        } else {
            // 提示用户上传 ROM
            alert('请先上传 .nes 格式的 ROM 文件，然后点击游戏开始游玩！');
            document.getElementById('emulatorSection').classList.add('active');
            screenOverlay.classList.remove('hidden');
            screenOverlay.querySelector('h3').textContent = '请上传 ROM 文件';
            screenOverlay.querySelector('p').textContent = '点击「选择 ROM 文件」按钮上传你的 .nes 游戏文件';
        }
    }

    // 开始游戏
    function startGame(rom, name) {
        console.log(`启动游戏: ${name}`);
        
        if (!nes) {
            alert('模拟器未初始化');
            return;
        }
        
        try {
            // 加载 ROM
            nes.loadROM(rom);
            currentGame = name;
            isPlaying = true;
            isPaused = false;
            
            // 显示模拟器界面
            screenOverlay.classList.add('hidden');
            emulatorSection.classList.add('active');
            resetBtn.disabled = false;
            pauseBtn.disabled = false;
            
            // 启动游戏循环
            if (gameLoop) {
                cancelAnimationFrame(gameLoop);
            }
            
            // 开始游戏循环
            function gameLoopFn() {
                if (!isPaused && isPlaying) {
                    nes.frame();
                }
                gameLoop = requestAnimationFrame(gameLoopFn);
            }
            gameLoop = requestAnimationFrame(gameLoopFn);
            
            console.log(`游戏 ${name} 启动成功`);
        } catch (e) {
            console.error('启动游戏失败:', e);
            alert(`启动游戏失败: ${e.message}`);
        }
    }

    // 重置游戏
    function resetGame() {
        console.log('重置游戏');
        if (nes && currentGame && romData) {
            isPaused = false;
            startGame(romData, currentGame);
        }
    }

    // 暂停/继续
    function togglePause() {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '继续 (Space)' : '暂停 (Space)';
        console.log(isPaused ? '游戏已暂停' : '游戏继续');
    }

    // 全屏模式
    function toggleFullscreen() {
        const screen = document.querySelector('.screen-wrapper');
        if (!document.fullscreenElement) {
            screen.requestFullscreen().catch(err => {
                console.error('全屏失败:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // 设置事件监听
    function setupEventListeners() {
        // ROM 上传
        romUpload.addEventListener('change', handleRomUpload);
        
        // 控制按钮
        resetBtn.addEventListener('click', resetGame);
        pauseBtn.addEventListener('click', togglePause);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // 处理 ROM 上传
    function handleRomUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log(`上传 ROM: ${file.name}`);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            romData = new Uint8Array(e.target.result);
            console.log(`ROM 加载成功，大小: ${romData.length} 字节`);
            
            // 显示提示
            alert(`已加载 ROM: ${file.name}\n\n现在可以选择游戏开始游玩！`);
            
            // 自动启动
            document.getElementById('emulatorSection').classList.add('active');
            screenOverlay.classList.remove('hidden');
            screenOverlay.querySelector('h3').textContent = 'ROM 已加载';
            screenOverlay.querySelector('p').textContent = `点击游戏卡片开始游玩 ${file.name}`;
        };
        
        reader.onerror = function() {
            alert('ROM 文件读取失败，请重试');
        };
        
        reader.readAsArrayBuffer(file);
    }

    // 设置键盘控制
    function setupKeyboardControls() {
        document.addEventListener('keydown', function(e) {
            // 重置
            if (e.key.toLowerCase() === 'r') {
                resetGame();
            }
            
            // 暂停
            if (e.key === ' ') {
                e.preventDefault();
                togglePause();
            }
            
            // 方向键映射到控制器
            if (nes) {
                const controller = nes.Controller1;
                
                switch(e.key) {
                    case 'ArrowUp':
                        controller.buttonDown(Controller.BUTTON_UP);
                        break;
                    case 'ArrowDown':
                        controller.buttonDown(Controller.BUTTON_DOWN);
                        break;
                    case 'ArrowLeft':
                        controller.buttonDown(Controller.BUTTON_LEFT);
                        break;
                    case 'ArrowRight':
                        controller.buttonDown(Controller.BUTTON_RIGHT);
                        break;
                    case 'z':
                    case 'Z':
                        controller.buttonDown(Controller.BUTTON_A);
                        break;
                    case 'x':
                    case 'X':
                        controller.buttonDown(Controller.BUTTON_B);
                        break;
                    case 'Enter':
                        controller.buttonDown(Controller.BUTTON_START);
                        break;
                    case 'Shift':
                        controller.buttonDown(Controller.BUTTON_SELECT);
                        break;
                }
            }
        });
        
        document.addEventListener('keyup', function(e) {
            if (nes) {
                const controller = nes.Controller1;
                
                switch(e.key) {
                    case 'ArrowUp':
                        controller.buttonUp(Controller.BUTTON_UP);
                        break;
                    case 'ArrowDown':
                        controller.buttonUp(Controller.BUTTON_DOWN);
                        break;
                    case 'ArrowLeft':
                        controller.buttonUp(Controller.BUTTON_LEFT);
                        break;
                    case 'ArrowRight':
                        controller.buttonUp(Controller.BUTTON_RIGHT);
                        break;
                    case 'z':
                    case 'Z':
                        controller.buttonUp(Controller.BUTTON_A);
                        break;
                    case 'x':
                    case 'X':
                        controller.buttonUp(Controller.BUTTON_B);
                        break;
                    case 'Enter':
                        controller.buttonUp(Controller.BUTTON_START);
                        break;
                    case 'Shift':
                        controller.buttonUp(Controller.BUTTON_SELECT);
                        break;
                }
            }
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
