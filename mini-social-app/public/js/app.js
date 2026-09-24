// =========================================
// INDEXEDDB STORAGE WRAPPER (Built-in)
// Replaces localStorage to avoid 5MB quota errors
// =========================================
const DB_NAME = 'MiniGramDB';
const STORE_NAME = 'keyValueStore';
let currentProfileUserId = null; // Track which profile we're viewing
let dbPromise = null;

function initDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
    return dbPromise;
}

async function dbGet(key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

async function dbSet(key, value) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

async function dbRemove(key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

// In-memory cache synced to IndexedDB
const memoryCache = {};
let storageReady = false;

async function initStorage() {
    if (storageReady) return;
    const keys = ['mockUsers', 'mockPosts', 'currentUser'];
    for (const key of keys) {
        const value = await dbGet(key);
        if (value !== null) memoryCache[key] = value;
    }
    storageReady = true;
}

// Drop-in localStorage replacement
const Storage = {
    getItem(key) {
        return memoryCache[key] !== undefined ? memoryCache[key] : null;
    },
    setItem(key, value) {
        memoryCache[key] = String(value);
        dbSet(key, String(value)).catch(err => console.error('DB write error:', err));
    },
    removeItem(key) {
        delete memoryCache[key];
        dbRemove(key).catch(err => console.error('DB remove error:', err));
    }
};

// =========================================
// STATE & MOCK DATA
// =========================================
let isLoginMode = true;
let currentUser = null;

// =========================================
// HELPERS
// =========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    toast.innerHTML = `${icons[type]} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
}

// =========================================
// SEED DATA
// =========================================
async function seedData() {
    if (!Storage.getItem('mockUsers')) {
        const mockUsers = [
            { id: 'u1', username: 'alex_dev', email: 'alex@test.com', password: '123', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', followers: ['u2'], following: ['u2'] },
            { id: 'u2', username: 'sarah_design', email: 'sarah@test.com', password: '123', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', followers: ['u1'], following: ['u1'] }
        ];
        Storage.setItem('mockUsers', JSON.stringify(mockUsers));
    }

    if (!Storage.getItem('mockPosts')) {
        const mockPosts = [
            {
                _id: 'p1',
                authorId: 'u1',
                author: { id: 'u1', username: 'alex_dev', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
                content: 'Just built a full-stack social media app using Node.js and Express! 🚀 #coding #webdev',
                likes: ['u2'],
                comments: [{ _id: 'c1', author: { username: 'sarah_design', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e' }, text: 'Looks amazing! Love the UI.' }],
                createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
                _id: 'p2',
                authorId: 'u2',
                author: { id: 'u2', username: 'sarah_design', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e' },
                content: 'Working on some new glassmorphism UI designs today. What do you guys think? ✨',
                likes: [],
                comments: [],
                createdAt: new Date(Date.now() - 7200000).toISOString()
            }
        ];
        Storage.setItem('mockPosts', JSON.stringify(mockPosts));
    }
}

// =========================================
// AUTHENTICATION
// =========================================
function setupAuth() {
    const authForm = document.getElementById('auth-form');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchText = document.getElementById('auth-switch-text');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const usernameGroup = document.getElementById('username-group');
    const passwordInput = document.getElementById('password');
    const passwordStrengthContainer = document.getElementById('password-strength-container');
    const passwordStrengthBar = document.getElementById('password-strength-bar');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('auth-spinner');

    authSwitchText.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        authError.innerText = '';
        if (isLoginMode) {
            authTitle.innerText = 'Welcome Back';
            authSubtitle.innerText = 'Please enter your details to sign in.';
            btnText.innerText = 'Sign In';
            authSwitchText.innerText = "Don't have an account? Sign Up";
            usernameGroup.style.display = 'none';
            passwordStrengthContainer.style.display = 'none';
        } else {
            authTitle.innerText = 'Create Account';
            authSubtitle.innerText = 'Join our community today.';
            btnText.innerText = 'Sign Up';
            authSwitchText.innerText = 'Already have an account? Sign In';
            usernameGroup.style.display = 'block';
            passwordStrengthContainer.style.display = 'block';
        }
    });

    passwordInput.addEventListener('input', (e) => {
        if (isLoginMode) return;
        const val = e.target.value;
        let strength = 0;
        if (val.length >= 6) strength++;
        if (val.match(/[a-z]/) && val.match(/[A-Z]/)) strength++;
        if (val.match(/\d/)) strength++;
        if (val.match(/[^a-zA-Z\d]/)) strength++;
        passwordStrengthBar.className = 'password-strength-bar';
        if (val.length === 0) passwordStrengthBar.style.width = '0%';
        else if (strength <= 1) passwordStrengthBar.classList.add('weak');
        else if (strength <= 3) passwordStrengthBar.classList.add('medium');
        else passwordStrengthBar.classList.add('strong');
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = passwordInput.value;
        const username = document.getElementById('username').value;

        authError.innerText = '';
        btnText.style.display = 'none';
        spinner.style.display = 'block';
        authSubmitBtn.disabled = true;

        setTimeout(() => {
            const users = JSON.parse(Storage.getItem('mockUsers') || '[]');
            if (isLoginMode) {
                const user = users.find(u => u.email === email && u.password === password);
                if (user) {
                    loginUser(user);
                } else {
                    authError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Invalid email or password.';
                    resetAuthBtn();
                }
            } else {
                if (!username) { authError.innerHTML = 'Username required.'; resetAuthBtn(); return; }
                if (users.find(u => u.email === email)) { authError.innerHTML = 'Email exists.'; resetAuthBtn(); return; }
                if (users.find(u => u.username === username)) { authError.innerHTML = 'Username taken.'; resetAuthBtn(); return; }
                const newUser = {
                    id: 'u' + Date.now(),
                    username, email, password,
                    avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
                    followers: [], following: []
                };
                users.push(newUser);
                Storage.setItem('mockUsers', JSON.stringify(users));
                loginUser(newUser);
            }
        }, 800);
    });

    function resetAuthBtn() {
        btnText.style.display = 'block';
        spinner.style.display = 'none';
        authSubmitBtn.disabled = false;
    }
}

function loginUser(user) {
    currentUser = user;
    Storage.setItem('currentUser', JSON.stringify(user));
    showToast(`Welcome back, ${user.username}!`, 'success');
    showApp();
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('auth-spinner');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    if (btnText) btnText.style.display = 'block';
    if (spinner) spinner.style.display = 'none';
    if (authSubmitBtn) authSubmitBtn.disabled = false;
}

function logout() {
    currentUser = null;
    Storage.removeItem('currentUser');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('auth-form').reset();
    showToast('Logged out successfully', 'info');
}

// =========================================
// APP INIT
// =========================================
function showApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('nav-avatar').src = currentUser.avatar;
    showFeed();
}

// =========================================
// NAVIGATION
// =========================================
function showFeed() {
    document.getElementById('feed-view').classList.remove('hidden');
    document.getElementById('profile-view').classList.add('hidden');
    renderPosts();
}

function showProfile(userId) {
    document.getElementById('feed-view').classList.add('hidden');
    document.getElementById('profile-view').classList.remove('hidden');
    
    // Track current profile for follow logic
    currentProfileUserId = userId;

    const users = JSON.parse(Storage.getItem('mockUsers') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Get the freshest current user data
    const currentUserData = users.find(u => u.id === currentUser.id);
    if (currentUserData) currentUser = currentUserData;

    // Update avatar, name, email
    document.getElementById('profile-avatar').src = user.avatar;
    document.getElementById('profile-username').innerText = user.username;
    document.getElementById('profile-email').innerText = user.email;

    // Stats
    const posts = getPosts().filter(p => p.authorId === userId);
    document.getElementById('stat-posts').innerText = posts.length;
    document.getElementById('stat-followers').innerText = (user.followers || []).length;
    document.getElementById('stat-following').innerText = (user.following || []).length;

    // Get button references
    const editBtn = document.getElementById('edit-profile-btn');
    const followBtn = document.getElementById('follow-btn');
    const followBtnText = document.getElementById('follow-btn-text');

    // Show/Hide buttons
    if (currentUser && userId === currentUser.id) {
        // Own profile → Show Edit, Hide Follow
        editBtn.classList.remove('hidden');
        followBtn.classList.add('hidden');
    } else {
        // Someone else's profile → Hide Edit, Show Follow
        editBtn.classList.add('hidden');
        followBtn.classList.remove('hidden');

        // Check if current user already follows this user
        const isFollowing = (currentUser.following || []).includes(userId);
        if (isFollowing) {
            followBtn.classList.add('following');
            followBtnText.innerText = 'Following';
        } else {
            followBtn.classList.remove('following');
            followBtnText.innerText = 'Follow';
        }
    }

    // Render user's posts
    const container = document.getElementById('profile-posts');
    container.innerHTML = '';
    if (posts.length === 0) {
        container.innerHTML = `<div class="empty-state glass"><i class="fas fa-camera"></i><p>No posts yet.</p></div>`;
    } else {
        posts.forEach((post, i) => container.appendChild(createPostElement(post, i)));
    }
}



function toggleFollow() {
    const userId = currentProfileUserId;
    if (!userId || userId === currentUser.id) return;

    let users = JSON.parse(Storage.getItem('mockUsers') || '[]');
    const currentUserIdx = users.findIndex(u => u.id === currentUser.id);
    const targetUserIdx = users.findIndex(u => u.id === userId);
    
    if (currentUserIdx === -1 || targetUserIdx === -1) return;

    const currentU = users[currentUserIdx];
    const targetU = users[targetUserIdx];

    // Ensure arrays exist
    if (!currentU.following) currentU.following = [];
    if (!targetU.followers) targetU.followers = [];

    const isFollowing = currentU.following.includes(userId);

    if (isFollowing) {
        // Unfollow
        currentU.following = currentU.following.filter(id => id !== userId);
        targetU.followers = targetU.followers.filter(id => id !== currentUser.id);
        showToast(`Unfollowed ${targetU.username}`, 'info');
    } else {
        // Follow
        currentU.following.push(userId);
        targetU.followers.push(currentUser.id);
        showToast(`Now following ${targetU.username}! 🎉`, 'success');
    }

    // Save to storage
    Storage.setItem('mockUsers', JSON.stringify(users));

    // Update local state
    currentUser = currentU;

    // Refresh UI
    showProfile(userId);
    renderPosts(); // Update mini follow buttons on feed
}

// Helper to check if current user follows a specific user
function isFollowingUser(userId) {
    if (!currentUser || !currentUser.following) return false;
    return currentUser.following.includes(userId);
}


// =========================================
// FOLLOWERS / FOLLOWING LIST MODAL
// =========================================
let currentFollowTab = 'followers';
let currentFollowListUserId = null;

function openFollowListModal(tab = 'followers') {
    if (!currentProfileUserId) return;
    
    currentFollowListUserId = currentProfileUserId;
    currentFollowTab = tab;
    
    const modal = document.getElementById('follow-list-modal');
    modal.classList.remove('hidden');
    
    // Set active tab
    document.getElementById('tab-followers').classList.toggle('active', tab === 'followers');
    document.getElementById('tab-following').classList.toggle('active', tab === 'following');
    
    renderFollowList();
}

function closeFollowListModal() {
    document.getElementById('follow-list-modal').classList.add('hidden');
}

function switchFollowTab(tab) {
    currentFollowTab = tab;
    document.getElementById('tab-followers').classList.toggle('active', tab === 'followers');
    document.getElementById('tab-following').classList.toggle('active', tab === 'following');
    renderFollowList();
}

function renderFollowList() {
    const container = document.getElementById('follow-list-container');
    const title = document.getElementById('follow-list-title');
    const userId = currentFollowListUserId;
    
    const users = JSON.parse(Storage.getItem('mockUsers') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Determine which list to show
    const listIds = currentFollowTab === 'followers' ? (user.followers || []) : (user.following || []);
    
    // Update title
    title.innerText = currentFollowTab === 'followers' 
        ? `Followers (${listIds.length})` 
        : `Following (${listIds.length})`;
    
    // Build user list
    const listUsers = listIds.map(id => users.find(u => u.id === id)).filter(Boolean);
    
    if (listUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-follow-list">
                <i class="fas fa-user-${currentFollowTab === 'followers' ? 'plus' : 'check'}"></i>
                <p>${currentFollowTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listUsers.map(u => {
        const isMe = currentUser && u.id === currentUser.id;
        const isFollowing = isFollowingUser(u.id);
        const showFollowBtn = !isMe;
        
        return `
            <div class="follow-user-item" data-action="profile" data-user="${u.id}">
                <img src="${u.avatar}" alt="${u.username}">
                <div class="follow-user-info">
                    <strong>${u.username}${isMe ? ' <span style="color:var(--primary); font-size:0.75rem;">(You)</span>' : ''}</strong>
                    <small>${u.email || ''}</small>
                </div>
                <div class="follow-user-action">
                    ${showFollowBtn ? `
                        <button class="mini-follow-btn ${isFollowing ? 'following' : ''}" 
                                data-action="follow-modal" 
                                data-user="${u.id}">
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Handle follow/unfollow from within the modal (without closing it)
function toggleFollowFromModal(userId) {
    if (!userId || (currentUser && userId === currentUser.id)) return;

    let users = JSON.parse(Storage.getItem('mockUsers') || '[]');
    const currentUserIdx = users.findIndex(u => u.id === currentUser.id);
    const targetUserIdx = users.findIndex(u => u.id === userId);
    
    if (currentUserIdx === -1 || targetUserIdx === -1) return;

    const currentU = users[currentUserIdx];
    const targetU = users[targetUserIdx];

    if (!currentU.following) currentU.following = [];
    if (!targetU.followers) targetU.followers = [];

    const isFollowing = currentU.following.includes(userId);

    if (isFollowing) {
        currentU.following = currentU.following.filter(id => id !== userId);
        targetU.followers = targetU.followers.filter(id => id !== currentUser.id);
        showToast(`Unfollowed ${targetU.username}`, 'info');
    } else {
        currentU.following.push(userId);
        targetU.followers.push(currentUser.id);
        showToast(`Now following ${targetU.username}! 🎉`, 'success');
    }

    Storage.setItem('mockUsers', JSON.stringify(users));
    currentUser = currentU;

    // Update stats on the profile behind the modal
    const profileUser = users.find(u => u.id === currentFollowListUserId);
    if (profileUser) {
        document.getElementById('stat-followers').innerText = (profileUser.followers || []).length;
        document.getElementById('stat-following').innerText = (profileUser.following || []).length;
    }

    // Update follow button on profile if viewing own profile
    if (currentFollowListUserId === currentUser.id) {
        showProfile(currentUser.id);
    }

    // Refresh modal contents and posts feed
    renderFollowList();
    renderPosts();
}

function toggleFollowFromFeed(userId) {
    if (!userId || userId === currentUser.id) return;

    let users = JSON.parse(Storage.getItem('mockUsers') || '[]');
    const currentUserIdx = users.findIndex(u => u.id === currentUser.id);
    const targetUserIdx = users.findIndex(u => u.id === userId);
    
    if (currentUserIdx === -1 || targetUserIdx === -1) return;

    const currentU = users[currentUserIdx];
    const targetU = users[targetUserIdx];

    if (!currentU.following) currentU.following = [];
    if (!targetU.followers) targetU.followers = [];

    const isFollowing = currentU.following.includes(userId);

    if (isFollowing) {
        currentU.following = currentU.following.filter(id => id !== userId);
        targetU.followers = targetU.followers.filter(id => id !== currentUser.id);
        showToast(`Unfollowed ${targetU.username}`, 'info');
    } else {
        currentU.following.push(userId);
        targetU.followers.push(currentUser.id);
        showToast(`Now following ${targetU.username}! 🎉`, 'success');
    }

    Storage.setItem('mockUsers', JSON.stringify(users));
    currentUser = currentU;

    // Re-render feed to update all mini buttons
    renderPosts();

    // If we're on a profile view, refresh it too
    if (!document.getElementById('profile-view').classList.contains('hidden')) {
        showProfile(userId);
    }
}
// =========================================
// POSTS
// =========================================
function getPosts() {
    return JSON.parse(Storage.getItem('mockPosts') || '[]');
}

function savePosts(posts) {
    Storage.setItem('mockPosts', JSON.stringify(posts));
}

function createPostElement(post, index) {
    const userId = currentUser ? currentUser.id : null;
    const isLiked = userId ? post.likes.includes(userId) : false;
    const postEl = document.createElement('div');
    postEl.className = 'post-card glass';
    postEl.style.animationDelay = `${index * 0.1}s`;

    postEl.innerHTML = `
                <div class="post-header">
            <img src="${post.author.avatar}" class="avatar" alt="avatar" data-action="profile" data-user="${post.authorId}">
            <div class="post-meta">
                <div style="display:flex; align-items:center; flex-wrap:wrap;">
                    <strong data-action="profile" data-user="${post.authorId}">${post.author.username}</strong>
                    ${post.authorId !== (currentUser ? currentUser.id : null) ? `
                        <button class="mini-follow-btn ${isFollowingUser(post.authorId) ? 'following' : ''}" 
                                data-action="follow" 
                                data-user="${post.authorId}">
                            ${isFollowingUser(post.authorId) ? 'Following' : 'Follow'}
                        </button>
                    ` : ''}
                </div>
                <small>${timeAgo(post.createdAt)}</small>
            </div>
        </div>
        <div class="post-content">${post.content}</div>
        <div class="post-actions">
            <button class="action-btn ${isLiked ? 'liked' : ''}" data-action="like" data-post="${post._id}">
                <i class="fas fa-heart"></i> <span>${post.likes.length}</span>
            </button>
            <button class="action-btn" data-action="toggle-comments" data-post="${post._id}">
                <i class="fas fa-comment"></i> <span>${post.comments.length}</span>
            </button>
        </div>
        <div class="comments-section hidden" id="comments-${post._id}">
            <div id="comment-list-${post._id}">
                ${post.comments.map(c => `<div class="comment"><strong>${c.author.username}</strong><span>${c.text}</span></div>`).join('')}
            </div>
            <div class="comment-input">
                <input type="text" id="input-${post._id}" placeholder="Write a comment..." data-action="comment-input" data-post="${post._id}">
                <button data-action="submit-comment" data-post="${post._id}"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    return postEl;
}

function renderPosts() {
    const feed = document.getElementById('posts-feed');
    const posts = getPosts();
    feed.innerHTML = '';
    if (posts.length === 0) {
        feed.innerHTML = `<div class="empty-state glass"><i class="fas fa-globe"></i><p>No posts yet. Be the first!</p></div>`;
        return;
    }
    posts.forEach((post, i) => feed.appendChild(createPostElement(post, i)));
}

function createPost() {
    const content = document.getElementById('post-content').value.trim();
    if (!content) { showToast('Write something first.', 'error'); return; }
    const posts = getPosts();
    const newPost = {
        _id: 'p' + Date.now(),
        authorId: currentUser.id,
        author: { id: currentUser.id, username: currentUser.username, avatar: currentUser.avatar },
        content, likes: [], comments: [],
        createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    savePosts(posts);
    document.getElementById('post-content').value = '';
    showToast('Post created!', 'success');
    if (!document.getElementById('feed-view').classList.contains('hidden')) renderPosts();
    else showProfile(currentUser.id);
}

function toggleLike(postId) {
    const posts = getPosts();
    const idx = posts.findIndex(p => p._id === postId);
    if (idx === -1) return;
    const likeIdx = posts[idx].likes.indexOf(currentUser.id);
    if (likeIdx === -1) posts[idx].likes.push(currentUser.id);
    else posts[idx].likes.splice(likeIdx, 1);
    savePosts(posts);
    const btn = document.querySelector(`button[data-action="like"][data-post="${postId}"]`);
    if (btn) {
        btn.classList.toggle('liked');
        btn.querySelector('span').innerText = posts[idx].likes.length;
    }
}

function toggleComments(postId) {
    const el = document.getElementById(`comments-${postId}`);
    if (el) {
        el.classList.toggle('hidden');
        if (!el.classList.contains('hidden')) {
            const input = document.getElementById(`input-${postId}`);
            if (input) input.focus();
        }
    }
}

// =========================================
// COMMENTS (FIXED)
// =========================================
function addComment(postId) {
    const input = document.getElementById(`input-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) { showToast('Write a comment first.', 'error'); return; }

    const storedUser = Storage.getItem('currentUser');
    if (!storedUser) { showToast('Please login again.', 'error'); return; }
    const user = JSON.parse(storedUser);

    const posts = getPosts();
    const idx = posts.findIndex(p => p._id === postId);
    if (idx === -1) return;

    posts[idx].comments.push({
        _id: 'c' + Date.now(),
        author: { username: user.username, avatar: user.avatar },
        text: text
    });
    savePosts(posts);

    const commentList = document.getElementById(`comment-list-${postId}`);
    if (commentList) {
        commentList.insertAdjacentHTML('beforeend', `
            <div class="comment" style="animation: slideUp 0.3s ease-out;">
                <strong>${user.username}</strong>
                <span>${text}</span>
            </div>
        `);
        input.value = '';
        input.focus();
        const countSpan = document.querySelector(`button[data-action="toggle-comments"][data-post="${postId}"] span`);
        if (countSpan) countSpan.innerText = posts[idx].comments.length;
        showToast('Comment posted!', 'success');
    } else {
        renderPosts();
    }
}

// =========================================
// MASTER EVENT DELEGATION
// =========================================
document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const postId = target.getAttribute('data-post');
    const userId = target.getAttribute('data-user');

         switch(action) {
        case 'like': e.preventDefault(); toggleLike(postId); break;
        case 'toggle-comments': e.preventDefault(); toggleComments(postId); break;
        case 'submit-comment': e.preventDefault(); addComment(postId); break;
        case 'profile': e.preventDefault(); showProfile(userId); break;
        case 'follow': 
            e.preventDefault(); 
            e.stopPropagation(); 
            toggleFollowFromFeed(userId); 
            break;
        case 'follow-modal': 
            e.preventDefault(); 
            e.stopPropagation(); 
            toggleFollowFromModal(userId); 
            break;
    }
});

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.matches('[data-action="comment-input"]')) {
        e.preventDefault();
        addComment(e.target.getAttribute('data-post'));
    }
});

// =========================================
// EDIT PROFILE
// =========================================
function openEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.remove('hidden');
    document.getElementById('edit-avatar-preview').src = currentUser.avatar;
    document.getElementById('avatar-url-input').value = '';
    document.getElementById('avatar-file-input').value = '';
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.add('hidden');
}

function setupEditProfile() {
    document.getElementById('avatar-file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image too large. Max 2MB.', 'error');
            this.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 300;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
                else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const resized = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('edit-avatar-preview').src = resized;
                document.getElementById('avatar-url-input').value = '';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('avatar-url-input').addEventListener('input', function(e) {
        const url = e.target.value.trim();
        if (url) {
            document.getElementById('edit-avatar-preview').src = url;
            document.getElementById('avatar-file-input').value = '';
        }
    });

    document.getElementById('edit-profile-modal').addEventListener('click', function(e) {
        if (e.target === this) closeEditProfileModal();
    });
}

function saveProfileChanges() {
    const fileInput = document.getElementById('avatar-file-input');
    const urlInput = document.getElementById('avatar-url-input').value.trim();
    const previewSrc = document.getElementById('edit-avatar-preview').src;
    let newAvatar = currentUser.avatar;
    if (fileInput.files.length > 0) newAvatar = previewSrc;
    else if (urlInput) newAvatar = urlInput;
    else { closeEditProfileModal(); return; }

    currentUser.avatar = newAvatar;
    Storage.setItem('currentUser', JSON.stringify(currentUser));

    const users = JSON.parse(Storage.getItem('mockUsers') || '[]');
    const userIdx = users.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) {
        users[userIdx].avatar = newAvatar;
        Storage.setItem('mockUsers', JSON.stringify(users));
    }

    const posts = JSON.parse(Storage.getItem('mockPosts') || '[]');
    posts.forEach(p => { if (p.authorId === currentUser.id) p.author.avatar = newAvatar; });
    Storage.setItem('mockPosts', JSON.stringify(posts));

    document.getElementById('nav-avatar').src = newAvatar;
    document.getElementById('profile-avatar').src = newAvatar;
    if (!document.getElementById('feed-view').classList.contains('hidden')) renderPosts();
    else showProfile(currentUser.id);

    showToast('Profile updated!', 'success');
    closeEditProfileModal();
}

// =========================================
// GLOBAL FUNCTIONS (For HTML onclick)
// =========================================
window.logout = logout;
window.showFeed = showFeed;
window.showProfile = showProfile;
window.createPost = createPost;
window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfileChanges = saveProfileChanges;
window.togglePasswordVisibility = function() {
    const pwd = document.getElementById('password');
    const type = pwd.getAttribute('type') === 'password' ? 'text' : 'password';
    pwd.setAttribute('type', type);
    const icon = document.querySelector('.toggle-password');
    if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    }
};

// =========================================
// BOOTSTRAP
// =========================================
(async function boot() {
    try {
        await initStorage();
        await seedData();
        setupAuth();
        setupEditProfile();

        const storedUser = Storage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            showApp();
        }
        console.log('✅ App initialized successfully');
    } catch (err) {
        console.error('❌ Boot error:', err);
    }
})();