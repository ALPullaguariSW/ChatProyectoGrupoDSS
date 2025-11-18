import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authenticate } from '../middleware/auth';
import { analyzeFile } from '../services/steganographyService';
import FileModel from '../models/File';
import { generateHash } from '../utils/crypto';
import { auditLog } from '../utils/logger';
import logger from '../utils/logger';
import config from '../config';

const router = express.Router();

// Configurar storage de multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Validar archivo
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.fileUpload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.fileUpload.maxSize,
  },
  fileFilter,
});

/**
 * @route   POST /api/files/upload
 * @desc    Subir archivo a sala multimedia
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No se proporcionó archivo' });
      return;
    }

    const { roomId, nickname } = req.body;

    if (!roomId) {
      // Eliminar archivo si no hay roomId
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: 'roomId requerido' });
      return;
    }

    const ip = (req.ip || '').replace('::ffff:', '');

    // Calcular hash del archivo
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = generateHash(fileBuffer.toString('base64'));

    // Crear registro en BD
    const fileRecord = new FileModel({
      roomId,
      userId: req.user.userId,
      nickname: nickname || req.user.username,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      fileHash,
      ip,
    });

    await fileRecord.save();

    // Análisis de esteganografía en background (si está habilitado)
    if (config.steganography.enabled) {
      analyzeFile(req.file.path, config.steganography.entropyThreshold)
        .then(async (result) => {
          fileRecord.steganographyCheck = {
            checked: true,
            passed: result.isPassed,
            entropy: result.entropy,
            details: result.details,
          };
          await fileRecord.save();

          // Si no pasó el análisis, alertar
          if (!result.isPassed) {
            logger.warn(`Archivo sospechoso detectado: ${req.file!.filename}`, {
              roomId,
              userId: req.user!.userId,
              details: result.details,
            });

            auditLog('FILE_SUSPICIOUS', req.user!.userId, ip, {
              roomId,
              filename: req.file!.originalname,
              reason: result.details,
            });
          }
        })
        .catch((error) => {
          logger.error('Error en análisis de esteganografía:', error);
        });
    }

    auditLog('FILE_UPLOADED', req.user.userId, ip, {
      roomId,
      filename: req.file.originalname,
      size: req.file.size,
    });

    res.json({
      success: true,
      file: {
        id: fileRecord._id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        size: fileRecord.size,
        mimetype: fileRecord.mimetype,
        uploadedAt: fileRecord.uploadedAt,
      },
    });
  } catch (error) {
    logger.error('Error subiendo archivo:', error);
    
    // Eliminar archivo si hubo error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        logger.error('Error eliminando archivo:', e);
      }
    }
    
    res.status(500).json({ success: false, message: 'Error subiendo archivo' });
  }
});

/**
 * @route   GET /api/files/:fileId
 * @desc    Descargar archivo
 * @access  Public
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await FileModel.findById(fileId);

    if (!file) {
      res.status(404).json({ success: false, message: 'Archivo no encontrado' });
      return;
    }

    // Verificar si pasó el análisis de esteganografía
    if (config.steganography.enabled && file.steganographyCheck.checked && !file.steganographyCheck.passed) {
      res.status(403).json({
        success: false,
        message: 'Archivo bloqueado: no pasó verificación de seguridad',
        details: file.steganographyCheck.details,
      });
      return;
    }

    // Verificar si el archivo existe
    if (!fs.existsSync(file.path)) {
      res.status(404).json({ success: false, message: 'Archivo no encontrado en el sistema' });
      return;
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    logger.error('Error descargando archivo:', error);
    res.status(500).json({ success: false, message: 'Error descargando archivo' });
  }
});

/**
 * @route   GET /api/files/room/:roomId
 * @desc    Obtener archivos de una sala
 * @access  Public
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const files = await FileModel.find({ roomId })
      .sort({ uploadedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      files: files.map(f => ({
        id: f._id,
        originalName: f.originalName,
        mimetype: f.mimetype,
        size: f.size,
        uploadedAt: f.uploadedAt,
        nickname: f.nickname,
        steganographyCheck: f.steganographyCheck,
      })),
    });
  } catch (error) {
    logger.error('Error obteniendo archivos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo archivos' });
  }
});

export default router;
