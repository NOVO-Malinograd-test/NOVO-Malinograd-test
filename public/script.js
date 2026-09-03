// ============================================================
// [ОБЩИЕ ФУНКЦИИ]
// ============================================================

const API_URL = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

function setAuth(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    updateNav();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNav();
    window.location.href = '/';
}

function updateNav() {
    const user = getUser();
    const authLink = document.getElementById('authLink');
    const adminLink = document.getElementById('adminLink');

    if (user) {
        if (authLink) {
            authLink.innerHTML = `👤 ${user.username}`;
            authLink.href = '/profile.html';
        }
        if (adminLink && user.role === 'admin') {
            adminLink.style.display = 'inline';
        }
    } else {
        if (authLink) {
            authLink.innerHTML = 'Войти';
            authLink.href = '/login.html';
        }
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('avatarPreview');
                if (preview) {
                    preview.src = event.target.result;
                }
            };
            if (e.target.files[0]) {
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    updateNav();
});

// ============================================================
// [РЕГИСТРАЦИЯ]
// ============================================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);

        try {
            const response = await fetch(API_URL + '/register', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setAuth(data);
                alert('✅ Регистрация успешна! Добро пожаловать в Copia Elit!');
                window.location.href = '/profile.html';
            } else {
                alert('❌ ' + data.error);
            }
        } catch (error) {
            alert('❌ Ошибка соединения с сервером!');
            console.error(error);
        }
    });
}

// ============================================================
// [ВХОД]
// ============================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(API_URL + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                setAuth(data);
                alert('✅ Добро пожаловать в Copia Elit, ' + data.user.username + '!');
                window.location.href = '/profile.html';
            } else {
                alert('❌ ' + data.error);
            }
        } catch (error) {
            alert('❌ Ошибка соединения с сервером!');
            console.error(error);
        }
    });
}