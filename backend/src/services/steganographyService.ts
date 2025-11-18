import { Worker } from 'worker_threads';
import path from 'path';
import logger from '../utils/logger';

export interface SteganographyResult {
  isPassed: boolean;
  entropy: number;
  details: string;
}

/**
 * Analizar archivo con worker thread para detectar esteganografía
 */
export const analyzeFile = (filePath: string, entropyThreshold: number): Promise<SteganographyResult> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/steganographyWorker.js'), {
      workerData: { filePath, entropyThreshold },
    });

    worker.on('message', (result: SteganographyResult) => {
      logger.info(`Análisis de esteganografía completado: ${filePath}`, { result });
      resolve(result);
    });

    worker.on('error', (error) => {
      logger.error(`Error en worker de esteganografía: ${error.message}`);
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker detenido con código ${code}`));
      }
    });
  });
};
