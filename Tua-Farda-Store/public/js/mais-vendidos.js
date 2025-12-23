// Filter for top sellers (assuming a sales_count field, otherwise adjust logic)
const topSellers = shirts.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 8); // Show 8 top sellers
displayShirts(shirtList, topSellers);

// Category filtering for sidebar links
document.querySelectorAll('.sidebar a[data-category]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const category = link.getAttribute('data-category');
    if (category === 'all') {
      window.location.href = '/index';
    } else {
      const filtered = topSellers.filter(shirt => shirt.category === category);
      displayShirts(shirtList, filtered);
    }
  });
});