const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'copia_elit_rp_secret_key_2024';

// ============================================================
// [ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ IP]
// ============================================================
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

// ============================================================
// [НАСТРОЙКИ]
// ============================================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'database.json');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// ============================================================
// [DISCORD INTEGRATION]
// ============================================================
const DISCORD_GUILD_ID = '1534960438192767147';

app.get('/api/discord', async (req, res) => {
    try {
        const response = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.json({ error: 'Не удалось загрузить данные Discord' });
    }
});

// ============================================================
// [БАЗА ДАННЫХ]
// ============================================================
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const defaultData = {
            users: [],
            news: [],
            shop: [
                { id: '1', name: 'VIP Статус', price: 500, description: 'Эксклюзивный статус VIP' },
                { id: '2', name: 'Кастомный цвет', price: 200, description: 'Измени цвет своего ника' },
                { id: '3', name: 'Особая роль', price: 300, description: 'Уникальная роль в RP' }
            ],
            chat: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ============================================================
// [ЗАГРУЗКА ФОТО]
// ============================================================
const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (types.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Только картинки!'));
        }
    }
});

// ============================================================
// [API: РЕГИСТРАЦИЯ]
// ============================================================
app.post('/api/register', upload.single('avatar'), async (req, res) => {
    try {
        const { username, password, email, characterName, characterDesc } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ error: 'Заполните все поля!' });
        }

        const db = readDB();

        if (db.users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Пользователь уже существует!' });
        }
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email уже используется!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            email,
            characterName: characterName || username,
            characterDesc: characterDesc || 'Нет описания',
            avatar: req.file ? '/uploads/' + req.file.filename : '/uploads/default.png',
            role: 'user',
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            balance: 100,
            vip: false,
            customColor: '#ffffff'
        };

        db.users.push(newUser);
        writeDB(db);

        const token = jwt.sign({ id: newUser.id, username }, SECRET_KEY, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                characterName: newUser.characterName,
                avatar: newUser.avatar,
                role: newUser.role,
                balance: newUser.balance,
                vip: newUser.vip
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [API: ВХОД]
// ============================================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Заполните все поля!' });
        }

        const db = readDB();
        const user = db.users.find(u => u.username === username);

        if (!user) {
            return res.status(400).json({ error: 'Пользователь не найден!' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Неверный пароль!' });
        }

        user.lastSeen = new Date().toISOString();
        writeDB(db);

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                characterName: user.characterName,
                avatar: user.avatar,
                role: user.role,
                balance: user.balance,
                vip: user.vip,
                customColor: user.customColor
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [API: ПРОФИЛЬ]
// ============================================================
app.get('/api/profile/:id', (req, res) => {
    try {
        const db = readDB();
        const user = db.users.find(u => u.id === req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            characterName: user.characterName,
            characterDesc: user.characterDesc,
            avatar: user.avatar,
            role: user.role,
            balance: user.balance,
            vip: user.vip,
            customColor: user.customColor || '#ffffff',
            createdAt: user.createdAt,
            lastSeen: user.lastSeen
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [API: ВСЕ ПОЛЬЗОВАТЕЛИ]
// ============================================================
app.get('/api/users', (req, res) => {
    try {
        const db = readDB();
        const users = db.users.map(u => ({
            id: u.id,
            username: u.username,
            characterName: u.characterName,
            avatar: u.avatar,
            role: u.role,
            balance: u.balance,
            vip: u.vip
        }));
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [API: НОВОСТИ]
// ============================================================
app.get('/api/news', (req, res) => {
    try {
        const db = readDB();
        res.json(db.news);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/news', async (req, res) => {
    try {
        const { title, content, author } = req.body;
        const db = readDB();

        const newsItem = {
            id: Date.now().toString(),
            title,
            content,
            author,
            createdAt: new Date().toISOString()
        };

        db.news.unshift(newsItem);
        writeDB(db);
        res.json({ success: true, news: newsItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [API: МАГАЗИН]
// ============================================================
app.get('/api/shop', (req, res) => {
    try {
        const db = readDB();
        res.json(db.shop);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/shop/buy', async (req, res) => {
    try {
        const { userId, itemId } = req.body;
        const db = readDB();

        const user = db.users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const item = db.shop.find(s => s.id === itemId);
        if (!item) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        if (user.balance < item.price) {
            return res.status(400).json({ error: 'Недостаточно средств!' });
        }

        user.balance -= item.price;

        if (item.name.toLowerCase().includes('vip')) {
            user.vip = true;
        }

        writeDB(db);

        res.json({ success: true, newBalance: user.balance, vip: user.vip });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [API: ЧАТ]
// ============================================================
app.get('/api/chat', (req, res) => {
    try {
        const db = readDB();
        res.json(db.chat.slice(-50));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { username, message, avatar, color } = req.body;
        const db = readDB();

        const chatMessage = {
            id: Date.now().toString(),
            username,
            message,
            avatar: avatar || '/uploads/default.png',
            color: color || '#ffffff',
            timestamp: new Date().toISOString()
        };

        db.chat.push(chatMessage);
        if (db.chat.length > 100) {
            db.chat = db.chat.slice(-100);
        }
        writeDB(db);
        res.json({ success: true, message: chatMessage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [API: АДМИН]
// ============================================================
app.post('/api/admin/update', async (req, res) => {
    try {
        const { userId, field, value } = req.body;
        const db = readDB();
        const user = db.users.find(u => u.id === userId);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (field === 'role') {
            user.role = value;
        } else if (field === 'balance') {
            user.balance = parseInt(value);
        } else if (field === 'characterName') {
            user.characterName = value;
        }

        writeDB(db);
        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/delete', async (req, res) => {
    try {
        const { userId } = req.body;
        const db = readDB();
        db.users = db.users.filter(u => u.id !== userId);
        writeDB(db);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/news', async (req, res) => {
    try {
        const { title, content, author } = req.body;
        const db = readDB();

        const newsItem = {
            id: Date.now().toString(),
            title,
            content,
            author,
            createdAt: new Date().toISOString()
        };

        db.news.unshift(newsItem);
        writeDB(db);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/shop', async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const db = readDB();

        const item = {
            id: Date.now().toString(),
            name,
            price: parseInt(price),
            description
        };

        db.shop.push(item);
        writeDB(db);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================================
// [ЗАПУСК С ДОСТУПОМ ПО СЕТИ]
// ============================================================
const LOCAL_IP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🚀 COPIA ELIT RP - СЕРВЕР ЗАПУЩЕН                      ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  📍 ЛОКАЛЬНЫЙ АДРЕС:  http://localhost:${PORT}          ║`);
    console.log(`║  🌐 ПО СЕТИ (Wi-Fi):  http://${LOCAL_IP}:${PORT}        ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  📁 Discord ID: ${DISCORD_GUILD_ID}                      ║`);
    console.log(`║  📂 Папка проекта: ${__dirname}                          ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📱 ДЛЯ ПОДКЛЮЧЕНИЯ С ТЕЛЕФОНА:');
    console.log(`   http://${LOCAL_IP}:${PORT}`);
    console.log('');
    console.log('⚠️  Телефон должен быть в той же Wi-Fi сети!');
});