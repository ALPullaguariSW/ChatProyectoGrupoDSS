const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const sharp = require('sharp');

/**
 * Calcular entropía de Shannon para detectar datos ocultos
 * Entropía alta (> 7.5) puede indicar datos comprimidos o encriptados
 */
function calculateEntropy(buffer) {
  const frequencyMap = new Map();
  
  // Contar frecuencias
  for (const byte of buffer) {
    frequencyMap.set(byte, (frequencyMap.get(byte) || 0) + 1);
  }
  
  // Calcular entropía
  let entropy = 0;
  const length = buffer.length;
  
  for (const count of frequencyMap.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Analizar metadatos EXIF de imágenes
 */
async function analyzeImageMetadata(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    
    // Detectar anomalías en metadatos
    const suspiciousFields = [];
    
    if (metadata.exif && Buffer.from(metadata.exif).length > 10000) {
      suspiciousFields.push('EXIF excesivamente grande');
    }
    
    if (metadata.icc && Buffer.from(metadata.icc).length > 5000) {
      suspiciousFields.push('ICC profile sospechoso');
    }
    
    return {
      hasSuspiciousMetadata: suspiciousFields.length > 0,
      details: suspiciousFields.join(', '),
    };
  } catch (error) {
    return {
      hasSuspiciousMetadata: false,
      details: 'No se pudo analizar metadata',
    };
  }
}

/**
 * Análisis principal de esteganografía
 */
async function analyze() {
  const { filePath, entropyThreshold } = workerData;
  
  try {
    // Leer archivo
    const fileBuffer = fs.readFileSync(filePath);
    
    // Calcular entropía
    const entropy = calculateEntropy(fileBuffer);
    
    let details = `Entropía: ${entropy.toFixed(2)}`;
    let isPassed = entropy < entropyThreshold;
    
    // Para imágenes, análisis adicional
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(filePath);
    
    if (isImage) {
      try {
        const metadataAnalysis = await analyzeImageMetadata(filePath);
        
        if (metadataAnalysis.hasSuspiciousMetadata) {
          details += ` | Metadata sospechosa: ${metadataAnalysis.details}`;
          isPassed = false;
        }
        
        // Análisis de LSB (Least Significant Bit)
        const image = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
        const pixels = image.data;
        
        // Contar variaciones en bits menos significativos
        let lsbVariations = 0;
        for (let i = 0; i < pixels.length - 1; i++) {
          const lsb1 = pixels[i] & 1;
          const lsb2 = pixels[i + 1] & 1;
          if (lsb1 !== lsb2) lsbVariations++;
        }
        
        const lsbRatio = lsbVariations / pixels.length;
        
        // Ratio muy alto puede indicar esteganografía LSB
        if (lsbRatio > 0.55) {
          details += ` | LSB ratio sospechoso: ${(lsbRatio * 100).toFixed(2)}%`;
          isPassed = false;
        }
      } catch (error) {
        details += ` | Error en análisis de imagen: ${error.message}`;
      }
    }
    
    // Detectar patrones de archivos conocidos (ZIP, RAR ocultos)
    const signatures = {
      zip: [0x50, 0x4B, 0x03, 0x04],
      rar: [0x52, 0x61, 0x72, 0x21],
      pdf: [0x25, 0x50, 0x44, 0x46],
    };
    
    for (const [type, signature] of Object.entries(signatures)) {
      // Buscar firma en el medio del archivo (no al inicio)
      for (let i = 1000; i < fileBuffer.length - signature.length; i += 1000) {
        let match = true;
        for (let j = 0; j < signature.length; j++) {
          if (fileBuffer[i + j] !== signature[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          details += ` | Archivo ${type.toUpperCase()} oculto detectado`;
          isPassed = false;
          break;
        }
      }
    }
    
    const result = {
      isPassed,
      entropy,
      details: isPassed ? 'Archivo verificado, sin anomalías detectadas' : details,
    };
    
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      isPassed: false,
      entropy: 0,
      details: `Error en análisis: ${error.message}`,
    });
  }
}

analyze();
