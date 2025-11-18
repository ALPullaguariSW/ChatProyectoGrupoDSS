import mongoose from 'mongoose';
import config from './config';
import User from './models/User';
import logger from './utils/logger';

const createDefaultAdmin = async () => {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('Conectado a MongoDB para crear admin por defecto');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      logger.info('Usuario admin ya existe. No se creará duplicado.');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@securechat.com',
      password: 'Admin123!@#', // Will be hashed by pre-save hook
      role: 'admin',
    });

    await adminUser.save();
    logger.info('✅ Usuario administrador creado exitosamente');
    logger.info('   Username: admin');
    logger.info('   Password: Admin123!@#');
    logger.info('⚠️  IMPORTANTE: Cambia esta contraseña en producción');

    process.exit(0);
  } catch (error) {
    logger.error('Error al crear usuario admin:', error);
    process.exit(1);
  }
};

createDefaultAdmin();
