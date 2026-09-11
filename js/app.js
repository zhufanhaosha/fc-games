/**
 * FC 经典游戏模拟器 - 主应用逻辑
 * 基于 jsnes 开源项目
 * 支持服务端 ROM 存储
 */

(function() {
    'use strict';

    const jsnes = window.jsnes;
    const NES = jsnes.NES;
    const Controller = jsnes.Controller;

    // 游戏配置（内置演示）
    const GAMES = {
        demo: { name: '演示程序', icon: '🎮', desc: '测试模拟器功能' },
        supermario: { name: '超级马里奥', icon: '🍄', desc: '经典平台跳跃' },
        tetris: { name: '俄罗斯方块', icon: '🧱', desc: '经典益智游戏' },
        contra: { name: '魂斗罗', icon: '🔫', desc: '经典射击游戏' },
        smw: { name: '马里奥赛车', icon: '🏎️', desc: '赛车竞速' }
    };

    // ROM 服务器地址（在 cloudflare worker 部署后填入）
    // 示例：const API_BASE = 'https://fc-games-xxx.workers.dev';
    const API_BASE = 'https://fc-roms.568238911.workers.dev'; // Cloudflare Worker

    // 游戏状态
    let nes = null;
    let audioContext = null;
    let gameLoop = null;
    let isPaused = false;
    let isPlaying = false;
    let currentGame = null;
    let romData = null;
    let romName = null;
    let romId = null;
    let imageData = null;
    let canvasCtx = null;
    let serverRoms = []; // 从服务器获取的 ROM 列表

    // DOM 元素
    const gameGrid = document.getElementById('gameGrid');
    const romUpload = document.getElementById('romUpload');
    const emulatorSection = document.getElementById('emulatorSection');
    const gameCanvas = document.getElementById('gameCanvas');
    const screenOverlay = document.getElementById('screenOverlay');
    const resetBtn = document.getElementById('resetBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const uploadStatus = document.getElementById('uploadStatus');

    // 初始化
    function init() {
        console.log('初始化模拟器...');
        initNES();
        loadServerRoms();
        renderGameGrid();
        setupEventListeners();
        setupKeyboardControls();
    }

    // 初始化 NES 模拟器
    function initNES() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            canvasCtx = gameCanvas.getContext('2d');
            
            const offscreen = document.createElement('canvas');
            offscreen.width = 256;
            offscreen.height = 240;
            const offCtx = offscreen.getContext('2d');
            imageData = offCtx.createImageData(256, 240);
            
            nes = new NES({
                onFrame: function(frameBuffer) {
                    const data = imageData.data;
                    for (let i = 0; i < 61440; i++) {
                        const p = frameBuffer[i];
                        const idx = i * 4;
                        data[idx]     = (p >> 16) & 0xFF;
                        data[idx + 1] = (p >> 8) & 0xFF;
                        data[idx + 2] = p & 0xFF;
                        data[idx + 3] = 0xFF;
                    }
                    offCtx.putImageData(imageData, 0, 0);
                    canvasCtx.drawImage(offscreen, 0, 0);
                },
                onAudioSample: function() {}
            });
            
            console.log('NES 模拟器初始化完成');
            return true;
        } catch (e) {
            console.error('模拟器初始化失败:', e);
            alert('模拟器初始化失败，请刷新页面重试');
            return false;
        }
    }

    // 从服务器加载 ROM 列表
    function loadServerRoms() {
        fetch(`${API_BASE}/api/roms`)
            .then(r => r.json())
            .then(data => {
                serverRoms = data;
                console.log(`加载了 ${data.length} 个 ROM`);
                renderGameGrid();
            })
            .catch(e => console.log('服务器未连接，使用本地模式', e));
    }

    // 渲染游戏选择网格
    function renderGameGrid() {
        gameGrid.innerHTML = '';
        
        // 显示服务器上的 ROM
        if (serverRoms.length > 0) {
            const section = document.createElement('div');
            section.style.cssText = 'width:100%;margin-bottom:1rem;color:var(--text-secondary);font-size:0.9rem;';
            section.textContent = `📁 服务器 ROM (${serverRoms.length})`;
            gameGrid.appendChild(section);
            
            serverRoms.forEach(rom => {
                const card = document.createElement('div');
                card.className = 'game-card saved';
                card.innerHTML = `
                    <div class="game-card-icon">🎮</div>
                    <div class="game-card-name">${rom.name}</div>
                    <div class="game-card-desc">${rom.sizeKB}KB</div>
                `;
                card.addEventListener('click', () => downloadAndStart(rom));
                gameGrid.appendChild(card);
            });
        }
        
        // 显示内置游戏
        Object.entries(GAMES).forEach(([key, game]) => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <div class="game-card-icon">${game.icon}</div>
                <div class="game-card-name">${game.name}</div>
                <div class="game-card-desc">${game.desc}</div>
            `;
            card.addEventListener('click', () => selectGame(key));
            gameGrid.appendChild(card);
        });
    }

    // 从服务器下载并开始游戏
    function downloadAndStart(rom) {
        console.log(`下载并启动: ${rom.name}`);
        fetch(`${API_BASE}/api/download/${rom.id}`)
            .then(r => {
                if (!r.ok) throw new Error('下载失败');
                return r.arrayBuffer();
            })
            .then(data => {
                romData = new Uint8Array(data);
                romName = rom.name;
                startGame(romData, romName);
            })
            .catch(e => {
                console.error('下载失败:', e);
                alert('ROM 下载失败，请重试');
            });
    }

    // 选择游戏
    function selectGame(gameKey) {
        if (romData) {
            startGame(romData, GAMES[gameKey].name);
        } else {
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
        if (!nes) { alert('模拟器未初始化'); return; }
        
        try {
            nes.loadROM(rom);
            currentGame = name;
            isPlaying = true;
            isPaused = false;
            
            screenOverlay.classList.add('hidden');
            emulatorSection.classList.add('active');
            resetBtn.disabled = false;
            pauseBtn.disabled = false;
            
            if (gameLoop) cancelAnimationFrame(gameLoop);
            
            function gameLoopFn() {
                if (!isPaused && isPlaying) nes.frame();
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
        if (nes && currentGame && romData) {
            isPaused = false;
            startGame(romData, currentGame);
        }
    }

    // 暂停/继续
    function togglePause() {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '继续 (Space)' : '暂停 (Space)';
    }

    // 全屏模式
    function toggleFullscreen() {
        const screen = document.querySelector('.screen-wrapper');
        if (!document.fullscreenElement) {
            screen.requestFullscreen().catch(err => console.error('全屏失败:', err));
        } else {
            document.exitFullscreen();
        }
    }

    // 设置事件监听
    function setupEventListeners() {
        romUpload.addEventListener('change', handleRomUpload);
        resetBtn.addEventListener('click', resetGame);
        pauseBtn.addEventListener('click', togglePause);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // 处理 ROM 上传
    function handleRomUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log(`上传 ROM: ${file.name}`);
        
        const formData = new FormData();
        formData.append('rom', file);
        
        // 显示上传中状态
        if (uploadStatus) {
            uploadStatus.textContent = '上传中...';
            uploadStatus.style.display = 'block';
        }
        
        fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    romData = null; // 不存内存，从服务器加载
                    romName = data.rom.name;
                    romId = data.rom.id;
                    
                    if (uploadStatus) {
                        uploadStatus.textContent = `✅ 上传成功: ${file.name}`;
                        uploadStatus.style.color = 'var(--success)';
                    }
                    
                    // 重新加载 ROM 列表
                    loadServerRoms();
                    
                    // 显示模拟器区域
                    document.getElementById('emulatorSection').classList.add('active');
                    screenOverlay.classList.remove('hidden');
                    screenOverlay.querySelector('h3').textContent = 'ROM 已上传';
                    screenOverlay.querySelector('p').textContent = `已上传: ${file.name}，点击游戏卡片开始游玩`;
                } else {
                    throw new Error(data.error || '上传失败');
                }
            })
            .catch(e => {
                console.error('上传失败:', e);
                if (uploadStatus) {
                    uploadStatus.textContent = `❌ 上传失败: ${e.message}`;
                    uploadStatus.style.color = '#ef4444';
                }
                alert(`上传失败: ${e.message}\n\n如需服务器存储功能，请部署后端服务后修改 API_BASE 地址。`);
            });
        
        // 清空 input 以便重复上传同名文件
        event.target.value = '';
    }

    // 设置键盘控制
    function setupKeyboardControls() {
        document.addEventListener('keydown', function(e) {
            if (e.key.toLowerCase() === 'r') resetGame();
            if (e.key === ' ') { e.preventDefault(); togglePause(); }
            
            if (nes) {
                const c = nes.controllers[1] || nes.Controller1;
                switch(e.key) {
                    case 'ArrowUp': c.buttonDown(Controller.BUTTON_UP); break;
                    case 'ArrowDown': c.buttonDown(Controller.BUTTON_DOWN); break;
                    case 'ArrowLeft': c.buttonDown(Controller.BUTTON_LEFT); break;
                    case 'ArrowRight': c.buttonDown(Controller.BUTTON_RIGHT); break;
                    case 'z': case 'Z': c.buttonDown(Controller.BUTTON_A); break;
                    case 'x': case 'X': c.buttonDown(Controller.BUTTON_B); break;
                    case 'Enter': c.buttonDown(Controller.BUTTON_START); break;
                    case 'Shift': c.buttonDown(Controller.BUTTON_SELECT); break;
                }
            }
        });
        
        document.addEventListener('keyup', function(e) {
            if (nes) {
                const c = nes.controllers[1] || nes.Controller1;
                switch(e.key) {
                    case 'ArrowUp': c.buttonUp(Controller.BUTTON_UP); break;
                    case 'ArrowDown': c.buttonUp(Controller.BUTTON_DOWN); break;
                    case 'ArrowLeft': c.buttonUp(Controller.BUTTON_LEFT); break;
                    case 'ArrowRight': c.buttonUp(Controller.BUTTON_RIGHT); break;
                    case 'z': case 'Z': c.buttonUp(Controller.BUTTON_A); break;
                    case 'x': case 'X': c.buttonUp(Controller.BUTTON_B); break;
                    case 'Enter': c.buttonUp(Controller.BUTTON_START); break;
                    case 'Shift': c.buttonUp(Controller.BUTTON_SELECT); break;
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
