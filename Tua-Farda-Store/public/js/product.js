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
    }
  } catch (error) {
    console.error('User check error:', error);
    loginItem.classList.remove('hidden');
    loginItem.style.display = 'block';
    logoutItem.classList.add('hidden');
    logoutItem.style.display = 'none';
  }

  const urlParams = new URLSearchParams(window.location.search);
  const shirtId = urlParams.get('id');

  if (!shirtId) {
    alert('No shirt ID provided.');
    window.location.href = '/index.html';
    return;
  }

  let currentUserId;

  try {
    // Fetch current shirt
    const response = await fetch(`/api/shirts/${shirtId}`);
    if (!response.ok) throw new Error('Shirt not found');
    const shirt = await response.json();

    // Populate shirt details
    document.getElementById('shirt-name').textContent = shirt.name;
    document.getElementById('shirt-description').innerHTML = shirt.description || 'High-quality sports shirt perfect for your game.';
    document.getElementById('shirt-price').textContent = `R$ ${shirt.price.toFixed(2)}`;
    document.getElementById('shirt-price-text').textContent = `${shirt.price.toFixed(2)} reais only`;
    document.getElementById('main-image').src = shirt.image_url;
    document.getElementById('thumbnail').src = shirt.image_url;
    document.getElementById('shirt-category').textContent = shirt.category || 'N/A';

    // Add event listeners for buttons
    document.getElementById('buy-now').addEventListener('click', () => buyShirt(shirt.id));
    document.getElementById('add-to-cart').addEventListener('click', () => addToCart(shirt.id));

    // Fetch reviews
    const reviewsResponse = await fetch(`/api/reviews/${shirtId}`);
    if (!reviewsResponse.ok) throw new Error('Failed to fetch reviews');
    const reviews = await reviewsResponse.json();

    const reviewsList = document.getElementById('reviews-list');
    reviewsList.innerHTML = '';
    reviews.forEach(review => {
      console.log('Review User ID:', review.user_id, 'Current User ID:', currentUserId);
      const item = document.createElement('div');
      item.className = 'review-item';
      item.innerHTML = `
        <div class="stars">${generateStars(review.rating)}</div>
        <p>${review.comment}</p>
        <span>Por ${review.username} em ${new Date(review.created_at).toLocaleDateString()}</span>
        ${currentUserId && currentUserId === review.user_id ? `
          <button onclick="editReview(${review.rating}, '${review.comment.replace(/'/g, "\\'")}')">Editar</button>
          <button onclick="deleteReview(${shirtId})">Excluir</button>
        ` : ''}
      `;
      reviewsList.appendChild(item);
    });

    // Calculate and display average rating
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
    document.getElementById('stars').innerHTML = generateStars(Math.round(avgRating));
    document.getElementById('rating-summary').textContent = `(${avgRating} - ${reviews.length} avaliações)`;

    // Check user status and purchase
    const userResponse = await fetch('/api/user', { credentials: 'include' });
    const reviewForm = document.getElementById('review-form');
    const submitButton = document.getElementById('submit-review');

    if (userResponse.ok) {
      const user = await userResponse.json();
      currentUserId = user.id;
      console.log('Current User ID:', currentUserId);

      const hasPurchased = await fetch(`/api/orders/check-purchase/${shirtId}`, {
        credentials: 'include',
      }).then(res => res.ok ? res.json() : false);

      const userReview = reviews.find(r => r.user_id === currentUserId);

      if (!hasPurchased) {
        reviewForm.innerHTML = '<p>Você precisa comprar este produto para avaliá-lo.</p>';
      } else if (userReview) {
        document.querySelector(`input[name="rating"][value="${userReview.rating}"]`).checked = true;
        document.getElementById('comment').value = userReview.comment;
        submitButton.textContent = 'Editar Avaliação';
      }

      // Review submission
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!hasPurchased) return;

        const rating = document.querySelector('input[name="rating"]:checked').value;
        const comment = document.getElementById('comment').value;

        try {
          const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shirt_id: shirtId, rating: parseInt(rating), comment }),
            credentials: 'include',
          });
          if (!response.ok) throw new Error((await response.json()).error);
          const result = await response.json();
          alert(result.updated ? 'Avaliação editada com sucesso!' : 'Avaliação enviada com sucesso!');
          window.location.reload();
        } catch (error) {
          console.error('Review submission error:', error);
          alert(`Erro: ${error.message}`);
        }
      });
    } else {
      reviewForm.innerHTML = '<p>Faça login para avaliar este produto.</p>';
    }

    // Fetch related products
    const allShirtsResponse = await fetch('/api/shirts');
    if (!allShirtsResponse.ok) throw new Error('Failed to fetch shirts');
    const allShirts = await allShirtsResponse.json();
    const relatedProducts = allShirts
      .filter(item => item.category === shirt.category && item.id !== shirt.id)
      .slice(0, 4);
    const relatedList = document.getElementById('related-products-list');
    relatedList.innerHTML = '';
    relatedProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'shirt-card';
      card.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>R$ ${product.price.toFixed(2)}</p>
        <button onclick="window.location.href='/product.html?id=${product.id}'">Ver</button>
      `;
      relatedList.appendChild(card);
    });

    document.getElementById('thumbnail').addEventListener('click', () => {
      document.getElementById('main-image').src = shirt.image_url;
    });
  } catch (error) {
    console.error('Error:', error);
    alert('Error loading page details.');
    window.location.href = '/index.html';
  }

  document.getElementById('logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
    window.location.reload();
  });
});

function generateStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<i class='bx ${i <= rating ? 'bxs-star' : 'bx-star'}'></i>`;
  }
  return stars;
}

function editReview(rating, comment) {
  document.querySelector(`input[name="rating"][value="${rating}"]`).checked = true;
  document.getElementById('comment').value = comment;
  document.getElementById('submit-review').textContent = 'Editar Avaliação';
  document.getElementById('review-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteReview(shirtId) {
  if (confirm('Tem certeza que deseja excluir sua avaliação?')) {
    try {
      const response = await fetch(`/api/reviews/${shirtId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error((await response.json()).error);
      alert('Avaliação excluída com sucesso!');
      window.location.reload();
    } catch (error) {
      console.error('Delete review error:', error);
      alert(`Erro ao excluir avaliação: ${error.message}`);
    }
  }
}

async function addToCart(shirtId) {
  try {
    const userResponse = await fetch('/api/user', { credentials: 'include' });
    if (!userResponse.ok) {
      alert('Por favor, faça login para adicionar ao carrinho.');
      window.location.href = '/login.html';
      return;
    }

    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shirt_id: shirtId, quantity: 1 }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add to cart');
    }

    alert('Produto adicionado ao carrinho!');
    // Optionally redirect to cart page
    // window.location.href = '/cart.html';
  } catch (error) {
    console.error('Add to cart error:', error);
    alert('Erro ao adicionar ao carrinho: ' + error.message);
  }
}

async function buyShirt(shirtId) {
  try {
    const userResponse = await fetch('/api/user', { credentials: 'include' });
    if (!userResponse.ok) {
      alert('Por favor, faça login para finalizar a compra.');
      window.location.href = '/login.html';
      return;
    }

    // Add shirt to cart before redirecting to checkout
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shirt_id: shirtId, quantity: 1 }),
      credentials: 'include',
    });

    window.location.href = '/checkout.html';
  } catch (error) {
    console.error('Buy now error:', error);
    alert('Erro ao prosseguir para o pagamento: ' + error.message);
  }
}

function closeModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}