document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggler = document.querySelector(".sidebar-toggler");
  const menuToggler = document.querySelector(".menu-toggler");
  const loginItem = document.getElementById('login-item');
  const logoutItem = document.getElementById('logout-item');
  const filterForm = document.getElementById('filter-form');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const ordersList = document.getElementById('orders-list');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

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

  // Check user and admin status
  try {
    const userResponse = await fetch('/api/user', { credentials: 'include' });
    if (userResponse.ok) {
      const user = await userResponse.json();
      if (user.role !== 'admin') {
        window.location.href = '/index.html';
        return;
      }
      loginItem.classList.add('hidden');
      loginItem.style.display = 'none';
      logoutItem.classList.remove('hidden');
      logoutItem.style.display = 'block';
    } else {
      loginItem.classList.remove('hidden');
      loginItem.style.display = 'block';
      logoutItem.classList.add('hidden');
      logoutItem.style.display = 'none';
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('User check error:', error);
    loginItem.classList.remove('hidden');
    loginItem.style.display = 'block';
    logoutItem.classList.add('hidden');
    logoutItem.style.display = 'none';
    window.location.href = '/login.html';
  }

  // Pagination settings
  const ordersPerPage = 10;
  let currentPage = 1;
  let allOrders = [];
  let filteredOrders = [];

  // Function to format payment method
  function formatPaymentMethod(method) {
    const methodMap = {
      pix: 'Pix',
      credit_card: 'Cartão de Crédito'
    };
    return methodMap[method] || method;
  }

  // Function to format status
  function formatStatus(status) {
    const statusMap = {
      pending: 'Pendente',
      pending_verification: 'Aguardando Verificação',
      completed: 'Concluído',
      cancelled: 'Cancelado'
    };
    return statusMap[status] || status;
  }

  // Function to format address
  function formatAddress(order) {
    if (!order.address_line1) {
      return 'Endereço não disponível';
    }
    const parts = [
      order.address_line1,
      order.address_line2,
      order.city,
      order.state,
      order.postal_code,
      order.country
    ].filter(part => part);
    return parts.join(', ');
  }

  // Function to render orders for the current page
  function renderOrders(orders) {
    ordersList.innerHTML = '';
    if (orders.length === 0) {
      ordersList.innerHTML = `
        <div class="no-orders">
          <p>Nenhum pedido encontrado.</p>
          <a href="/index.html" class="btn">Ver Produtos</a>
        </div>
      `;
      pageInfo.textContent = 'Página 1';
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(orders.length / ordersPerPage);
    currentPage = Math.min(currentPage, totalPages);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = orders.slice(startIndex, endIndex);

    pageOrders.forEach(order => {
      if (!order.payment_id) {
        console.warn(`Order #${order.id} has no payment_id`);
        return;
      }
      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <img src="${order.image_url}" alt="${order.shirt_name}">
        <div class="order-details">
          <h3>Pedido #${order.id}</h3>
          <p><strong>Camisa:</strong> ${order.shirt_name}</p>
          <p><strong>Cliente:</strong> ${order.customer}</p>
          <p><strong>CPF:</strong> ${order.cpf || 'Não informado'}</p>
          <p><strong>Telefone:</strong> ${order.phone_number || 'Não informado'}</p>
          <p><strong>Endereço:</strong> ${formatAddress(order)}</p>
          <p><strong>Valor:</strong> R$ ${order.amount.toFixed(2)}</p>
          <p><strong>Método de Pagamento:</strong> ${formatPaymentMethod(order.payment_method)}</p>
          <p><strong>Status:</strong> ${formatStatus(order.payment_status)}</p>
          <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
          ${order.payment_method === 'pix' && order.receipt_path ? `
            <p><strong>Comprovante:</strong> <a href="${order.receipt_path}" target="_blank">Ver Comprovante</a></p>
            ${order.payment_status === 'pending_verification' ? `
              <button onclick="verifyPixPayment('${order.payment_id}')">Verificar Pix</button>
            ` : ''}
          ` : ''}
          <select onchange="updateOrderStatus('${order.payment_id}', this.value)">
            <option value="pending" ${order.payment_status === 'pending' ? 'selected' : ''}>Pendente</option>
            <option value="completed" ${order.payment_status === 'completed' ? 'selected' : ''}>Concluído</option>
            <option value="cancelled" ${order.payment_status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      `;
      ordersList.appendChild(card);
    });

    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }

  // Apply filters
  function applyFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const statusFilterValue = statusFilter.value;

    filteredOrders = allOrders;

    if (searchQuery) {
      filteredOrders = filteredOrders.filter(order =>
        order.customer.toLowerCase().includes(searchQuery) ||
        order.id.toString().includes(searchQuery) ||
        order.cpf?.toLowerCase().includes(searchQuery) ||
        order.city?.toLowerCase().includes(searchQuery)
      );
    }

    if (statusFilterValue && statusFilterValue !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.payment_status === statusFilterValue);
    }

    currentPage = 1;
    renderOrders(filteredOrders);
  }

  // Load orders
  async function loadOrders() {
    try {
      const response = await fetch('/api/all-orders', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch orders');
      allOrders = await response.json();
      applyFilters();
    } catch (error) {
      console.error('Fetch orders error:', error);
      ordersList.innerHTML = '<p>Erro ao carregar pedidos.</p>';
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
    }
  }

  // Handle filter form submission
  filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFilters();
  });

  // Handle filter input changes
  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // Pagination button handlers
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderOrders(filteredOrders);
    }
  });

  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderOrders(filteredOrders);
    }
  });

  // Initial load
  await loadOrders();

  // Logout
  document.getElementById('logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });
});

// Update order status
async function updateOrderStatus(paymentId, status) {
  try {
    const response = await fetch('/api/update-payment-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, status }),
      credentials: 'include',
    });
    if (response.ok) {
      alert('Status do pedido atualizado com sucesso!');
      window.location.reload();
    } else {
      throw new Error('Falha ao atualizar o status do pedido');
    }
  } catch (error) {
    console.error('Update order status error:', error);
    alert('Erro ao atualizar o status do pedido: ' + error.message);
  }
}

