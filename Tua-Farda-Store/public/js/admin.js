document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggler = document.querySelector(".sidebar-toggler");
  const menuToggler = document.querySelector(".menu-toggler");
  const loginItem = document.getElementById('login-item');
  const logoutItem = document.getElementById('logout-item');

  console.log('Login Item Element:', loginItem);
  console.log('Logout Item Element:', logoutItem);
  if (!loginItem || !logoutItem) {
    console.error('One or both elements not found. Check IDs in HTML.');
    return;
  }

  sidebarToggler.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  const toggleMenu = (isMenuActive) => {
    sidebar.style.height = isMenuActive ? `${sidebar.scrollHeight}px` : "56px";
    menuToggler.querySelector("span").innerText = isMenuActive ? "close" : "menu";
  };

  menuToggler.addEventListener("click", () => {
    toggleMenu(sidebar.classList.toggle("menu-active"));
  });

  // Section toggling
  const sections = document.querySelectorAll('.admin-section');
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-section]');

  function showSection(sectionId) {
    sections.forEach(section => {
      section.classList.toggle('hidden', section.id !== sectionId);
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('data-section');
      showSection(sectionId);
    });
  });

  // Check user and admin status
  try {
    const userResponse = await fetch('/api/user', { credentials: 'include' });
    console.log('User Response Status:', userResponse.status);
    if (userResponse.ok) {
      const user = await userResponse.json();
      if (user.role !== 'admin') {
        window.location.href = '/index';
        return;
      }
      console.log('Hiding login item, showing logout item');
      loginItem.classList.add('hidden');
      loginItem.style.display = 'none';
      logoutItem.classList.remove('hidden');
      logoutItem.style.display = 'block';
    } else {
      console.log('Showing login item, hiding logout item');
      loginItem.classList.remove('hidden');
      loginItem.style.display = 'block';
      logoutItem.classList.add('hidden');
      logoutItem.style.display = 'none';
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('User check error:', error);
    console.log('Error - Showing login item, hiding logout item');
    loginItem.classList.remove('hidden');
    loginItem.style.display = 'block';
    logoutItem.classList.add('hidden');
    logoutItem.style.display = 'none';
    window.location.href = '/login';
  }

  // Load shirts
  try {
    const response = await fetch('/api/shirts');
    const shirts = await response.json();
    const shirtList = document.getElementById('shirt-list');

    shirts.forEach(shirt => {
      const card = document.createElement('div');
      card.className = 'shirt-card';
      card.innerHTML = `
        <img src="${shirt.image_url}" alt="${shirt.name}">
        <h3>${shirt.name}</h3>
        <p>R$ ${shirt.price.toFixed(2)}</p>
        <button onclick="deleteShirt(${shirt.id})">Delete</button>
      `;
      shirtList.appendChild(card);
    });
  } catch (error) {
    console.error('Fetch shirts error:', error);
    const shirtList = document.getElementById('shirt-list');
    shirtList.innerHTML = '<p>Error loading shirts.</p>';
  }
});

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('name', document.getElementById('name').value);
  formData.append('price', parseFloat(document.getElementById('price').value));
  formData.append('category', document.getElementById('category').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('image', document.getElementById('image').files[0]);

  try {
    const response = await fetch('/api/add-shirt', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      alert('Shirt added successfully!');
      document.getElementById('add-product-form').reset();
      window.location.reload();
    } else {
      throw new Error('Unauthorized or error');
    }
  } catch (error) {
    console.error('Add shirt error:', error);
    alert('Error adding shirt');
  }
});

async function deleteShirt(id) {
  if (confirm('Are you sure you want to delete this shirt?')) {
    try {
      const response = await fetch(`/api/shirt/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Shirt deleted successfully!');
        window.location.reload();
      } else {
        throw new Error('Failed to delete shirt');
      }
    } catch (error) {
      console.error('Delete shirt error:', error);
      alert('Error deleting shirt');
    }
  }
}

document.getElementById('logout').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/index.html';
});