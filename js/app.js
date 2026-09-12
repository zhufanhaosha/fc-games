/**
 * FC 经典游戏模拟器 - 主应用逻辑
 * 基于 jsnes 开源项目
 * 功能：ROM 存储、密码登录、云存档、手柄控制
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

    // ROM 服务器地址（绑定自定义域名，避免 workers.dev 被墙）
    const API_BASE = 'https://api.zhufan.cc.cd';

    // 存储 key
    const TOKEN_KEY = 'fc_games_token';
    const TOKEN_KEY_SESSION = 'fc_games_token_session';
    const REMEMBER_KEY = 'fc_games_remember';

    // 安全的存储访问（手机隐私模式/localStorage 禁用时不崩溃）
    const store = {
        get(key) {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set(key, val) {
            try { localStorage.setItem(key, val); } catch (e) { /* 忽略 */ }
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch (e) { /* 忽略 */ }
        },
        sget(key) {
            try { return sessionStorage.getItem(key); } catch (e) { return null; }
        },
        sset(key, val) {
            try { sessionStorage.setItem(key, val); } catch (e) { /* 忽略 */ }
        },
        sremove(key) {
            try { sessionStorage.removeItem(key); } catch (e) { /* 忽略 */ }
        }
    };

    // 封面库（libretro-thumbnails 开源封面库）
    const COVER_BASE = 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Entertainment_System/master/Named_Boxarts/';
    // ROM 名称（上传时的文件名）→ 封面文件名映射
    const COVER_MAP = {
        "Battle City[GYCH]": "Battle City (1985-09-09)(Namco)(JP).png",
        "LOAD RUNNER": "Lode Runner (USA).png",
        "松鼠大戰 J體力不減命數不減 BY 疾風之狼": "Chip 'n Dale - Rescue Rangers (USA).png",
        "Mitsume ga Tooru [MS]": "Mitsume ga Tooru (Japan).png",
        "双截龙2代无限人数版": "Double Dragon II - The Revenge (USA) (Rev 1).png",
        "双截龙1代加强版": "Double Dragon (1988-06)(Tradewest)(US).png",
        "19.激龟忍者传2无敌HACK": "Teenage Mutant Ninja Turtles II - The Arcade Game (USA).png",
        "8.热血格斗单人出合体技版": "Downtown - Nekketsu Koushinkyoku - Soreyuke Daiundoukai (Japan).png",
        "248.热血篮球_无限跳跃HACK版 V1.1": "Nekketsu! Street Basket - Ganbare Dunk Heroes (Japan).png",
        "马戏团不减命无限跳跃[CH]": "Circus Charlie (Japan).png",
        "68.冒险岛无敌版(HACK)": "Adventure Island (USA).png",
        "超级马里奥 10条命 火人 全屏攻击 无限跳 ": "Super Mario Bros. (World).png",
        "龙珠Z - 超武斗传2 气波连打": "Datach - Dragon Ball Z - Gekitou Tenkaichi Budoukai (Japan).png",
        "128.激龟忍者传-无敌版": "Teenage Mutant Ninja Turtles (USA).png",
        "FC街霸9人SUPPER版！": "Street Fighter 2010 - The Final Fight (USA).png",
        "怪鸭历险记(命不减,血不减)by danch744": "Darkwing Duck (USA).png",
        "199.古巴革命人数无限": "Guerrilla War (USA).png",
        "Galaga(MS CN)": "Galaga - Demons of Death (USA).png",
        "202.吃豆人数不减": "Pac-Man (USA) (Namco) (Virtual Console).png",
        "1942(MS CH)": "1942 (1985-12-11)(Capcom)(JP-US).png",
        "232.唐老鸭梦冒险(血时间命无限)": "DuckTales (USA).png",
        "93超级魂加强版": "Super Contra (Japan).png"
    };
    // 获取 ROM 封面 URL（找不到返回 null）
    function getCoverUrl(romName) {
        const cover = COVER_MAP[romName];
        if (!cover) return null;
        return COVER_BASE + encodeURIComponent(cover).replace(/%2F/g, '/');
    }

    // 游戏状态
    let nes = null;
    let audioContext = null;
    let gameLoop = null;
    let isPaused = false;
    let isPlaying = false;
    let currentGame = null;
    let currentRomId = null;
    let romData = null;
    let romName = null;
    let imageData = null;
    let canvasCtx = null;
    let serverRoms = [];
    let token = '';
    let isTouch = false;
    let gamepadIndex = null;

    // 恢复登录状态：优先 localStorage（记住我），其次 sessionStorage（本次会话）
    function restoreToken() {
        if (store.get(TOKEN_KEY)) {
            token = store.get(TOKEN_KEY);
        } else if (store.sget(TOKEN_KEY_SESSION)) {
            token = store.sget(TOKEN_KEY_SESSION);
        } else {
            token = '';
        }
    }
    restoreToken();

    // DOM 元素
    const gameGrid = document.getElementById('gameGrid');
    const romUpload = document.getElementById('romUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const emulatorSection = document.getElementById('emulatorSection');
    const gameCanvas = document.getElementById('gameCanvas');
    const screenOverlay = document.getElementById('screenOverlay');
    const resetBtn = document.getElementById('resetBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const romCount = document.getElementById('romCount');
    const gamepadHint = document.getElementById('gamepadHint');
    const virtualGamepad = document.getElementById('virtualGamepad');
    const loginBtn = document.getElementById('loginBtn');
    const loginStatus = document.getElementById('loginStatus');
    const logoutBtn = document.getElementById('logoutBtn');
    const changePwdBtn = document.getElementById('changePwdBtn');

    // ==================== 认证 ====================

    function authHeaders(extra) {
        const h = extra || {};
        if (token) h['X-Auth-Token'] = token;
        return h;
    }

    function isLoggedIn() {
        return !!token;
    }

    function updateAuthUI() {
        if (isLoggedIn()) {
            loginBtn.style.display = 'none';
            loginStatus.style.display = 'flex';
        } else {
            loginBtn.style.display = '';
            loginStatus.style.display = 'none';
        }
    }

    async function apiLogin(password, remember) {
        const r = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await r.json();
        if (!data.success) throw new Error(data.error || '登录失败');
        token = data.token;
        // 记住我：token 存 localStorage（持久）；否则存 sessionStorage（关闭浏览器失效）
        if (remember) {
            store.set(TOKEN_KEY, token);
            store.set(REMEMBER_KEY, '1');
            store.sremove(TOKEN_KEY_SESSION);
        } else {
            store.sset(TOKEN_KEY_SESSION, token);
            store.remove(TOKEN_KEY);
            store.set(REMEMBER_KEY, '0');
        }
        updateAuthUI();
        return data;
    }

    function logout() {
        token = '';
        store.remove(TOKEN_KEY);
        store.sremove(TOKEN_KEY_SESSION);
        updateAuthUI();
    }

    // ==================== 初始化 ====================

    function init() {
        console.log('初始化模拟器...');
        initNES();
        updateAuthUI();

        if (!isLoggedIn()) {
            // 未登录：自动弹出登录框，且不加载服务器数据
            setTimeout(() => openModal('loginModal'), 300);
        } else {
            loadServerRoms();
        }
        renderGameGrid();
        setupEventListeners();
        setupKeyboardControls();
        setupModalClose();
        setupGamepad();
        setupTouchControls();
    }

    // 初始化 NES 模拟器
    function initNES() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            canvasCtx = gameCanvas.getContext('2d');

            // ---- 音频输出 ----
            // 样本队列：jsnes 每帧产生约 sampleRate/60 个样本
            const audioQueue = [];
            let audioNode = null;
            try {
                // 使用 ScriptProcessorNode 播放收集到的音频样本
                audioNode = audioContext.createScriptProcessor(4096, 0, 2);
                audioNode.onaudioprocess = function(e) {
                    const outL = e.outputBuffer.getChannelData(0);
                    const outR = e.outputBuffer.getChannelData(1);
                    for (let i = 0; i < outL.length; i++) {
                        if (audioQueue.length >= 2) {
                            outL[i] = audioQueue.shift();
                            outR[i] = audioQueue.shift();
                        } else {
                            outL[i] = 0;
                            outR[i] = 0;
                        }
                    }
                };
                audioNode.connect(audioContext.destination);
            } catch (e) {
                console.warn('音频初始化失败:', e);
            }

            const offscreen = document.createElement('canvas');
            offscreen.width = 256;
            offscreen.height = 240;
            const offCtx = offscreen.getContext('2d');
            imageData = offCtx.createImageData(256, 240);

            nes = new NES({
                sampleRate: 48000,
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
                onAudioSample: function(left, right) {
                    if (audioNode) {
                        audioQueue.push(left, right);
                        // 限制队列长度，防止内存增长（约 0.2 秒）
                        if (audioQueue.length > 48000 * 2 * 0.2) {
                            audioQueue.splice(0, audioQueue.length - 48000 * 2 * 0.2);
                        }
                    }
                }
            });

            // 浏览器自动播放策略：需要用户交互后才允许播放
            const resumeAudio = () => {
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().catch(() => {});
                }
            };
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);

            console.log('NES 模拟器初始化完成');
            return true;
        } catch (e) {
            console.error('模拟器初始化失败:', e);
            alert('模拟器初始化失败，请刷新页面重试');
            return false;
        }
    }

    // ==================== 服务器数据 ====================

    // 从服务器加载 ROM 列表
    function loadServerRoms() {
        if (!isLoggedIn()) return;
        fetch(`${API_BASE}/api/roms`, { headers: authHeaders() })
            .then(r => {
                if (r.status === 401) throw new Error('未登录');
                return r.json();
            })
            .then(data => {
                serverRoms = data;
                console.log(`加载了 ${data.length} 个 ROM`);
                renderGameGrid();
            })
            .catch(e => {
                console.log('服务器未连接', e);
                if (isLoggedIn()) openModal('loginModal');
            });
    }

    // 渲染游戏选择网格
    function renderGameGrid() {
        gameGrid.innerHTML = '';
        romCount.textContent = serverRoms.length ? `(${serverRoms.length} 个)` : '';
        const loggedIn = isLoggedIn();

        // 未登录：只显示提示
        if (!loggedIn) {
            const hint = document.createElement('div');
            hint.className = 'game-card';
            hint.style.cssText = 'grid-column:1/-1;text-align:center;padding:2rem;cursor:default;';
            hint.innerHTML = `
                <div class="game-card-icon">🔒</div>
                <div class="game-card-name">请先登录</div>
                <div class="game-card-desc">输入密码后即可查看和游玩游戏</div>
            `;
            hint.addEventListener('click', () => openModal('loginModal'));
            gameGrid.appendChild(hint);
            return;
        }

        // 显示服务器上的 ROM
        if (serverRoms.length > 0) {
            const section = document.createElement('div');
            section.style.cssText = 'width:100%;margin-bottom:1rem;color:var(--text-secondary);font-size:0.9rem;';
            section.textContent = `📁 服务器 ROM (${serverRoms.length})`;
            gameGrid.appendChild(section);

            serverRoms.forEach(rom => {
                const card = document.createElement('div');
                card.className = 'game-card saved';
                const coverUrl = getCoverUrl(rom.name);
                card.innerHTML = `
                    <div class="game-card-icon">${coverUrl ? `<img class="game-cover" src="${coverUrl}" alt="${rom.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">` : '🎮'}</div>
                    <div class="game-card-name">${rom.name}</div>
                    <div class="game-card-desc">${rom.sizeKB}KB · ${formatTime(rom.uploadTime)}</div>
                    ${loggedIn ? `<button class="card-delete" data-id="${rom.id}" title="删除">&times;</button>` : ''}
                `;
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('card-delete')) return;
                    downloadAndStart(rom);
                });
                const delBtn = card.querySelector('.card-delete');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showDeleteConfirm(rom);
                    });
                }
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

    function formatTime(t) {
        if (!t) return '';
        try {
            const d = new Date(t);
            return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        } catch (e) { return ''; }
    }

    // 从服务器下载并开始游戏
    function downloadAndStart(rom) {
        console.log(`下载并启动: ${rom.name}`);
        fetch(`${API_BASE}/api/download/${rom.id}`, { headers: authHeaders() })
            .then(r => {
                if (r.status === 401) throw new Error('未登录，请先登录');
                if (!r.ok) throw new Error('下载失败');
                return r.arrayBuffer();
            })
            .then(data => {
                romData = new Uint8Array(data);
                romName = rom.name;
                currentRomId = rom.id;
                startGame(romData, romName);
            })
            .catch(e => {
                console.error('下载失败:', e);
                alert('ROM 下载失败，请重试');
            });
    }

    // 选择游戏（内置演示用）
    function selectGame(gameKey) {
        if (romData) {
            currentRomId = null;
            startGame(romData, GAMES[gameKey].name);
        } else {
            alert('请先上传 .nes 格式的 ROM 文件，然后点击游戏开始游玩！');
            document.getElementById('emulatorSection').classList.add('active');
            screenOverlay.classList.remove('hidden');
            screenOverlay.querySelector('h3').textContent = '请上传 ROM 文件';
            screenOverlay.querySelector('p').textContent = '点击「选择 ROM 文件」按钮上传你的 .nes 游戏文件';
        }
    }

    // ==================== 游戏控制 ====================

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
            saveBtn.disabled = !currentRomId;
            loadBtn.disabled = !currentRomId;

            if (gameLoop) cancelAnimationFrame(gameLoop);

            function gameLoopFn() {
                if (!isPaused && isPlaying) nes.frame();
                pollGamepad();
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
            screen.requestFullscreen().then(() => showFullscreenHint()).catch(err => console.error('全屏失败:', err));
        } else {
            document.exitFullscreen();
        }
    }

    // 全屏提示
    function showFullscreenHint() {
        let hint = document.getElementById('fullscreenHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'fullscreenHint';
            hint.className = 'fullscreen-hint';
            hint.textContent = '按 ESC 退出全屏';
            document.body.appendChild(hint);
        }
        hint.classList.add('show');
        clearTimeout(hint._t);
        hint._t = setTimeout(() => hint.classList.remove('show'), 2000);
    }

    // ==================== 云存档 ====================

    // 保存存档 (F5)
    async function saveGame() {
        if (!nes || !currentRomId) {
            alert('请先打开一个服务器上的游戏');
            return;
        }
        if (!isLoggedIn()) {
            alert('请先登录');
            openModal('loginModal');
            return;
        }
        try {
            const state = nes.toJSON();
            const data = state ? JSON.stringify(state) : '';
            if (!data) { alert('存档数据为空'); return; }
            const r = await fetch(`${API_BASE}/api/save/${currentRomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ data })
            });
            const res = await r.json();
            if (!res.success) throw new Error(res.error || '保存失败');
            flashMsg('💾 存档成功');
        } catch (e) {
            console.error('存档失败:', e);
            alert(`存档失败: ${e.message}`);
        }
    }

    // 读取存档 (F9)
    async function loadGame() {
        if (!nes || !currentRomId) {
            alert('请先打开一个服务器上的游戏');
            return;
        }
        if (!isLoggedIn()) {
            alert('请先登录');
            openModal('loginModal');
            return;
        }
        try {
            const r = await fetch(`${API_BASE}/api/save/${currentRomId}`, {
                headers: authHeaders()
            });
            const res = await r.json();
            if (!res.success) throw new Error(res.error || '没有存档');
            nes.fromJSON(JSON.parse(res.data));
            flashMsg('📂 读档成功');
        } catch (e) {
            console.error('读档失败:', e);
            alert(`读档失败: ${e.message}`);
        }
    }

    // 短暂提示
    function flashMsg(text) {
        const overlay = document.querySelector('.screen-wrapper');
        let tip = document.getElementById('flashTip');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'flashTip';
            tip.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#4ade80;padding:8px 16px;border-radius:8px;font-size:14px;z-index:99;pointer-events:none;transition:opacity 0.5s;';
            overlay.appendChild(tip);
        }
        tip.textContent = text;
        tip.style.opacity = '1';
        clearTimeout(tip._timer);
        tip._timer = setTimeout(() => { tip.style.opacity = '0'; }, 1500);
    }

    // ==================== 文件管理 ====================

    function showDeleteConfirm(rom) {
        const modal = document.getElementById('deleteModal');
        document.getElementById('deleteConfirmText').textContent = `确定要删除「${rom.name}」吗？游戏文件和存档都会删除，不可恢复。`;
        modal._rom = rom;
        openModal('deleteModal');
    }

    async function confirmDelete() {
        const modal = document.getElementById('deleteModal');
        const rom = modal._rom;
        if (!rom) return;
        try {
            const r = await fetch(`${API_BASE}/api/roms/${rom.id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            const res = await r.json();
            if (!res.success) throw new Error(res.error || '删除失败');
            flashMsg(`🗑️ 已删除: ${rom.name}`);
            loadServerRoms();
        } catch (e) {
            alert(`删除失败: ${e.message}`);
        } finally {
            closeModal('deleteModal');
        }
    }

    // ==================== 上传 ====================

    function handleRomUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!isLoggedIn()) {
            alert('请先登录后再上传 ROM');
            openModal('loginModal');
            event.target.value = '';
            return;
        }

        console.log(`上传 ROM: ${file.name}`);

        const formData = new FormData();
        formData.append('rom', file);

        if (uploadStatus) {
            uploadStatus.textContent = '上传中...';
            uploadStatus.style.display = 'block';
            uploadStatus.style.color = 'var(--text-secondary)';
        }

        fetch(`${API_BASE}/api/upload`, { method: 'POST', headers: authHeaders(), body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    romData = null;
                    romName = data.rom.name;
                    currentRomId = data.rom.id;

                    if (uploadStatus) {
                        uploadStatus.textContent = `✅ 上传成功: ${file.name}`;
                        uploadStatus.style.color = 'var(--success)';
                    }

                    loadServerRoms();

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
                alert(`上传失败: ${e.message}`);
            });

        event.target.value = '';
    }

    // ==================== 弹窗 ====================

    function openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    }

    function closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    }

    function setupModalClose() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => closeModal(btn.dataset.modal));
        });
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.add('hidden');
            });
        });
    }

    // ==================== 事件监听 ====================

    function setupEventListeners() {
        romUpload.addEventListener('change', handleRomUpload);
        resetBtn.addEventListener('click', resetGame);
        pauseBtn.addEventListener('click', togglePause);
        saveBtn.addEventListener('click', saveGame);
        loadBtn.addEventListener('click', loadGame);
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // 登录
        loginBtn.addEventListener('click', () => { document.getElementById('loginError').style.display = 'none'; openModal('loginModal'); });
        document.getElementById('loginConfirmBtn').addEventListener('click', async () => {
            const pwd = document.getElementById('loginPassword').value;
            const remember = document.getElementById('rememberMe').checked;
            const errEl = document.getElementById('loginError');
            try {
                const res = await apiLogin(pwd, remember);
                closeModal('loginModal');
                document.getElementById('loginPassword').value = '';
                renderGameGrid();
                loadServerRoms();
                uploadStatus && (uploadStatus.textContent = '✅ 登录成功', uploadStatus.style.display = 'block');
                setTimeout(() => { uploadStatus && (uploadStatus.style.display = 'none'); }, 2000);
            } catch (e) {
                errEl.textContent = e.message;
                errEl.style.display = 'block';
            }
        });
        document.getElementById('loginPassword').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('loginConfirmBtn').click();
        });

        logoutBtn.addEventListener('click', () => { logout(); renderGameGrid(); });

        // 修改密码
        changePwdBtn.addEventListener('click', () => {
            document.getElementById('pwdError').style.display = 'none';
            openModal('changePwdModal');
        });
        document.getElementById('changePwdConfirmBtn').addEventListener('click', async () => {
            const oldPwd = document.getElementById('oldPassword').value;
            const newPwd = document.getElementById('newPassword').value;
            const confirmPwd = document.getElementById('confirmPassword').value;
            const errEl = document.getElementById('pwdError');
            if (newPwd !== confirmPwd) {
                errEl.textContent = '两次输入的新密码不一致';
                errEl.style.display = 'block';
                return;
            }
            try {
                const r = await fetch(`${API_BASE}/api/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
                });
                const res = await r.json();
                if (!res.success) throw new Error(res.error || '修改失败');
                if (res.token) {
                    token = res.token;
                    store.set(TOKEN_KEY, token);
                }
                closeModal('changePwdModal');
                document.getElementById('oldPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                alert('✅ 密码修改成功');
            } catch (e) {
                errEl.textContent = e.message;
                errEl.style.display = 'block';
            }
        });

        // 删除确认
        document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);
    }

    // ==================== 键盘控制 ====================
    // 键位方案（参照任天堂手柄）：
    //   W/↑ = 上   A/← = 左   S/↓ = 下   D/→ = 右
    //   J = A 键（右手位）  K = B 键（左手位）
    //   Enter = Start   Shift = Select
    //   F5 = 存档  F9 = 读档  R = 重置  Space = 暂停
    function setupKeyboardControls() {
        // 用 e.code 识别物理按键，不受中文输入法/键盘布局影响
        const KEYMAP_DOWN = {
            KeyW: Controller.BUTTON_UP,
            KeyS: Controller.BUTTON_DOWN,
            KeyA: Controller.BUTTON_LEFT,
            KeyD: Controller.BUTTON_RIGHT,
            ArrowUp: Controller.BUTTON_UP,
            ArrowDown: Controller.BUTTON_DOWN,
            ArrowLeft: Controller.BUTTON_LEFT,
            ArrowRight: Controller.BUTTON_RIGHT,
            KeyJ: Controller.BUTTON_A,
            KeyK: Controller.BUTTON_B,
            Enter: Controller.BUTTON_START,
            ShiftLeft: Controller.BUTTON_SELECT,
            ShiftRight: Controller.BUTTON_SELECT
        };

        function isTyping() {
            const el = document.activeElement;
            return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        }

        document.addEventListener('keydown', function(e) {
            if (isTyping()) return;

            if (e.key.toLowerCase() === 'r') { e.preventDefault(); resetGame(); return; }
            if (e.key === ' ') { e.preventDefault(); togglePause(); return; }
            if (e.key === 'F5') { e.preventDefault(); saveGame(); return; }
            if (e.key === 'F9') { e.preventDefault(); loadGame(); return; }

            if (nes && KEYMAP_DOWN[e.code] !== undefined) {
                e.preventDefault();
                const c = nes.controllers[1] || nes.Controller1;
                c.buttonDown(KEYMAP_DOWN[e.code]);
            }
        });

        document.addEventListener('keyup', function(e) {
            if (isTyping()) return;
            if (nes && KEYMAP_DOWN[e.code] !== undefined) {
                const c = nes.controllers[1] || nes.Controller1;
                c.buttonUp(KEYMAP_DOWN[e.code]);
            }
        });
    }

    // ==================== 触摸控制（虚拟手柄） ====================

    function setupTouchControls() {
        // 检测触摸设备
        isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

        // 显示虚拟手柄（游戏运行时）
        if (isTouch) {
            emulatorSection.addEventListener('mouseover', () => {});
            // 在开始游戏时显示
            const origStartGame = startGame;
            startGame = function(rom, name) {
                origStartGame(rom, name);
                virtualGamepad.style.display = 'flex';
            };
        }

        // 给虚拟按键绑定触摸事件
        document.querySelectorAll('.gp-btn').forEach(btn => {
            const btns = {
                up: Controller.BUTTON_UP,
                down: Controller.BUTTON_DOWN,
                left: Controller.BUTTON_LEFT,
                right: Controller.BUTTON_RIGHT,
                a: Controller.BUTTON_A,
                b: Controller.BUTTON_B,
                start: Controller.BUTTON_START,
                select: Controller.BUTTON_SELECT
            };
            const code = btns[btn.dataset.btn];
            if (code === undefined) return;

            const press = (e) => {
                e.preventDefault();
                if (nes) {
                    const c = nes.controllers[1] || nes.Controller1;
                    c.buttonDown(code);
                    btn.classList.add('pressed');
                }
            };
            const release = (e) => {
                e.preventDefault();
                if (nes) {
                    const c = nes.controllers[1] || nes.Controller1;
                    c.buttonUp(code);
                    btn.classList.remove('pressed');
                }
            };

            btn.addEventListener('touchstart', press, { passive: false });
            btn.addEventListener('touchend', release, { passive: false });
            btn.addEventListener('touchcancel', release, { passive: false });
            // 鼠标兼容（桌面调试）
            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
        });
    }

    // ==================== 手柄控制 (Gamepad API) ====================

    let prevGamepadButtons = {};

    function setupGamepad() {
        window.addEventListener('gamepadconnected', (e) => {
            gamepadIndex = e.gamepad.index;
            gamepadHint.style.display = 'block';
            console.log('手柄已连接:', e.gamepad.id);
        });
        window.addEventListener('gamepaddisconnected', (e) => {
            if (gamepadIndex === e.gamepad.index) {
                gamepadIndex = null;
                gamepadHint.style.display = 'none';
                console.log('手柄已断开');
            }
        });
    }

    function pollGamepad() {
        if (!nes || gamepadIndex === null) return;
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = pads[gamepadIndex];
        if (!pad) return;

        const c = nes.controllers[1] || nes.Controller1;
        if (!c) return;

        // 标准映射：0=A,1=B,2=X,3=Y,4=LB,5=RB,6=LT,7=RT,8=Select,9=Start,12=Up,13=Down,14=Left,15=Right
        const map = [
            { key: 'a_pressed', btn: Controller.BUTTON_A, gamepadBtn: 0, axis: null },   // A
            { key: 'b_pressed', btn: Controller.BUTTON_B, gamepadBtn: 1, axis: null },   // B
            { key: 'select_pressed', btn: Controller.BUTTON_SELECT, gamepadBtn: 8, axis: null },
            { key: 'start_pressed', btn: Controller.BUTTON_START, gamepadBtn: 9, axis: null },
            { key: 'up_pressed', btn: Controller.BUTTON_UP, gamepadBtn: 12, axis: { axis: 1, sign: -1 } },
            { key: 'down_pressed', btn: Controller.BUTTON_DOWN, gamepadBtn: 13, axis: { axis: 1, sign: 1 } },
            { key: 'left_pressed', btn: Controller.BUTTON_LEFT, gamepadBtn: 14, axis: { axis: 0, sign: -1 } },
            { key: 'right_pressed', btn: Controller.BUTTON_RIGHT, gamepadBtn: 15, axis: { axis: 0, sign: 1 } }
        ];

        map.forEach(item => {
            let pressed = false;
            if (pad.buttons[item.gamepadBtn]) {
                pressed = pad.buttons[item.gamepadBtn].pressed;
            }
            if (item.axis) {
                const v = pad.axes[item.axis.axis];
                if (Math.abs(v) > 0.4 && v * item.axis.sign > 0) pressed = true;
                // 摇杆干扰修正：只用十字键或摇杆其一
            }
            const prev = prevGamepadButtons[item.key] || false;
            if (pressed && !prev) c.buttonDown(item.btn);
            if (!pressed && prev) c.buttonUp(item.btn);
            prevGamepadButtons[item.key] = pressed;
        });
    }

    // ==================== 启动 ====================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();