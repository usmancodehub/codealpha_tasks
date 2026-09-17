/* =====================================================
   TECHTSTORE — FRONTEND LOGIC
   ===================================================== */

// ==================== STATE ====================
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('techstore_cart')) || [];
let user = JSON.parse(localStorage.getItem('techstore_user')) || null;
let isLoginMode = true;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartUI();
    updateAuthUI();
    attachEventListeners();
});

// ==================== FETCH PRODUCTS ====================
async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        allProducts = await res.json();
        console.log('📦 Products loaded:', allProducts);
        renderProducts(allProducts);
    } catch (err) {
        console.error('❌ Error fetching products:', err);
        document.getElementById('product-list').innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <p class="text-gray-500">Failed to load products. Make sure the server is running.</p>
            </div>
        `;
    }
}

// ==================== RENDER PRODUCTS ====================
function renderProducts(products) {
    const container = document.getElementById('product-list');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-box-open text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No products available.</p>
            </div>`;
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group cursor-pointer" onclick="openModal('${product._id}')">
            <div class="h-56 overflow-hidden bg-gray-100 relative">
                <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-500">
                <div class="absolute top-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                    ${product.category}
                </div>
            </div>
            <div class="p-6 flex flex-col flex-grow">
                <h3 class="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-primary transition">${product.name}</h3>
                <p class="text-gray-500 text-sm mb-4 line-clamp-2">${product.description}</p>
                <div class="flex justify-between items-center mt-auto">
                    <span class="text-xl font-bold text-gray-900">$${product.price.toFixed(2)}</span>
                    <button onclick="event.stopPropagation(); addToCart('${product._id}')" class="bg-indigo-50 text-primary h-10 w-10 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition shadow-sm">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== CART LOGIC ====================
function addToCart(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.product === productId);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({
            product: product._id,
            name: product.name,
            price: product.price,
            image: product.image,
            qty: 1
        });
    }

    saveCart();
    updateCartUI();
    showToast(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product !== productId);
    saveCart();
    updateCartUI();
}

function updateQty(productId, delta) {
    const item = cart.find(item => item.product === productId);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function saveCart() {
    localStorage.setItem('techstore_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.innerText = totalItems;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center mt-10">
                <i class="fas fa-shopping-basket text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">Your cart is empty.</p>
            </div>`;
        cartTotal.innerText = '$0.00';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        total += item.price * item.qty;
        return `
        <div class="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4 last:border-0">
            <img src="${item.image}" class="w-16 h-16 object-cover rounded-lg bg-gray-100">
            <div class="flex-1">
                <h4 class="font-bold text-gray-800 text-sm line-clamp-1">${item.name}</h4>
                <p class="text-primary font-bold text-sm mt-1">$${item.price.toFixed(2)}</p>
                <div class="flex items-center gap-3 mt-2">
                    <button onclick="updateQty('${item.product}', -1)" class="text-gray-500 hover:text-primary"><i class="fas fa-minus text-xs"></i></button>
                    <span class="text-sm font-medium w-4 text-center">${item.qty}</span>
                    <button onclick="updateQty('${item.product}', 1)" class="text-gray-500 hover:text-primary"><i class="fas fa-plus text-xs"></i></button>
                </div>
            </div>
            <button onclick="removeFromCart('${item.product}')" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-trash-alt"></i></button>
        </div>
        `;
    }).join('');

    cartTotal.innerText = `$${total.toFixed(2)}`;
}

function toggleCart() {
    document.body.classList.toggle('cart-open');
}

// ==================== CHECKOUT ====================
async function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }
    if (!user) {
        toggleCart();
        toggleAuthModal();
        showToast('Please login to checkout.', 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user: user._id,
                orderItems: cart.map(item => ({
                    product: item.product,
                    name: item.name,
                    qty: item.qty,
                    image: item.image,
                    price: item.price
                })),
                totalPrice: total
            })
        });

        if (res.ok) {
            showToast('🎉 Order placed successfully!');
            cart = [];
            saveCart();
            updateCartUI();
            toggleCart();
        } else {
            const data = await res.json();
            showToast(data.message || 'Error placing order.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Server error. Please try again.', 'error');
    }
}

// ==================== PRODUCT DETAILS MODAL ====================
function openModal(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    document.getElementById('modal-img').src = product.image;
    document.getElementById('modal-category').innerText = product.category;
    document.getElementById('modal-title').innerText = product.name;
    document.getElementById('modal-desc').innerText = product.description;
    document.getElementById('modal-price').innerText = `$${product.price.toFixed(2)}`;

    const addBtn = document.getElementById('modal-add-btn');
    addBtn.onclick = () => {
        addToCart(product._id);
        closeModal();
    };

    document.getElementById('modal-overlay').classList.add('modal-open');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('modal-open');
}

// ==================== AUTH LOGIC ====================
function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.toggle('opacity-0');
    modal.classList.toggle('pointer-events-none');
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? 'Welcome Back' : 'Create Account';
    document.getElementById('auth-subtitle').innerText = isLoginMode ? 'Please login to your account' : 'Join us to start shopping';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Login' : 'Register';
    document.getElementById('toggle-text').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    document.getElementById('toggle-btn').innerText = isLoginMode ? 'Register' : 'Login';
    document.getElementById('name-group').classList.toggle('hidden');
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;

    const url = isLoginMode ? '/api/users/login' : '/api/users/register';
    const body = isLoginMode ? { email, password } : { name, email, password };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (res.ok) {
            user = data;
            localStorage.setItem('techstore_user', JSON.stringify(user));
            updateAuthUI();
            toggleAuthModal();
            showToast(isLoginMode ? 'Logged in successfully!' : 'Account created!');
            document.getElementById('auth-form').reset();
        } else {
            showToast(data.message || 'Authentication failed.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('An error occurred.', 'error');
    }
}

function updateAuthUI() {
    const btn = document.getElementById('auth-button');
    if (user) {
        btn.innerText = `Hi, ${user.name.split(' ')[0]}`;
        btn.onclick = () => {
            if (confirm('Do you want to logout?')) {
                user = null;
                localStorage.removeItem('techstore_user');
                updateAuthUI();
                showToast('Logged out.');
            }
        };
    } else {
        btn.innerText = 'Login';
        btn.onclick = toggleAuthModal;
    }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const bgColor = type === 'success' ? 'bg-gray-900' : 'bg-red-500';
    const icon = type === 'success' ? 'fa-check-circle text-green-400' : 'fa-exclamation-circle text-white';

    toast.className = `${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 toast-animate text-sm font-medium`;
    toast.innerHTML = `
        <i class="fas ${icon} text-lg"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EVENT LISTENERS ====================
function attachEventListeners() {
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }
}

// ==================== GLOBAL EXPORTS (for inline onclick) ====================
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleAuthModal = toggleAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.checkout = checkout;