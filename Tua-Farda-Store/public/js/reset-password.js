document.addEventListener('DOMContentLoaded', () => {
  const resetPasswordForm = document.getElementById('reset-password-form');
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

  // Show modal with message
  const showModal = (message, type = 'error', redirectUrl = null) => {
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

    // Auto-redirect for success messages if redirectUrl is provided
    if (type === 'success' && redirectUrl) {
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 3000); // 3-second delay
    }
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

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    showModal('Invalid or missing token', 'error', '/login.html');
    return;
  }

  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      showModal('Passwords do not match', 'error');
      return;
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        showModal('Password reset successful! Please log in.', 'success', '/login.html');
      } else {
        showModal(data.error, 'error');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      showModal('Server error', 'error');
    }
  });
});