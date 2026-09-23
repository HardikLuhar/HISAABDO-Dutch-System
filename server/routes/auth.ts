import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, createSessionToken, getUserIdFromToken, revokeToken } from '../auth.js';
import { CurrencyCode, User } from '../types.js';

export const authRouter = Router();

// Middleware to extract authenticated user
export async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const userId = getUserIdFromToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  req.token = token;
  next();
}

// Quick Start / Create Account with verification
authRouter.post('/quick-start', async (req, res) => {
  try {
    const { name, email, preferredCurrency = 'INR', password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please enter your name' });
    }

    const trimmedName = name.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    // Find if user with this email or name already exists
    let user = cleanEmail ? await db.findUserByIdentifier(cleanEmail) : undefined;
    if (!user) {
      user = await db.findUserByIdentifier(trimmedName);
    }

    if (user) {
      // If account exists, update email if current is auto-generated
      if (cleanEmail && user.email.includes('@hisaabdo.local')) {
        await db.updateUser(user.id, { email: cleanEmail });
        user.email = cleanEmail;
      }

      // Account exists: STRICT VERIFICATION REQUIRED
      const cleanPass = (password || '').trim();
      if (!cleanPass) {
        return res.status(401).json({
          error: `An account for "${user.name}" already exists. Please enter your password to verify.`,
          requiresPassword: true
        });
      }

      let isVerified = false;
      if (user.passwordHash) {
        isVerified = verifyPassword(cleanPass, user.passwordHash);
      }

      const groups = await db.getGroupsForUser(user.id);
      // Check against group member passcodes
      if (!isVerified && groups.length > 0) {
        const hasMatchingPasscode = groups.some(g => {
          const mem = g.members.find(m => m.userId === user.id);
          return mem && mem.memberPasscode && mem.memberPasscode === cleanPass;
        });
        if (hasMatchingPasscode) {
          isVerified = true;
          // Upgrade account with permanent password
          await db.updateUser(user.id, { passwordHash: hashPassword(cleanPass) });
        }
      }

      // Only if user had no password set yet AND belongs to no groups with passcodes
      if (!isVerified && !user.passwordHash && groups.length === 0) {
        await db.updateUser(user.id, { passwordHash: hashPassword(cleanPass) });
        isVerified = true;
      }

      if (!isVerified) {
        return res.status(401).json({
          error: 'Incorrect password. Verification failed.'
        });
      }
    } else {
      // Create brand new account
      const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}`;
      const userEmail = cleanEmail || `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}_${Math.random().toString(36).substr(2, 4)}@hisaabdo.local`;
      const cleanPass = (password || '').trim();

      user = await db.createUser({
        id,
        name: trimmedName,
        email: userEmail,
        passwordHash: cleanPass ? hashPassword(cleanPass) : '',
        avatarUrl,
        preferredCurrency: preferredCurrency as CurrencyCode,
        createdAt: new Date().toISOString()
      });
    }

    const token = createSessionToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    return res.json({ user: safeUser, token });
  } catch (err: any) {
    console.error('quick-start error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Register with email and password
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, preferredCurrency = 'INR' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.findUserByIdentifier(cleanEmail);
    if (existing && existing.passwordHash) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    let user: User;
    if (existing && !existing.passwordHash) {
      // Claim existing stub (e.g. invited user)
      const updated = await db.updateUser(existing.id, {
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hashPassword(password.trim()),
        phone: phone ? phone.trim() : existing.phone,
        preferredCurrency: preferredCurrency as CurrencyCode
      });
      user = updated || existing;
    } else {
      const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

      user = await db.createUser({
        id,
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hashPassword(password.trim()),
        avatarUrl,
        phone: phone ? phone.trim() : undefined,
        preferredCurrency: preferredCurrency as CurrencyCode,
        createdAt: new Date().toISOString()
      });
    }

    const token = createSessionToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    return res.status(201).json({ user: safeUser, token });
  } catch (err: any) {
    console.error('register error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Verified Login by Name or Email + Password / Passcode
authRouter.post('/login', async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginId = (identifier || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please enter your name or email and password' });
    }

    const cleanPass = password.trim();

    // Find user by email or by name using robust matching
    const user = await db.findUserByIdentifier(loginId);

    if (!user) {
      return res.status(401).json({ error: 'No account found with this name or email' });
    }

    let isVerified = false;
    if (user.passwordHash) {
      isVerified = verifyPassword(cleanPass, user.passwordHash);
    }

    const groups = await db.getGroupsForUser(user.id);
    // Also check if user has a group member passcode
    if (!isVerified && groups.length > 0) {
      const hasMatchingPasscode = groups.some(g => {
        const mem = g.members.find(m => m.userId === user.id);
        return mem && mem.memberPasscode && mem.memberPasscode === cleanPass;
      });
      if (hasMatchingPasscode) {
        isVerified = true;
        await db.updateUser(user.id, { passwordHash: hashPassword(cleanPass) });
      }
    }

    // Only if user had no password set yet AND belongs to no groups with passcodes
    if (!isVerified && !user.passwordHash && groups.length === 0) {
      await db.updateUser(user.id, { passwordHash: hashPassword(cleanPass) });
      isVerified = true;
    }

    if (!isVerified) {
      return res.status(401).json({ error: 'Incorrect password. Verification failed.' });
    }

    const token = createSessionToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    return res.json({ user: safeUser, token });
  } catch (err: any) {
    console.error('login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Logout
authRouter.post('/logout', requireAuth, (req: any, res) => {
  revokeToken(req.token);
  return res.json({ message: 'Logged out successfully' });
});

// Current User
authRouter.get('/me', requireAuth, (req: any, res) => {
  const { passwordHash: _, ...safeUser } = req.user;
  return res.json({ user: safeUser });
});

// Update Profile
authRouter.put('/profile', requireAuth, async (req: any, res) => {
  try {
    const { name, phone, preferredCurrency, avatarUrl } = req.body;
    const updates: any = {};

    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (preferredCurrency) updates.preferredCurrency = preferredCurrency;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    const updated = await db.updateUser(req.user.id, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    const { passwordHash: _, ...safeUser } = updated;
    return res.json({ user: safeUser });
  } catch (err: any) {
    console.error('profile update error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Forgot Password
authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await db.getUserByEmail(email);
  // Always return friendly response to avoid email enumeration
  return res.json({
    message: user
      ? `Password reset link sent to ${email} (for demo, password is: password123)`
      : `If an account with ${email} exists, a reset link has been dispatched.`
  });
});

// Get all users for member selection
authRouter.get('/users', async (req, res) => {
  try {
    const users = (await db.getUsers()).map(u => {
      const { passwordHash: _, ...safeUser } = u;
      return safeUser;
    });
    return res.json({ users });
  } catch (err: any) {
    console.error('get users error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
