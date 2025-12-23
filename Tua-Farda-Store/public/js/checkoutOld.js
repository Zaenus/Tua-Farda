document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggler = document.querySelector(".sidebar-toggler");
  const menuToggler = document.querySelector(".menu-toggler");
  const loginItem = document.getElementById('login-item');
  const logoutItem = document.getElementById('logout-item');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartSummary = document.getElementById('cart-summary');
  const cartTotal = document.getElementById('cart-total');
  const completePurchaseButton = document.getElementById('complete-purchase');

  // Initialize Stripe
  if (typeof Stripe === 'undefined') {
    console.error('Stripe.js not loaded');
    alert('Erro: Não foi possível carregar o Stripe. Por favor, tente novamente.');
    return;
  }
  const keyResponse = await fetch('/api/stripe-key', { credentials: 'include' });
  if (!keyResponse.ok) throw new Error('Failed to fetch Stripe key');
  const { publishableKey } = await keyResponse.json();
  const stripe = Stripe(publishableKey);
  console.log('Stripe.js initialized');

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
    toggleMenu(sidebar.classList.toggle(""));
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

  // Validation functions
  function validateName(name) {
    const re = /^[A-Za-zÀ-ÿ\s]+$/;
    return re.test(name.trim()) && name.trim().length >= 2 && name.trim().length <= 100;
  }

  function validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11) return false;
    const invalidCPFs = [
      '00000000000', '11111111111', '22222222222', '33333333333',
      '44444444444', '55555555555', '66666666666', '77777777777',
      '88888888888', '99999999999'
    ];
    if (invalidCPFs.includes(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let digit = (sum * 10) % 11;
    if (digit === 10 || digit === 11) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    digit = (sum * 10) % 11;
    if (digit === 10 || digit === 11) digit = 0;
    return digit === parseInt(cpf.charAt(10));
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  function validateForm() {
    const name = document.getElementById('name').value;
    const cpf = document.getElementById('cpf').value;
    const email = document.getElementById('email').value;
    const requiredFields = ['address_line1', 'city', 'state', 'postal_code', 'country'];
    const isValid =
      validateName(name) &&
      validateCPF(cpf) &&
      validateEmail(email) &&
      requiredFields.every(id => document.getElementById(id).value.trim() !== '');
    completePurchaseButton.disabled = !isValid;
    return { name, cpf, email, isValid };
  }

  document.querySelectorAll('.input_box input').forEach(input => {
    input.addEventListener('input', validateForm);
  });

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
            <p><strong>Quantidade:</strong> ${item.quantity}</p>
            <p><strong>Subtotal:</strong> R$ ${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        `;
        cartItemsContainer.appendChild(cartItem);
      });

      cartTotal.textContent = `R$ ${total.toFixed(2)}`;
    } catch (error) {
      console.error('Load cart error:', error);
      alert('Erro ao carregar o carrinho: ' + error.message);
    }
  }

  async function loadDefaultAddress() {
    try {
      const response = await fetch('/api/profile', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      const { addresses, user } = data;
      const defaultAddress = addresses.find(addr => addr.is_default) || {};
      document.getElementById('address_line1').value = defaultAddress.address_line1 || '';
      document.getElementById('address_line2').value = defaultAddress.address_line2 || '';
      document.getElementById('city').value = defaultAddress.city || '';
      document.getElementById('state').value = defaultAddress.state || '';
      document.getElementById('postal_code').value = defaultAddress.postal_code || '';
      document.getElementById('country').value = defaultAddress.country || 'Brazil';
      document.getElementById('name').value = user.username || '';
      document.getElementById('cpf').value = user.cpf || '';
      document.getElementById('email').value = user.email || '';
      validateForm();
    } catch (error) {
      console.error('Load address error:', error);
    }
  }

completePurchaseButton.addEventListener('click', async () => {
  const { name, cpf, email, isValid } = validateForm();
  if (!isValid) {
    alert('Por favor, preencha todos os campos corretamente:\n' +
          (!validateName(name) ? '- Nome inválido (use apenas letras e espaços, 2-100 caracteres)\n' : '') +
          (!validateCPF(cpf) ? '- CPF inválido (11 dígitos, formato válido)\n' : '') +
          (!validateEmail(email) ? '- Email inválido\n' : ''));
    return;
  }

  try {
    completePurchaseButton.disabled = true;
    completePurchaseButton.innerHTML = '<span class="spinner"></span> Processando...';

    const elements = stripe.elements();
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const address = {
      address_line1: document.getElementById('address_line1').value,
      address_line2: document.getElementById('address_line2').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      postal_code: document.getElementById('postal_code').value,
      country: document.getElementById('country').value
    };

    console.log('Creating payment with method:', paymentMethod);
    const response = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: paymentMethod, address, name, cpf, email }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment');
    }

    const modal = document.getElementById('payment-modal');
    const paymentContainer = document.getElementById('payment-container');
    const pixInstructions = document.getElementById('pix-instructions');
    const responseData = await response.json();
    console.log('Payment response:', responseData);

    // Clear previous content and reset modal state
    paymentContainer.innerHTML = '';
    pixInstructions.classList.add('hidden');

    if (paymentMethod === 'credit_card') {
      console.log('Mounting card element...');
      const card = elements.create('card', {
        hidePostalCode: true,
        wallets: { applePay: 'never', googlePay: 'never' }
      });
      card.mount(paymentContainer);
      console.log('Card element mounted');

      card.on('ready', () => {
        console.log('Card element ready');
      });
      card.on('change', (event) => {
        console.log('Card change event:', event);
        const errorElement = paymentContainer.querySelector('.error');
        if (event.error && !errorElement) {
          const errorP = document.createElement('p');
          errorP.className = 'error';
          errorP.textContent = `Erro no cartão: ${event.error.message}`;
          paymentContainer.appendChild(errorP);
        } else if (!event.error && errorElement) {
          errorElement.remove();
        }
      });
      card.on('error', (event) => {
        console.error('Card element error:', event);
        const errorElement = paymentContainer.querySelector('.error');
        if (!errorElement) {
          const errorP = document.createElement('p');
          errorP.className = 'error';
          errorP.textContent = `Erro no cartão: ${event.error.message}`;
          paymentContainer.appendChild(errorP);
        }
      });

      // Add confirm button
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm-payment';
      confirmButton.textContent = 'Confirmar Pagamento';
      paymentContainer.appendChild(confirmButton);

      confirmButton.addEventListener('click', async () => {
        console.log('Confirming card payment...');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span class="spinner"></span> Processando...';
        try {
          const { error, paymentIntent } = await stripe.confirmCardPayment(responseData.clientSecret, {
            payment_method: { card }
          });

          if (error) {
            console.error('Payment error:', error);
            const errorElement = paymentContainer.querySelector('.error');
            if (!errorElement) {
              const errorP = document.createElement('p');
              errorP.className = 'error';
              errorP.textContent = `Erro no pagamento: ${error.message}`;
              paymentContainer.appendChild(errorP);
            }
          } else if (paymentIntent.status === 'succeeded') {
            console.log('Payment succeeded:', paymentIntent.id);
            alert('Pagamento com cartão confirmado!');
            window.location.href = '/my-orders.html';
            closeModal();
          }
        } finally {
          confirmButton.disabled = false;
          confirmButton.innerHTML = 'Confirmar Pagamento';
        }
      }, { once: true });

      modal.classList.remove('hidden');
    } else if (paymentMethod === 'pix') {
      paymentContainer.innerHTML = `<p><strong>ID do Pagamento:</strong> ${responseData.paymentId}</p>`;
      pixInstructions.classList.remove('hidden');
      modal.classList.remove('hidden');

      document.getElementById('upload-receipt').addEventListener('click', async () => {
        const receiptInput = document.getElementById('pix-receipt');
        if (!receiptInput.files[0]) {
          alert('Por favor, selecione um comprovante.');
          return;
        }

        const formData = new FormData();
        formData.append('receipt', receiptInput.files[0]);

        const uploadResponse = await fetch(`/api/upload-pix-receipt/${responseData.paymentId}`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload receipt');
        }

        alert('Comprovante enviado! Aguardando verificação.');
        closeModal();
      }, { once: true });

      const checkPayment = setInterval(async () => {
        try {
          const response = await fetch(`/api/check-payment/${responseData.paymentId}`, { credentials: 'include' });
          if (!response.ok) {
            throw new Error(`Failed to check payment: ${response.statusText}`);
          }
          const { status } = await response.json();
          console.log(`Payment status for ${responseData.paymentId}: ${status}`);
          if (status === 'completed') {
            clearInterval(checkPayment);
            alert('Pagamento Pix confirmado!');
            window.location.href = '/my-orders.html';
          } else if (status === 'pending_verification') {
            console.log('Pix payment is awaiting verification');
            alert('Seu comprovante está em verificação.');
          }
        } catch (error) {
          console.error('Payment check error:', error.message);
        }
      }, 5000);
    }
  } catch (error) {
    console.error('Payment error:', error);
    const paymentContainer = document.getElementById('payment-container');
    paymentContainer.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
    alert('Erro ao criar pagamento: ' + error.message);
  } finally {
    completePurchaseButton.disabled = false;
    completePurchaseButton.innerHTML = 'Completar Pagamento';
  }
});

  await loadCart();
  await loadDefaultAddress();

  document.getElementById('logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });

  document.getElementById('close-modal').addEventListener('click', closeModal);
});

function closeModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

function copyPixCode() {
  const pixCode = document.getElementById('payment-id').textContent;
  navigator.clipboard.writeText(pixCode).then(() => {
    alert('Código Pix copiado!');
  });
}