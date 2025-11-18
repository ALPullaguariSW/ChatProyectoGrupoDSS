import { Router } from 'express';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth';
import User from '../models/User';
import { auditLog } from '../utils/logger';
import logger from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/admin/users
 * @desc    Listar todos los usuarios (solo admin)
 * @access  Private + Admin
 */
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await User.find()
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users: users.map(u => ({
        _id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        twoFactorEnabled: u.twoFactorEnabled,
        isActive: u.isActive !== undefined ? u.isActive : true,
        createdAt: u.createdAt,
      })),
    });

    const ip = (req.ip || '').replace('::ffff:', '');
    auditLog('ADMIN_LIST_USERS', req.user!.userId, ip, { count: users.length });
  } catch (error) {
    logger.error('Error listando usuarios:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Obtener detalles de un usuario específico
 * @access  Private + Admin
 */
router.get('/users/:userId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -twoFactorSecret');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdAt: user.createdAt,
      },
    });

    const ip = (req.ip || '').replace('::ffff:', '');
    auditLog('ADMIN_VIEW_USER', req.user!.userId, ip, { targetUser: user.username });
    return;
  } catch (error) {
    logger.error('Error obteniendo usuario:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
    return;
  }
});

/**
 * @route   PATCH /api/admin/users/:userId
 * @desc    Actualizar estado de un usuario (activar/bloquear)
 * @access  Private + Admin
 */
router.patch('/users/:userId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // No permitir bloquear al admin principal
    if (user.role === 'admin' && user.username === 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No se puede bloquear al administrador principal' 
      });
    }

    // Actualizar estado
    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `Usuario ${isActive ? 'activado' : 'bloqueado'} exitosamente`,
      user: {
        _id: user._id,
        username: user.username,
        isActive: user.isActive,
      },
    });

    const ip = (req.ip || '').replace('::ffff:', '');
    auditLog('ADMIN_UPDATE_USER', req.user!.userId, ip, {
      targetUser: user.username,
      action: isActive ? 'ACTIVATE' : 'BLOCK',
    });
    return;
  } catch (error) {
    logger.error('Error actualizando usuario:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
    return;
  }
});

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Eliminar un usuario
 * @access  Private + Admin
 */
router.delete('/users/:userId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // No permitir eliminar al admin principal
    if (user.role === 'admin' && user.username === 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No se puede eliminar al administrador principal' 
      });
    }

    // No permitir eliminar a otros admins
    if (user.role === 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'No se puede eliminar a otros administradores' 
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: `Usuario "${user.username}" eliminado exitosamente`,
    });

    const ip = (req.ip || '').replace('::ffff:', '');
    auditLog('ADMIN_DELETE_USER', req.user!.userId, ip, { 
      deletedUser: user.username,
      deletedUserId: user._id,
    });
    return;
  } catch (error) {
    logger.error('Error eliminando usuario:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
    return;
  }
});

export default router;
