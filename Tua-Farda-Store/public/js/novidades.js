document.addEventListener('DOMContentLoaded', async () => {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggler = document.querySelector(".sidebar-toggler");
    const menuToggler = document.querySelector(".menu-toggler");
    const loginItem = document.getElementById('login-item');
    const logoutItem = document.getElementById('logout-item');
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
        const welcome = document.getElementById('welcome');
        welcome.textContent = `Welcome, ${user.username}! Your Game, Your Style`;
        loginItem.classList.add('hidden');
        loginItem.style.display = 'none';
        logoutItem.classList.remove('hidden');
        logoutItem.style.display = 'block';
      } else {
        loginItem.classList.remove('hidden');
        loginItem.style.display = 'block';
        logoutItem.classList.add('hidden');
        logoutItem.style.display = 'none';
      }
    } catch (error) {
      console.error('User check error:', error);
      loginItem.classList.remove('hidden');
      loginItem.style.display = 'block';
      logoutItem.classList.add('hidden');
      logoutItem.style.display = 'none';
    }
  
    // Load and filter shirts
    let shirts = [];
    try {
      const response = await fetch('/api/shirts');
      shirts = await response.json();
      const shirtList = document.getElementById('shirt-list');
  
      function displayShirts(container, filteredShirts) {
        container.innerHTML = '';
        filteredShirts.forEach(shirt => {
          const card = document.createElement('div');
          card.className = 'shirt-card';
          card.innerHTML = `
            <img src="${shirt.image_url}" alt="${shirt.name}">
            <h3>${shirt.name}</h3>
            <p>R$ ${shirt.price.toFixed(2)}</p>
            <button onclick="buyShirt(${shirt.id}, ${shirt.price})">Comprar</button>
          `;
          container.appendChild(card);
        });
      }
  
      // Filter for new shirts (assuming newest have higher IDs or a created_at field)
      const newShirts = shirts.sort((a, b) => b.id - a.id).slice(0, 8); // Show 8 newest
      displayShirts(shirtList, newShirts);
  
      // Category filtering for sidebar links
      document.querySelectorAll('.sidebar a[data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const category = link.getAttribute('data-category');
          if (category === 'all') {
            window.location.href = '/index'; // Redirect to main page
          } else {
            const filtered = newShirts.filter(shirt => shirt.category === category);
            displayShirts(shirtList, filtered);
          }
        });
      });
    } catch (error) {
      console.error('Fetch error:', error);
    }
  });
  
  async function buyShirt(shirtId, price) {
    try {
      const userResponse = await fetch('/api/user', { credentials: 'include' });
      if (!userResponse.ok) {
        alert('Please log in to buy shirts.');
        window.location.href = '/login';
        return;
      }
  
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shirt_id: shirtId, amount: price }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Unauthorized: ${errorData.error}`);
      }
      const { qrCode, pixCode } = await response.json();
  
      const modal = document.getElementById('pix-modal');
      const qrContainer = document.getElementById('pix-qr-container');
      qrContainer.innerHTML = `<a href="${qrCode}" target="_blank" class="pix-link">Pagar com Pix</a>`;
      document.getElementById('pix-code').textContent = pixCode;
      modal.classList.remove('hidden');
    } catch (error) {
      console.error('Pix error:', error.message);
      alert('Error creating Pix payment: ' + error.message);
    }
  }
  
  function closeModal() {
    document.getElementById('pix-modal').classList.add('hidden');
  }
  
  document.getElementById('logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index';
    window.location.reload();
  });