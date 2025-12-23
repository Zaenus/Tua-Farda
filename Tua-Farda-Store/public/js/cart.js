document.addEventListener('DOMContentLoaded', async () => {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggler = document.querySelector(".sidebar-toggler");
    const menuToggler = document.querySelector(".menu-toggler");
    const loginItem = document.getElementById('login-item');
    const logoutItem = document.getElementById('logout-item');
  
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
        const user = await userResponse.json();
        const welcome = document.getElementById('welcome');
        welcome.textContent = `Bem-vindo, ${user.username}! Seu Jogo, Seu Estilo`;
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
      window.location.href = '/login.html';
    }
  
    // Fetch and display cart items
    const cartItemsContainer = document.getElementById('cart-items');
    const cartEmpty = document.getElementById('cart-empty');
    const cartSummary = document.getElementById('cart-summary');
    const cartTotal = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('proceed-to-checkout');
  
    async function loadCart() {
      try {
        const response = await fetch('/api/cart', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch cart');
        const items = await response.json();
  
        cartItemsContainer.innerHTML = '';
        if (items.length === 0) {
          cartEmpty.classList.remove('hidden');
          cartSummary.classList.add('hidden');
          return;
        }
  
        cartEmpty.classList.add('hidden');
        cartSummary.classList.remove('hidden');
  
        let total = 0;
        items.forEach(item => {
          total += item.price * item.quantity;
          const cartItem = document.createElement('div');
          cartItem.className = 'cart-item';
          cartItem.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}">
            <div class="cart-item-details">
              <h3>${item.name}</h3>
              <p><strong>Preço:</strong> R$ ${item.price.toFixed(2)}</p>
              <p><strong>Quantidade:</strong>
                <input type="number" value="${item.quantity}" min="1" data-shirt-id="${item.shirt_id}" class="quantity-input">
              </p>
              <p><strong>Subtotal:</strong> R$ ${(item.price * item.quantity).toFixed(2)}</p>
              <button class="remove-button" data-shirt-id="${item.shirt_id}">Remover</button>
            </div>
          `;
          cartItemsContainer.appendChild(cartItem);
        });
  
        cartTotal.textContent = `R$ ${total.toFixed(2)}`;
  
        // Add event listeners for quantity inputs
        document.querySelectorAll('.quantity-input').forEach(input => {
          input.addEventListener('change', async (e) => {
            const shirtId = e.target.dataset.shirtId;
            const quantity = parseInt(e.target.value);
            if (quantity < 1) {
              e.target.value = 1;
              return;
            }
            await updateQuantity(shirtId, quantity);
            await loadCart();
          });
        });
  
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-button').forEach(button => {
          button.addEventListener('click', async (e) => {
            const shirtId = e.target.dataset.shirtId;
            await removeItem(shirtId);
            await loadCart();
          });
        });
      } catch (error) {
        console.error('Load cart error:', error);
        alert('Erro ao carregar o carrinho: ' + error.message);
      }
    }
  
    async function updateQuantity(shirtId, quantity) {
      try {
        const response = await fetch(`/api/cart/${shirtId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to update quantity');
      } catch (error) {
        console.error('Update quantity error:', error);
        alert('Erro ao atualizar quantidade: ' + error.message);
      }
    }
  
    async function removeItem(shirtId) {
      try {
        const response = await fetch(`/api/cart/${shirtId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to remove item');
      } catch (error) {
        console.error('Remove item error:', error);
        alert('Erro ao remover item: ' + error.message);
      }
    }
  
    // Proceed to checkout
    checkoutButton.addEventListener('click', () => {
      window.location.href = '/checkout.html';
    });
  
    // Load cart on page load
    await loadCart();
  
    // Logout
    document.getElementById('logout').addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/index.html';
    });
  });