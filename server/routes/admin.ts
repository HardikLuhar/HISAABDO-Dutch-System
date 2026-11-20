import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './auth.js';
import { checkIsSiteAdmin } from './groups.js';
import { hashPassword } from '../auth.js';
import { sendHisaabdoEmail } from '../email.js';

export const adminRouter = Router();
export const noticesRouter = Router();

// Middleware: Verify Site Admin privileges
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || !checkIsSiteAdmin(req.user)) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

// Apply authentication and admin check to all admin routes
adminRouter.use(requireAuth, requireAdmin);

// ─── 1. Dashboard Analytics & Performance ────────────────────────────────────

adminRouter.get('/stats', async (req, res) => {
  try {
    const stats = await db.getAdminStats();
    return res.json(stats);
  } catch (err: any) {
    console.error('get admin stats error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── 2. User Management ──────────────────────────────────────────────────────

// View all registered users with summary stats
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await db.getAdminUsers();
    return res.json({ users });
  } catch (err: any) {
    console.error('get admin users error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// View individual user details, memberships, activity & login history
adminRouter.get('/users/:id', async (req, res) => {
  try {
    const detail = await db.getAdminUserDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(detail);
  } catch (err: any) {
    console.error('get admin user detail error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Edit user profile details
adminRouter.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, upiId, preferredCurrency, avatarUrl } = req.body;

    const existing = await db.getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates: any = {};
    if (name && name.trim()) {
      const cleanName = name.trim();
      if (cleanName.toLowerCase() !== existing.name.toLowerCase()) {
        const taken = await db.isNameTaken(cleanName, id);
        if (taken) {
          return res.status(400).json({ error: `The name "${cleanName}" is already taken.` });
        }
      }
      updates.name = cleanName;
    }
    if (email && email.trim()) updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (upiId !== undefined) updates.upiId = upiId ? upiId.trim() : '';
    if (preferredCurrency) updates.preferredCurrency = preferredCurrency;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    const updated = await db.updateUser(id, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update user' });
    }

    const { passwordHash: _, ...safeUser } = updated;
    return res.json({ success: true, user: safeUser, message: 'User profile updated successfully' });
  } catch (err: any) {
    console.error('admin update user error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete user account
adminRouter.delete('/users/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own administrator account' });
    }

    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.deleteUser(id);
    return res.json({ success: true, message: `User "${user.name}" has been deleted.` });
  } catch (err: any) {
    console.error('admin delete user error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── 3. Password & Security Management ────────────────────────────────────────

// Reset user password directly
adminRouter.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: 'Please enter a valid new password' });
    }

    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cleanPass = newPassword.trim();
    await db.updateUser(id, { passwordHash: hashPassword(cleanPass) });

    return res.json({ success: true, message: `Password for "${user.name}" has been successfully reset.` });
  } catch (err: any) {
    console.error('admin reset password error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Reset all details of a user
adminRouter.post('/users/:id/reset-all', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetUser = await db.resetUserAllDetails(id);
    if (!resetUser) {
      return res.status(500).json({ error: 'Failed to reset user details' });
    }

    const { passwordHash: _, ...safeUser } = resetUser;
    return res.json({
      success: true,
      user: safeUser,
      message: `All details and security settings for "${user.name}" have been reset to defaults.`
    });
  } catch (err: any) {
    console.error('admin reset all user details error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── 4. User Activity & Login History ────────────────────────────────────────

// View login history
adminRouter.get('/logins', async (req, res) => {
  try {
    const { userId, limit } = req.query;
    const logins = await db.getUserLogins(
      typeof userId === 'string' ? userId : undefined,
      limit ? Math.min(Number(limit), 500) : 100
    );
    return res.json({ logins });
  } catch (err: any) {
    console.error('get admin logins error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── 5. Admin Notice Management (Admin only) ─────────────────────────────────

// List all notices
adminRouter.get('/notices', async (req, res) => {
  try {
    const notices = await db.getAdminNotices();
    return res.json({ notices });
  } catch (err: any) {
    console.error('get admin notices error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Create and broadcast a new notice
adminRouter.post('/notices', async (req: any, res) => {
  try {
    const { title, message, priority = 'normal' } = req.body;
    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'Notice title and message are required' });
    }

    const notice = await db.createAdminNotice({
      title,
      message,
      priority,
      createdBy: req.user.id,
      createdByName: req.user.name,
    });

    return res.status(201).json({ success: true, notice, message: 'Notice sent to all users successfully' });
  } catch (err: any) {
    console.error('create admin notice error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete/deactivate notice
adminRouter.delete('/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteAdminNotice(id);
    return res.json({ success: true, message: 'Notice deleted successfully' });
  } catch (err: any) {
    console.error('delete admin notice error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── 6. Broadcast Email Management (Admin only) ──────────────────────────────

adminRouter.post('/send-email', async (req: any, res) => {
  try {
    const { recipientMode = 'all', selectedUserIds = [], subject, message, actionUrl, actionText } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Email subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Email message content is required' });
    }

    const allUsers = await db.getUsers();
    let targetUsers: typeof allUsers = [];

    if (recipientMode === 'all') {
      targetUsers = allUsers;
    } else {
      const selectedSet = new Set(selectedUserIds);
      targetUsers = allUsers.filter(u => selectedSet.has(u.id));
    }

    // Filter to valid real emails (no local dummy accounts)
    const validUsers = targetUsers.filter(u => u.email && u.email.includes('@') && !u.email.includes('@hisaabdo.local'));

    if (validUsers.length === 0) {
      return res.status(400).json({
        error: 'No valid recipient email addresses found among selected users (dummy @hisaabdo.local accounts were skipped).'
      });
    }

    const recipientEmails = validUsers.map(u => u.email);

    const result = await sendHisaabdoEmail({
      to: recipientEmails,
      subject: subject.trim(),
      message: message.trim(),
      senderName: req.user.name || 'Hardik (Hisaabdo Admin)',
      actionUrl: actionUrl?.trim() || undefined,
      actionText: actionText?.trim() || undefined
    });

    return res.json({
      success: result.success,
      result,
      message: `Email broadcast processed: Successfully sent to ${result.sentCount} of ${result.totalRecipients} recipient(s).`
    });
  } catch (err: any) {
    console.error('admin send-email error:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch emails' });
  }
});

// ─── 6. User Notice Acknowledgement (Any authenticated user) ──────────────────

// Check for pending unacknowledged notice for current user
noticesRouter.get('/pending', requireAuth, async (req: any, res) => {
  try {
    const notice = await db.getPendingNoticeForUser(req.user.id);
    return res.json({ notice });
  } catch (err: any) {
    console.error('get pending notice error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Acknowledge a notice
noticesRouter.post('/:id/acknowledge', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.acknowledgeNotice(id, req.user.id);
    return res.json({ success: true, message: 'Notice acknowledged' });
  } catch (err: any) {
    console.error('acknowledge notice error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
