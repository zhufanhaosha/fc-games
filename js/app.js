/**
 * FC 经典游戏模拟器 - 主应用逻辑
 * 基于 jsnes 开源项目
 */

(function() {
    'use strict';

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
            
            // 创建 NES 实例
            nes = new NES();
            
            // 设置视频输出
            const ctx = gameCanvas.getContext('2d');
            nes.setVideoContext({
                width: 256,
                height: 240,
                imageData: ctx.createImageData(256, 240)
            });
            
            // 设置音频回调
            nes.setAudioContext(audioContext);
            
            console.log('NES 模拟器初始化完成');
        } catch (e) {
            console.error('模拟器初始化失败:', e);
            alert('模拟器初始化失败，请刷新页面重试');
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
        if (gameKey === 'demo') {
            startDemo();
        } else if (romData) {
            startGame(romData, GAMES[gameKey].name);
        } else {
            // 提示用户上传 ROM
            alert(`请先上传 ${GAMES[gameKey].name} 的 ROM 文件，或选择「演示程序」测试模拟器`);
            document.getElementById('emulatorSection').classList.add('active');
            screenOverlay.classList.remove('hidden');
        }
    }

    // 开始演示程序
    function startDemo() {
        console.log('启动演示程序');
        screenOverlay.classList.add('hidden');
        emulatorSection.classList.add('active');
        resetBtn.disabled = false;
        pauseBtn.disabled = false;
        
        // 这里可以加载一个免费的测试 ROM
        // 暂时使用空 ROM 数据
        const emptyRom = createEmptyRom();
        startGame(emptyRom, '演示');
    }

    // 创建空 ROM (用于演示)
    function createEmptyRom() {
        // NES ROM 格式需要特定的头部
        const header = new Uint8Array([
            0x4E, 0x45, 0x53, 0x1A,  // "NES" + magic
            0x01,  // 16KB PRG
            0x01,  // 8KB CHR
            0x00,  // mapper
            0x00   // flags
        ]);
        
        // 创建空的游戏数据
        const prg = new Uint8Array(16384).fill(0x00);
        const chr = new Uint8Array(8192).fill(0x00);
        
        return new Uint8Array([...header, ...prg, ...chr]);
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
            
            // 设置视频输出
            const ctx = gameCanvas.getContext('2d');
            const imageData = ctx.createImageData(256, 240);
            
            nes.setVideoContext({
                width: 256,
                height: 240,
                imageData: imageData
            });
            
            // 开始游戏循环
            gameLoop = requestAnimationFrame(function loop() {
                if (!isPaused && isPlaying) {
                    // 模拟一帧
                    nes.frame();
                    
                    // 更新显示
                    ctx.putImageData(imageData, 0, 0);
                }
                gameLoop = requestAnimationFrame(loop);
            });
            
            console.log(`游戏 ${name} 启动成功`);
        } catch (e) {
            console.error('启动游戏失败:', e);
            alert(`启动游戏失败: ${e.message}`);
        }
    }

    // 重置游戏
    function resetGame() {
        console.log('重置游戏');
        if (nes && currentGame) {
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
            screenOverlay.querySelector('p').textContent = `点击「选择游戏」开始游玩`;
            
            // 更新游戏卡片
            document.querySelectorAll('.game-card').forEach(card => {
                card.style.opacity = '1';
            });
        };
        
        reader.onerror = function() {
            alert('ROM 文件读取失败，请重试');
        };
        
        reader.readAsArrayBuffer(file);
    }

    // 设置键盘控制
    function setupKeyboardControls() {
        // 这里需要实现 jsnes 的控制器输入
        // 由于 jsnes 的 API 限制，我们暂时使用简单的按键映射
        
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
                        controller.buttonDown(4); // UP
                        break;
                    case 'ArrowDown':
                        controller.buttonDown(5); // DOWN
                        break;
                    case 'ArrowLeft':
                        controller.buttonDown(6); // LEFT
                        break;
                    case 'ArrowRight':
                        controller.buttonDown(7); // RIGHT
                        break;
                    case 'z':
                    case 'Z':
                        controller.buttonDown(0); // A
                        break;
                    case 'x':
                    case 'X':
                        controller.buttonDown(1); // B
                        break;
                    case 'Enter':
                        controller.buttonDown(3); // START
                        break;
                    case 'Shift':
                        controller.buttonDown(2); // SELECT
                        break;
                }
            }
        });
        
        document.addEventListener('keyup', function(e) {
            if (nes) {
                const controller = nes.Controller1;
                
                switch(e.key) {
                    case 'ArrowUp':
                        controller.buttonUp(4);
                        break;
                    case 'ArrowDown':
                        controller.buttonUp(5);
                        break;
                    case 'ArrowLeft':
                        controller.buttonUp(6);
                        break;
                    case 'ArrowRight':
                        controller.buttonUp(7);
                        break;
                    case 'z':
                    case 'Z':
                        controller.buttonUp(0);
                        break;
                    case 'x':
                    case 'X':
                        controller.buttonUp(1);
                        break;
                    case 'Enter':
                        controller.buttonUp(3);
                        break;
                    case 'Shift':
                        controller.buttonUp(2);
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
