document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggler = document.querySelector(".sidebar-toggler");
  const menuToggler = document.querySelector(".menu-toggler");
  const loginItem = document.getElementById('login-item');
  const logoutItem = document.getElementById('logout-item');
  const ordersList = document.getElementById('orders-list');
  const noOrders = document.getElementById('no-orders');
  let isLoggedIn = false;

  // Sidebar toggle
  sidebarToggler.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  // Menu toggle for mobile
  const toggleMenu = (isMenuActive) => {
    sidebar.style.height = isMenuActive ? `${sidebar.scrollHeight}px` : "56px";
    menuToggler.querySelector("span").innerText = isMenuActive ? "close" : "menu";
  };

  menuToggler.addEventListener("click", () => {
    toggleMenu(sidebar.classList.toggle("menu-active"));
  });

  // Check login status
  try {
    const userResponse = await fetch('/api/user', { credentials: 'include' });
    if (userResponse.ok) {
      isLoggedIn = true;
      const user = await userResponse.json();
      document.getElementById('welcome').textContent = `Bem-vindo, ${user.username}! Seu Jogo, Seu Estilo`;
      loginItem.classList.add('hidden');
      loginItem.style.display = 'none';
      logoutItem.classList.remove('hidden');
      logoutItem.style.display = 'block';
    } else {
      window.location.href = '/login.html';
      return;
    }
  } catch (error) {
    console.error('User check error:', error);
    window.location.href = '/login.html';
    return;
  }

  // Load orders
  try {
    const response = await fetch('/api/orders', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch orders');
    const orders = await response.json();

    if (orders.length === 0) {
      noOrders.classList.remove('hidden');
      return;
    }

    orders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <img src="${order.image_url}" alt="${order.shirt_name}">
        <div class="order-details">
          <h3>${order.shirt_name}</h3>
          <p><strong>Pedido:</strong> ${order.payment_id}</p>
          <p><strong>Valor:</strong> R$ ${order.amount.toFixed(2)}</p>
          <p><strong>Método:</strong> ${formatPaymentMethod(order.payment_method)}</p>
          <p><strong>Status:</strong> ${formatStatus(order.payment_status)}</p>
          <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
          <a href="/product.html?id=${order.shirt_id}" class="btn">Ver Produto</a>
        </div>
      `;
      ordersList.appendChild(card);
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    ordersList.innerHTML = '<p>Erro ao carregar pedidos. Tente novamente.</p>';
  }

  // Logout
  document.getElementById('logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });

  // Format payment method
  function formatPaymentMethod(method) {
    const methodMap = {
      pix: 'Pix',
      credit_card: 'Cartão de Crédito'
    };
    return methodMap[method] || method;
  }

  // Format status
  function formatStatus(status) {
    const statusMap = {
      pending: 'Pendente',
      completed: 'Concluído',
      cancelled: 'Cancelado'
    };
    return statusMap[status] || status;
  }
});