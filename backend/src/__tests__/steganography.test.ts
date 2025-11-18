import { analyzeFile } from '../services/steganographyService';
import * as fs from 'fs';
import * as path from 'path';

describe('Steganography Detection (Shannon Entropy)', () => {
  describe('analyzeFile - Entropy Analysis', () => {
    it('should detect high entropy in suspicious files (>7.5)', async () => {
      // Simulamos archivo con alta entropía (datos aleatorios)
      const randomBuffer = Buffer.alloc(1000);
      for (let i = 0; i < randomBuffer.length; i++) {
        randomBuffer[i] = Math.floor(Math.random() * 256);
      }
      
      const testFile = path.join(__dirname, 'test-high-entropy.bin');
      fs.writeFileSync(testFile, randomBuffer);
      
      try {
        const result = await analyzeFile(testFile);
        
        expect(result.checked).toBe(true);
        expect(result.passed).toBe(false); // Alta entropía = SOSPECHOSO
        expect(result.entropy).toBeGreaterThan(7.5);
        expect(result.details).toContain('excede umbral');
        
        fs.unlinkSync(testFile);
      } catch (error) {
        fs.unlinkSync(testFile);
        throw error;
      }
    });

    it('should accept normal entropy in clean files (<=7.5)', async () => {
      // Archivo con patrones repetitivos (baja entropía)
      const pattern = Buffer.from('AAABBBCCCDDDEEEFFF'.repeat(50));
      const testFile = path.join(__dirname, 'test-low-entropy.bin');
      fs.writeFileSync(testFile, pattern);
      
      try {
        const result = await analyzeFile(testFile);
        
        expect(result.checked).toBe(true);
        expect(result.passed).toBe(true); // Baja entropía = SEGURO
        expect(result.entropy).toBeLessThanOrEqual(7.5);
        
        fs.unlinkSync(testFile);
      } catch (error) {
        fs.unlinkSync(testFile);
        throw error;
      }
    });

    it('should calculate entropy using Shannon formula', async () => {
      // Archivo de prueba con entropía conocida
      const testBuffer = Buffer.from([0, 0, 0, 0, 255, 255, 255, 255]); // 2 valores únicos
      const testFile = path.join(__dirname, 'test-shannon.bin');
      fs.writeFileSync(testFile, testBuffer);
      
      try {
        const result = await analyzeFile(testFile);
        
        // Entropía esperada: -0.5*log2(0.5) - 0.5*log2(0.5) = 1.0
        expect(result.entropy).toBeCloseTo(1.0, 1);
        expect(result.checked).toBe(true);
        
        fs.unlinkSync(testFile);
      } catch (error) {
        fs.unlinkSync(testFile);
        throw error;
      }
    });

    it('should handle empty files gracefully', async () => {
      const testFile = path.join(__dirname, 'test-empty.bin');
      fs.writeFileSync(testFile, Buffer.alloc(0));
      
      try {
        const result = await analyzeFile(testFile);
        
        expect(result.checked).toBe(true);
        expect(result.entropy).toBe(0);
        expect(result.passed).toBe(true);
        
        fs.unlinkSync(testFile);
      } catch (error) {
        fs.unlinkSync(testFile);
        throw error;
      }
    });

    it('should detect OpenCV/stegdetect patterns in metadata', async () => {
      // Simulamos archivo con metadata sospechosa
      const header = Buffer.from('JFIF\x00OpenCV-Steganography\x00');
      const body = Buffer.alloc(1000, 0xAA);
      const testFile = path.join(__dirname, 'test-metadata.jpg');
      fs.writeFileSync(testFile, Buffer.concat([header, body]));
      
      try {
        const result = await analyzeFile(testFile);
        
        expect(result.checked).toBe(true);
        // Debería detectar patrones sospechosos
        expect(result.passed).toBe(false);
        
        fs.unlinkSync(testFile);
      } catch (error) {
        fs.unlinkSync(testFile);
        throw error;
      }
    });

    it('should handle large files efficiently (Worker Thread)', async () => {
      // Archivo grande (5 MB)
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024, 0x42);
      const testFile = path.join(__dirname, 'test-large.bin');
      fs.writeFileSync(testFile, largeBuffer);
      
      try {
        const startTime = Date.now();
        const result = await analyzeFile(testFile);
        const duration = Date.now() - startTime;
        
        expect(result.checked).toBe(true);
        expect(duration).toBeLessThan(2000); // < 2 segundos
        
        fs.unlinkSync(testFile);
      } catch (error) {
        fs.unlinkSync(testFile);
        throw error;
      }
    }, 10000); // timeout 10s
  });

  describe('Entropy Threshold Configuration', () => {
    it('should use configurable threshold (7.5 default)', () => {
      const threshold = process.env.ENTROPY_THRESHOLD || '7.5';
      expect(parseFloat(threshold)).toBe(7.5);
    });

    it('should reject files exceeding custom threshold', async () => {
      const originalThreshold = process.env.ENTROPY_THRESHOLD;
      process.env.ENTROPY_THRESHOLD = '6.0'; // Umbral más estricto
      
      const randomBuffer = Buffer.alloc(500);
      for (let i = 0; i < randomBuffer.length; i++) {
        randomBuffer[i] = Math.floor(Math.random() * 128); // Entropía ~7.0
      }
      
      const testFile = path.join(__dirname, 'test-threshold.bin');
      fs.writeFileSync(testFile, randomBuffer);
      
      try {
        const result = await analyzeFile(testFile);
        
        // Con umbral 6.0, entropía ~7.0 debe ser rechazada
        expect(result.passed).toBe(false);
        
        fs.unlinkSync(testFile);
        process.env.ENTROPY_THRESHOLD = originalThreshold;
      } catch (error) {
        fs.unlinkSync(testFile);
        process.env.ENTROPY_THRESHOLD = originalThreshold;
        throw error;
      }
    });
  });
});
