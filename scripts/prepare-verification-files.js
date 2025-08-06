const fs = require('fs');
const path = require('path');

// Configuración
const CONTRACT_PATH = path.join(__dirname, '../contracts/AutoSwapLimit.sol');
const OUTPUT_DIR = path.join(__dirname, '../verification-files');

function prepareFiles() {
  try {
    console.log('Preparando archivos para verificación manual en HashScan...');
    
    // Crear directorio de salida si no existe
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Copiar el archivo del contrato principal
    const contractSource = fs.readFileSync(CONTRACT_PATH, 'utf8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'AutoSwapLimit.sol'), contractSource);
    console.log(`Archivo del contrato copiado correctamente a ${path.join(OUTPUT_DIR, 'AutoSwapLimit.sol')}`);
    
    // Buscar y copiar el archivo de metadatos si existe
    const buildInfoDir = path.join(__dirname, '../artifacts/build-info');
    if (fs.existsSync(buildInfoDir)) {
      const files = fs.readdirSync(buildInfoDir);
      if (files.length > 0) {
        const buildInfoPath = path.join(buildInfoDir, files[0]);
        console.log(`Copiando archivo de metadatos: ${buildInfoPath}`);
        const buildInfo = fs.readFileSync(buildInfoPath, 'utf8');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), buildInfo);
        console.log(`Archivo de metadatos copiado correctamente a ${path.join(OUTPUT_DIR, 'metadata.json')}`);
      } else {
        console.log('No se encontraron archivos de metadatos en artifacts/build-info');
      }
    } else {
      console.log('El directorio artifacts/build-info no existe');
    }
    
    console.log(`\nArchivos preparados en: ${OUTPUT_DIR}`);
    console.log('\nPara verificar el contrato en HashScan:');
    console.log('1. Ve a HashScan Testnet: https://hashscan.io/testnet');
    console.log('2. Busca el contrato: 0.0.6503848 (o EVM: 0x0000000000000000000000000000000000633da8)');
    console.log('3. Haz clic en "Verify" en la sección Contract Bytecode');
    console.log('4. Sube los archivos desde el directorio verification-files');
    console.log('5. Cuando te pregunte qué contrato verificar, selecciona "AutoSwapLimit" (importante)');
    console.log('6. Haz clic en "Verify" para iniciar la verificación');
  } catch (error) {
    console.error('Error preparando los archivos:');
    console.error(error);
  }
}

prepareFiles();