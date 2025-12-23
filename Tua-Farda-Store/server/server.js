const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Replace with your email service
  auth: {
    user: process.env.EMAIL_USER, // Add to .env
    pass: process.env.EMAIL_PASS, // Add to .env
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/images'));
  },
  filename: (req, file, cb) => {
    if (!file.originalname) {
      return cb(new Error('No file name provided'));
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(new Error('No file uploaded'));
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Use JPEG, PNG, or PDF.'));
    }
  }
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const isAuthenticated = (req, res, next) => {
  console.log('isAuthenticated - Session User:', req.session.user);
  if (req.session.user) next();
  else res.status(401).send('Unauthorized');
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') next();
  else res.status(403).send('Forbidden');
};

// Routes
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, '../public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public', 'login.html')));
app.get('/novidades', (req, res) => res.sendFile(path.join(__dirname, '../public', 'novidades.html')));
app.get('/mais-vendidos', (req, res) => res.sendFile(path.join(__dirname, '../public', 'mais-vendidos.html')));
app.get('/ofertas', (req, res) => res.sendFile(path.join(__dirname, '../public', 'ofertas.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, '../public', 'reset-password.html')));
//app.get('/checkout-complete', (req, res) => res.sendFile(path.join(__dirname, '../public', 'checkout-complete.html')));
//app.get('/checkout-cancel', (req, res) => res.sendFile(path.join(__dirname, '../public', 'checkout-cancel.html')));
app.get('/cart', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../public', 'cart.html')));
app.get('/checkout', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../public', 'checkout.html')));
app.get('/admin', isAdmin, (req, res) => res.sendFile(path.join(__dirname, '../public', 'admin.html')));
app.get('/my-orders', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../public', 'my-orders.html')));
app.get('/orders', isAdmin, (req, res) => res.sendFile(path.join(__dirname, '../public', 'orders.html')));

// API Endpoints
app.get('/api/user', isAuthenticated, (req, res) => {
  console.log('GET /api/user - Session User:', req.session.user);
  res.json({ id: req.session.user.id, username: req.session.user.username, role: req.session.user.role });
});

app.post('/api/register', async (req, res) => {
  const { username, password, role, cpf, phone_number, email, address } = req.body;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    // Validate email
    if (!email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ? OR cpf = ?', [username, cpf], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or CPF already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password, role, cpf, phone_number, email) VALUES (?, ?, ?, ?, ?, ?)',
        [username, hashedPassword, role || 'user', cpf, phone_number, email],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    if (address) {
      const { address_line1, address_line2, city, state, postal_code, country, is_default } = address;
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO addresses (user_id, address_line1, address_line2, city, state, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, address_line1, address_line2 || null, city, state, postal_code, country, is_default ? 1 : 0],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

// Forgot Password Endpoint
app.post('/api/forgot-password', async (req, res) => {
  const { username } = req.body;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, username, email FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has a valid email
    if (!user.email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(user.email)) {
      return res.status(400).json({ error: 'No valid email associated with this account. Please update your email in your profile.' });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiration

    // Store token in database
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO password_resets (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)',
        [user.id, token, createdAt, expiresAt],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Send email with reset link
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email, // Use user.email directly
      subject: 'Tua Farda Password Reset',
      html: `
        <p>Hello ${username},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset link sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

// Reset Password Endpoint
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    // Find valid token
    const reset = await new Promise((resolve, reject) => {
      db.get(
        'SELECT user_id, expires_at FROM password_resets WHERE token = ?',
        [token],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const now = new Date();
    const expiresAt = new Date(reset.expires_at);
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Update user password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, reset.user_id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Delete used token
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM password_resets WHERE token = ?', [token], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = { id: user.id, username: user.username, role: user.role };
      console.log('POST /api/login - Session Set:', req.session.user);
      res.json({ message: 'Login successful', role: user.role });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.post('/api/logout', (req, res) => {
  console.log('POST /api/logout - Session Before Destroy:', req.session.user);
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    console.log('POST /api/logout - Session After Destroy:', req.session);
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/shirts', async (req, res) => {
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM shirts', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(rows);
  } catch (error) {
    console.error('Get shirts error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/shirts/:id', async (req, res) => {
  const { id } = req.params;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const shirt = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM shirts WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!shirt) {
      return res.status(404).json({ error: 'Shirt not found' });
    }

    res.json(shirt);
  } catch (error) {
    console.error('Get shirt by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.get('/api/cart', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const cartItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, s.name, s.price, s.image_url
        FROM cart c
        JOIN shirts s ON c.shirt_id = s.id
        WHERE c.user_id = ?
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(cartItems);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.post('/api/cart', isAuthenticated, async (req, res) => {
  const { shirt_id, quantity } = req.body;
  const userId = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const shirt = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM shirts WHERE id = ?', [shirt_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!shirt) {
      return res.status(404).json({ error: 'Shirt not found' });
    }

    const existingItem = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM cart WHERE user_id = ? AND shirt_id = ?', [userId, shirt_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingItem) {
      await new Promise((resolve, reject) => {
        db.run('UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND shirt_id = ?',
          [quantity || 1, userId, shirt_id],
          (err) => (err ? reject(err) : resolve())
        );
      });
    } else {
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO cart (user_id, shirt_id, quantity) VALUES (?, ?, ?)',
          [userId, shirt_id, quantity || 1],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    res.json({ message: 'Item added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.put('/api/cart/:shirt_id', isAuthenticated, async (req, res) => {
  const { shirt_id } = req.params;
  const { quantity } = req.body;
  const userId = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    await new Promise((resolve, reject) => {
      db.run('UPDATE cart SET quantity = ? WHERE user_id = ? AND shirt_id = ?',
        [quantity, userId, shirt_id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({ message: 'Cart updated' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.delete('/api/cart/:shirt_id', isAuthenticated, async (req, res) => {
  const { shirt_id } = req.params;
  const userId = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM cart WHERE user_id = ? AND shirt_id = ?',
        [userId, shirt_id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.delete('/api/cart', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.post('/api/create-payment', isAuthenticated, async (req, res) => {
  const { payment_method, address, name, cpf, email } = req.body;
  const userId = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const validMethods = ['pix', 'credit_card'];
    if (!validMethods.includes(payment_method)) {
      console.error('Invalid payment method:', payment_method);
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT username, cpf, phone_number FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const cartItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, s.name, s.price, s.image_url
        FROM cart c
        JOIN shirts s ON c.shirt_id = s.id
        WHERE c.user_id = ?
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (!cartItems.length) {
      console.error('Cart is empty for user:', userId);
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    let finalAddress = address || {};
    if (!finalAddress.address_line1 || !finalAddress.city || !finalAddress.state || !finalAddress.postal_code || !finalAddress.country) {
      console.error('Incomplete address:', finalAddress);
      return res.status(400).json({ error: 'Complete address required (street, city, state, postal code, country)' });
    }

    finalAddress.state = finalAddress.state.toUpperCase();
    finalAddress.postal_code = finalAddress.postal_code.replace(/\D/g, '');
    if (!/^\d{8}$/.test(finalAddress.postal_code)) {
      console.error('Invalid postal code:', finalAddress.postal_code);
      return res.status(400).json({ error: 'Invalid postal code: Must be 8 digits' });
    }

    let paymentId;
    let paymentResponse;

    if (payment_method === 'credit_card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: 'brl',
        payment_method_types: ['card'],
        metadata: { userId, orderId: `ORDER_${Date.now()}` },
        receipt_email: email || user.email,
      });

      paymentId = paymentIntent.id;
      paymentResponse = { clientSecret: paymentIntent.client_secret };
    } else if (payment_method === 'pix') {
      paymentId = `PIX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      paymentResponse = { 
        paymentId, 
        instructions: 'Please send the Pix payment to [Your Pix Key] and send the proof to WhatsApp: https://wa.me/5511999999999' 
      };
    }

    console.log('Creating orders for paymentId:', paymentId, 'user:', user.username);
    for (const item of cartItems) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO orders (
            shirt_id, customer, amount, payment_status, payment_id, payment_method, 
            created_at, address_line1, address_line2, city, state, postal_code, country, cpf
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.shirt_id,
            user.username,
            item.price * item.quantity,
            'pending',
            paymentId,
            payment_method,
            new Date().toISOString(),
            finalAddress.address_line1 || null,
            finalAddress.address_line2 || null,
            finalAddress.city || null,
            finalAddress.state || null,
            finalAddress.postal_code || null,
            finalAddress.country || null,
            cpf || user.cpf
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('Clearing cart for user:', userId);
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Payment created successfully:', paymentId);
    res.json(paymentResponse);
  } catch (error) {
    console.error('Payment creation error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/verify-pix-payment/:paymentId', isAdmin, async (req, res) => {
  const { paymentId } = req.params;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    console.log('Verifying Pix payment:', paymentId);
    const order = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM orders WHERE payment_id = ?', [paymentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      console.error('Payment not found for verification:', paymentId);
      return res.status(404).json({ error: 'Payment not found' });
    }

    await new Promise((resolve, reject) => {
      db.run('UPDATE orders SET payment_status = "completed" WHERE payment_id = ?',
        [paymentId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    console.log(`Pix payment ${paymentId} verified as completed`);
    res.json({ message: 'Payment verified' });
  } catch (error) {
    console.error('Verify payment error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.post('/api/add-shirt', isAdmin, upload.single('image'), async (req, res) => {
  const { name, price, category, description } = req.body;
  const image_url = req.file ? `/images/${req.file.filename}` : '/images/default.jpg';
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO shirts (name, price, image_url, category, description) VALUES (?, ?, ?, ?, ?)',
        [name, parseFloat(price), image_url, category, description],
        (err) => (err ? reject(err) : resolve())
      );
    });
    res.json({ message: 'Shirt added' });
  } catch (error) {
    console.error('Add shirt error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/reviews', isAuthenticated, async (req, res) => {
  const { shirt_id, rating, comment } = req.body;
  const user_id = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const hasPurchased = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM orders WHERE shirt_id = ? AND customer = ? AND payment_status = "completed"',
        [shirt_id, req.session.user.username],
        (err, row) => (err ? reject(err) : resolve(!!row))
      );
    });

    if (!hasPurchased) {
      return res.status(403).json({ error: 'You must purchase this shirt to review it' });
    }

    const existingReview = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM reviews WHERE shirt_id = ? AND user_id = ?',
        [shirt_id, user_id],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if (existingReview) {
      await new Promise((resolve, reject) => {
        db.run('UPDATE reviews SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP WHERE shirt_id = ? AND user_id = ?',
          [rating, comment, shirt_id, user_id],
          (err) => (err ? reject(err) : resolve())
        );
      });
      res.json({ message: 'Review updated', updated: true });
    } else {
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO reviews (shirt_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
          [shirt_id, user_id, rating, comment],
          (err) => (err ? reject(err) : resolve())
        );
      });
      res.json({ message: 'Review submitted', updated: false });
    }
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/reviews/:shirt_id', async (req, res) => {
  const { shirt_id } = req.params;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const reviews = await new Promise((resolve, reject) => {
      db.all(`
        SELECT r.*, u.username 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.shirt_id = ? 
        ORDER BY r.created_at DESC`,
        [shirt_id],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.delete('/api/reviews/:shirt_id', isAuthenticated, async (req, res) => {
  const { shirt_id } = req.params;
  const user_id = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM reviews WHERE shirt_id = ? AND user_id = ?',
        [shirt_id, user_id],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Review not found or not yours' });
    }

    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/update-payment-status', isAdmin, async (req, res) => {
  const { payment_id, status } = req.body;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    await new Promise((resolve, reject) => {
      db.run('UPDATE orders SET payment_status = ? WHERE payment_id = ?',
        [status, payment_id],
        (err) => (err ? reject(err) : resolve())
      );
    });
    res.json({ message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/orders/check-purchase/:shirt_id', isAuthenticated, async (req, res) => {
  const { shirt_id } = req.params;
  const username = req.session.user.username;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const hasPurchased = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM orders WHERE shirt_id = ? AND customer = ? AND payment_status = "completed"',
        [shirt_id, username],
        (err, row) => (err ? reject(err) : resolve(!!row))
      );
    });
    res.json(hasPurchased);
  } catch (error) {
    console.error('Check purchase error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.delete('/api/shirt/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM shirts WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    res.json({ message: 'Shirt deleted' });
  } catch (error) {
    console.error('Delete shirt error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/orders', isAuthenticated, async (req, res) => {
  const username = req.session.user.username;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const orders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.id, o.shirt_id, o.amount, o.payment_status, o.payment_id, o.created_at, o.payment_method, s.name as shirt_name, s.image_url
        FROM orders o
        JOIN shirts s ON o.shirt_id = s.id
        WHERE o.customer = ?
        ORDER BY o.created_at DESC`,
        [username],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.get('/api/all-orders', isAdmin, async (req, res) => {
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));

  try {
    const orders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          o.id, o.shirt_id, o.customer, o.amount, o.payment_status, o.payment_id, 
          o.payment_method, o.created_at, o.address_line1, o.address_line2, 
          o.city, o.state, o.postal_code, o.country, o.cpf, o.phone_number,
          s.name as shirt_name, s.image_url
        FROM orders o
        JOIN shirts s ON o.shirt_id = s.id
        ORDER BY o.created_at DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    res.json(orders);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.get('/api/profile', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const db = new sqlite3.Database(path.join(__dirname, 'shirts.db'));
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, username, cpf, phone_number FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    const addresses = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM addresses WHERE user_id = ?', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json({ user, addresses });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    db.close();
  }
});

app.get('/api/stripe-key', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});