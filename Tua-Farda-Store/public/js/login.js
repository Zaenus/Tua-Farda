document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const resetForm = document.getElementById('reset-form');
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const showReset = document.getElementById('show-reset');
  const showLoginFromReset = document.getElementById('show-login-from-reset');
  const messageModal = document.getElementById('message-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalClose = document.getElementById('modal-close');
  const modalOk = document.getElementById('modal-ok');

  // Ensure modal is hidden on page load
  if (messageModal) {
    messageModal.classList.remove('active');
    console.log('Modal initialized as hidden');
  } else {
    console.error('Modal element not found');
  }

  // Toggle between forms
  const toggleForm = (showForm, hideForms) => {
    hideForms.forEach(form => {
      form.classList.remove('active');
      form.classList.add('hidden');
    });
    showForm.classList.remove('hidden');
    showForm.classList.add('active');
  };

  showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForm(signupForm, [loginForm, resetForm]);
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForm(loginForm, [signupForm, resetForm]);
  });

  showReset.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForm(resetForm, [loginForm, signupForm]);
  });

  showLoginFromReset.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForm(loginForm, [signupForm, resetForm]);
  });

  // Show modal with message
  const showModal = (message, type = 'error') => {
    if (!messageModal) {
      console.error('Cannot show modal: Modal element not found');
      return;
    }
    modalTitle.textContent = type === 'success' ? 'Success' : 'Error';
    modalMessage.textContent = message;
    messageModal.classList.add('active');
    modalTitle.classList.toggle('modal-success', type === 'success');
    modalTitle.classList.toggle('modal-error', type === 'error');
    console.log(`Modal shown: ${type} - ${message}`);
  };

  // Close modal
  const closeModal = () => {
    if (!messageModal) {
      console.error('Cannot close modal: Modal element not found');
      return;
    }
    messageModal.classList.remove('active');
    modalTitle.classList.remove('modal-success', 'modal-error');
    console.log('Modal closed');
  };

  // Close modal on click
  modalClose.addEventListener('click', closeModal);
  modalOk.addEventListener('click', closeModal);

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && messageModal.classList.contains('active')) {
      closeModal();
    }
  });

  // Validate CPF format
  function isValidCPF(cpf) {
    return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
  }

  // Handle login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.role === 'admin') window.location.href = '/admin';
        else window.location.href = '/index';
      } else {
        showModal(data.error, 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showModal('Server error', 'error');
    }
  });

  // Handle signup
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const cpf = document.getElementById('signup-cpf').value;
    const phone_number = document.getElementById('signup-phone').value;
    const address = {
      address_line1: document.getElementById('signup-address-line1').value,
      address_line2: document.getElementById('signup-address-line2').value,
      city: document.getElementById('signup-city').value,
      state: document.getElementById('signup-state').value,
      postal_code: document.getElementById('signup-postal-code').value,
      country: document.getElementById('signup-country').value,
      is_default: document.getElementById('signup-is-default').checked,
    };

    // Client-side validation
    if (!isValidCPF(cpf)) {
      showModal('Please enter a valid CPF (format: 123.456.789-00)', 'error');
      return;
    }

    // Validate email format
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      showModal('Please enter a valid email address', 'error');
      return;
    }

    // Only include address if at least address_line1 is provided
    const payload = {
      username,
      email,
      password,
      role: 'user',
      cpf,
      phone_number,
      address: address.address_line1 ? address : null,
    };

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        showModal('Registration successful! Please log in.', 'success');
        toggleForm(loginForm, [signupForm, resetForm]);
      } else {
        showModal(data.error, 'error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showModal('Server error', 'error');
    }
  });

  // Handle password reset request
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('reset-username').value;

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();

      if (response.ok) {
        showModal('Password reset link sent! Check your email.', 'success');
        toggleForm(loginForm, [signupForm, resetForm]);
      } else {
        showModal(data.error, 'error');
      }
    } catch (error) {
      console.error('Reset password request error:', error);
      showModal('Server error', 'error');
    }
  });
});