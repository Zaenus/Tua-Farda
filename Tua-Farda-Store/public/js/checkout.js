document.addEventListener('DOMContentLoaded', async () => {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartSummary = document.getElementById('cart-summary');
  const cartTotal = document.getElementById('cart-total');
  const completePurchaseButton = document.getElementById('complete-purchase');
  const paymentModal = document.getElementById('payment-modal');
  const paymentContainer = document.getElementById('payment-container');
  const pixInstructions = document.getElementById('pix-instructions');
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

  // Initialize Stripe
  if (typeof Stripe === 'undefined') {
    console.error('Stripe.js not loaded');
    alert('Erro: Não foi possível carregar o Stripe. Por favor, tente novamente.');
    return;
  }
  try {
    const keyResponse = await fetch('/api/stripe-key', { credentials: 'include' });
    if (!keyResponse.ok) throw new Error('Failed to fetch Stripe key');
    const { publishableKey } = await keyResponse.json();
    const stripe = Stripe(publishableKey);
    console.log('Stripe.js initialized');

    // Validation functions
    function validateName(name) {
      if (!name.trim()) return false;
      const re = /^[A-Za-zÀ-ÿ\s]+$/;
      return re.test(name.trim()) && name.trim().length >= 2 && name.trim().length <= 100;
    }

    function validateCPF(cpf) {
      if (!cpf.trim()) return false;
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
      if (!email.trim()) return false;
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
          completePurchaseButton.disabled = true;
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
        validateForm();
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
        document.getElementById('email').value = '';
        validateForm();
      } catch (error) {
        console.error('Load address error:', error);
      }
    }

    // Function to show success modal
    function showSuccessModal(title, message, onClose) {
      paymentContainer.innerHTML = `
        <div class="success-modal">
          <i class="fa-regular fa-circle-check"></i>
          <h2>${title}</h2>
          <h3>${message}</h3>
          <div class="buttons">
            <button class="close-success-btn">Ok, Fechar</button>
          </div>
        </div>
      `;
      pixInstructions.classList.add('hidden');
      paymentModal.classList.remove('hidden');

      const closeBtn = paymentContainer.querySelector('.close-success-btn');
      closeBtn.addEventListener('click', () => {
        closeModal();
        if (onClose) onClose();
      }, { once: true });

      // Allow clicking overlay to close
      paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
          closeModal();
          if (onClose) onClose();
        }
      }, { once: true });
    }

    // Function to show error modal
    function showErrorModal(errors) {
      paymentContainer.innerHTML = `
        <div class="error-modal">
          <i class="fa-solid fa-circle-exclamation"></i>
          <h2>Erro no Formulário</h2>
          <ul>
            ${errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
          <div class="buttons">
            <button class="close-error-btn">Ok, Fechar</button>
          </div>
        </div>
      `;
      pixInstructions.classList.add('hidden');
      paymentModal.classList.remove('hidden');

      const closeBtn = paymentContainer.querySelector('.close-error-btn');
      closeBtn.addEventListener('click', closeModal, { once: true });

      // Allow clicking overlay to close
      paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
          closeModal();
        }
      }, { once: true });
    }

    completePurchaseButton.addEventListener('click', async () => {
      const { name, cpf, email, isValid } = validateForm();
      if (!isValid) {
        const errors = [];
        if (!name.trim()) {
          errors.push('Nome é obrigatório');
        } else if (!validateName(name)) {
          errors.push('Nome inválido (use apenas letras e espaços, 2-100 caracteres)');
        }
        if (!cpf.trim()) {
          errors.push('CPF é obrigatório');
        } else if (!validateCPF(cpf)) {
          errors.push('CPF inválido (11 dígitos, formato válido)');
        }
        if (!email.trim()) {
          errors.push('Email é obrigatório');
        } else if (!validateEmail(email)) {
          errors.push('Email inválido');
        }
        const requiredFields = ['address_line1', 'city', 'state', 'postal_code', 'country'];
        const emptyFields = requiredFields.filter(id => !document.getElementById(id).value.trim());
        if (emptyFields.length > 0) {
          const fieldNames = {
            address_line1: 'Endereço',
            city: 'Cidade',
            state: 'Estado',
            postal_code: 'CEP',
            country: 'País'
          };
          emptyFields.forEach(field => {
            errors.push(`${fieldNames[field]} é obrigatório`);
          });
        }
        showErrorModal(errors);
        return;
      }

      try {
        completePurchaseButton.disabled = true;
        completePurchaseButton.innerHTML = '<span class="spinner"></span> Processando...';

        const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
        const address = {
          address_line1: document.getElementById('address_line1').value,
          address_line2: document.getElementById('address_line2').value,
          city: document.getElementById('city').value,
          state: document.getElementById('state').value,
          postal_code: document.getElementById('postal_code').value,
          country: document.getElementById('country').value
        };

        console.log('Creating payment with method:', paymentMethod, 'address:', address);
        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_method: paymentMethod, address, name, cpf, email }),
          credentials: 'include',
        });

        const responseData = await response.json();
        console.log('Create payment response:', responseData);
        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to create payment');
        }

        paymentContainer.innerHTML = '';
        pixInstructions.classList.add('hidden');
        paymentModal.classList.remove('hidden');

        if (paymentMethod === 'credit_card') {
          console.log('Mounting card element...');
          const elements = stripe.elements();
          const card = elements.create('card', {
            hidePostalCode: true,
            wallets: { hide: true }
          });
          card.mount('#payment-container');
          console.log('Card element mounted');

          card.on('change', (event) => {
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

          const confirmButton = document.createElement('button');
          confirmButton.id = 'confirm-payment';
          confirmButton.textContent = 'Confirmar Pagamento';
          paymentContainer.appendChild(confirmButton);

          confirmButton.addEventListener('click', async () => {
            confirmButton.disabled = true;
            confirmButton.innerHTML = '<span class="spinner"></span> Processando...';
            try {
              const { error, paymentIntent } = await stripe.confirmCardPayment(responseData.clientSecret, {
                payment_method: { card }
              });

              if (error) {
                throw new Error(error.message);
              }
              if (paymentIntent.status === 'succeeded') {
                console.log('Payment succeeded:', paymentIntent.id);
                showSuccessModal(
                  'Pagamento Confirmado',
                  'Seu pagamento com cartão foi processado com sucesso!',
                  () => {
                    window.location.href = '/my-orders.html';
                    closeModal();
                  }
                );
              }
            } catch (error) {
              console.error('Payment error:', error);
              paymentContainer.innerHTML += `<p class="error">Erro no pagamento: ${error.message}</p>`;
              alert('Erro no pagamento: ' + error.message);
            } finally {
              confirmButton.disabled = false;
              confirmButton.innerHTML = 'Confirmar Pagamento';
            }
          }, { once: true });
        } else if (paymentMethod === 'pix') {
          paymentContainer.innerHTML = `
            <p><strong>ID do Pagamento:</strong> <span id="payment-id">${responseData.paymentId}</span></p>
            <button id="copy-pix">Copiar ID</button>
            <button id="whatsapp-redirect">Enviar Comprovante via WhatsApp</button>
          `;
          pixInstructions.classList.remove('hidden');

          document.getElementById('copy-pix').addEventListener('click', () => {
            const pixCode = document.getElementById('payment-id').textContent;
            navigator.clipboard.writeText(pixCode).then(() => {
              alert('Código Pix copiado!');
            });
          });

          document.getElementById('whatsapp-redirect').addEventListener('click', () => {
            const message = encodeURIComponent(`Olá, fiz o pagamento Pix com ID: ${responseData.paymentId}. Aqui está o comprovante.`);
            window.open(`https://wa.me/5514998703510?text=${message}`, '_blank');
            showSuccessModal(
              'Ação Necessária',
              'Você será redirecionado para o WhatsApp. Envie o comprovante e aguarde a verificação.',
              () => {
                setTimeout(() => {
                  window.location.href = '/my-orders.html';
                }, 3000);
              }
            );
          });
        }
      } catch (error) {
        console.error('Payment error:', error);
        paymentContainer.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
        alert('Erro ao criar pagamento: ' + error.message);
      } finally {
        completePurchaseButton.disabled = false;
        completePurchaseButton.innerHTML = 'Completar Pagamento';
      }
    });

    // Check login status
    try {
      const userResponse = await fetch('/api/user', { credentials: 'include' });
      if (userResponse.ok) {
        const user = await userResponse.json();
        const welcome = document.getElementById('welcome');
        welcome.textContent = `Bem-vindo, ${user.username}! Seu Jogo, Seu Estilo`;
        document.getElementById('login-item').classList.add('hidden');
        document.getElementById('login-item').style.display = 'none';
        document.getElementById('logout-item').classList.remove('hidden');
        document.getElementById('logout-item').style.display = 'block';
      } else {
        window.location.href = '/login.html';
      }
    } catch (error) {
      console.error('User check error:', error);
      window.location.href = '/login.html';
    }

    // Load initial data
    await loadCart();
    await loadDefaultAddress();

    // Event listeners
    document.getElementById('logout').addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/index.html';
    });

    document.getElementById('close-modal').addEventListener('click', closeModal);
  } catch (error) {
    console.error('Stripe initialization error:', error);
    alert('Erro ao inicializar pagamento: ' + error.message);
  }
});

function closeModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}