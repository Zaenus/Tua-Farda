// Filter for discounted shirts (e.g., price < 100)
const promoShirts = shirts.filter(shirt => shirt.price < 100); // Adjust condition as needed
displayShirts(shirtList, promoShirts);

// Category filtering for sidebar links
document.querySelectorAll('.sidebar a[data-category]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const category = link.getAttribute('data-category');
    if (category === 'all') {
      window.location.href = '/index';
    } else {
      const filtered = promoShirts.filter(shirt => shirt.category === category);
      displayShirts(shirtList, filtered);
    }
  });
});