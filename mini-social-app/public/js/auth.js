const API_URL = '/api/auth';
let isLogin = true;

function toggleAuth() {
    isLogin = !isLogin;
    const btn = document.querySelector('#login-form button');
    const title = document.querySelector('.auth-card h2');
    const switchText = document.querySelector('.switch-auth');
    
    // Toggle UI text
    btn.innerText = isLogin ? 'Login' : 'Sign Up';
    switchText.innerHTML = isLogin ? 'No account? <span onclick="toggleAuth()">Sign Up</span>' : 'Have an account? <span onclick="toggleAuth()">Login</span>';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = email.split('@')[0]; // Simple username generation

    const endpoint = isLogin ? '/login' : '/register';
    const body = isLogin ? { email, password } : { username, email, password };

    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.reload();
        } else {
            document.getElementById('auth-error').innerText = data.msg || 'Error';
        }
    } catch (err) {
        console.error(err);
    }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// Check Auth State
const token = localStorage.getItem('token');
if (token) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('nav-username').innerText = user.username;
}