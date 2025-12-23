document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggler = document.querySelector(".sidebar-toggler");
  const menuToggler = document.querySelector(".menu-toggler");
  const loginItem = document.getElementById('login-item');
  const logoutItem = document.getElementById('logout-item');
  let isLoggedIn = false;
  // Testimonials Slider Logic
  const testimonialsWrapper = document.querySelector(".testimonials-wrapper");
  const testimonialsCarousel = document.querySelector(".testimonials-carousel");
  const firstTestimonialWidth = testimonialsCarousel.querySelector(".testimonial-card").offsetWidth;
  const testimonialsArrowBtns = document.querySelectorAll(".testimonials-wrapper i");
  const testimonialsChildren = [...testimonialsCarousel.children];

  let isDraggingTestimonials = false, isAutoPlayTestimonials = true, startXTestimonials, startScrollLeftTestimonials, timeoutIdTestimonials;

  // Get the number of cards that can fit in the carousel at once
  let cardPerViewTestimonials = Math.round(testimonialsCarousel.offsetWidth / firstTestimonialWidth);

  // Insert copies of the last few cards to beginning of carousel for infinite scrolling
  testimonialsChildren.slice(-cardPerViewTestimonials).reverse().forEach(card => {
    testimonialsCarousel.insertAdjacentHTML("afterbegin", card.outerHTML);
  });

  // Insert copies of the first few cards to end of carousel for infinite scrolling
  testimonialsChildren.slice(0, cardPerViewTestimonials).forEach(card => {
    testimonialsCarousel.insertAdjacentHTML("beforeend", card.outerHTML);
  });

  // Scroll the carousel to hide first few duplicate cards
  testimonialsCarousel.classList.add("no-transition");
  testimonialsCarousel.scrollLeft = testimonialsCarousel.offsetWidth;
  testimonialsCarousel.classList.remove("no-transition");

  // Add event listeners for the arrow buttons
  testimonialsArrowBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      testimonialsCarousel.scrollLeft += btn.id === "left" ? -firstTestimonialWidth : firstTestimonialWidth;
    });
  });

  const dragStartTestimonials = (e) => {
    isDraggingTestimonials = true;
    testimonialsCarousel.classList.add("dragging");
    startXTestimonials = e.pageX;
    startScrollLeftTestimonials = testimonialsCarousel.scrollLeft;
  };

  const draggingTestimonials = (e) => {
    if (!isDraggingTestimonials) return;
    testimonialsCarousel.scrollLeft = startScrollLeftTestimonials - (e.pageX - startXTestimonials);
  };

  const dragStopTestimonials = () => {
    isDraggingTestimonials = false;
    testimonialsCarousel.classList.remove("dragging");
  };

  const infiniteScrollTestimonials = () => {
    if (testimonialsCarousel.scrollLeft === 0) {
      testimonialsCarousel.classList.add("no-transition");
      testimonialsCarousel.scrollLeft = testimonialsCarousel.scrollWidth - (2 * testimonialsCarousel.offsetWidth);
      testimonialsCarousel.classList.remove("no-transition");
    } else if (Math.ceil(testimonialsCarousel.scrollLeft) === testimonialsCarousel.scrollWidth - testimonialsCarousel.offsetWidth) {
      testimonialsCarousel.classList.add("no-transition");
      testimonialsCarousel.scrollLeft = testimonialsCarousel.offsetWidth;
      testimonialsCarousel.classList.remove("no-transition");
    }
    clearTimeout(timeoutIdTestimonials);
    if (!testimonialsWrapper.matches(":hover")) autoPlayTestimonials();
  };

  const autoPlayTestimonials = () => {
    if (window.innerWidth < 800 || !isAutoPlayTestimonials) return;
    timeoutIdTestimonials = setTimeout(() => testimonialsCarousel.scrollLeft += firstTestimonialWidth, 2500);
  };

  autoPlayTestimonials();

  testimonialsCarousel.addEventListener("mousedown", dragStartTestimonials);
  testimonialsCarousel.addEventListener("mousemove", draggingTestimonials);
  document.addEventListener("mouseup", dragStopTestimonials);
  testimonialsCarousel.addEventListener("scroll", infiniteScrollTestimonials);
  testimonialsWrapper.addEventListener("mouseenter", () => clearTimeout(timeoutIdTestimonials));
  testimonialsWrapper.addEventListener("mouseleave", autoPlayTestimonials);

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

  // Load shirts
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

    // Display all shirts in the main grid
    displayShirts(shirtList, shirts);

    // Slider Logic
    const slides = document.querySelector('.slides');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    const totalSlides = 3;

    function updateSlider() {
      slides.style.transform = `translateX(-${currentSlide * 33.33}%)`;
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
      });
    }

    function nextSlide() {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateSlider();
    }

    // Auto-slide every 5 seconds
    let slideInterval = setInterval(nextSlide, 5000);

    // Manual navigation with dots
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        clearInterval(slideInterval); // Pause auto-slide on manual interaction
        currentSlide = index;
        updateSlider();
        slideInterval = setInterval(nextSlide, 5000); // Restart auto-slide
      });
    });

    // Initial setup
    updateSlider();

    // Category filtering for sidebar links
    document.querySelectorAll('.sidebar a[data-category]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.getAttribute('data-category');
        if (category === 'all') {
          displayShirts(shirtList, shirts);
        } else {
          const filtered = shirts.filter(shirt => shirt.category === category);
          displayShirts(shirtList, filtered);
        }
      });
    });
  } catch (error) {
    console.error('Fetch error:', error);
  }
});

function buyShirt(shirtId, price) {
  // Redirect to a product details page with the shirt ID as a query parameter
  window.location.href = `/product.html?id=${shirtId}`;
}

function closeModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

document.getElementById('logout').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/index.html';
  window.location.reload();
});

// Add to your existing JavaScript
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}