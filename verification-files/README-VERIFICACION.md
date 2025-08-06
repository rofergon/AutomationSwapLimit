# Guía de Verificación del Contrato AutoSwapLimit

## 📄 Información del Contrato

- **Nombre del Contrato**: AutoSwapLimit
- **ID de Hedera**: 0.0.6503848
- **Dirección EVM**: 0x0000000000000000000000000000000000633da8
- **Red**: Hedera Testnet
- **Compilador**: Solidity 0.8.24
- **Optimización**: Habilitada

## 🔧 Parámetros del Constructor

El contrato fue desplegado con los siguientes parámetros del constructor:

1. **_saucerSwapRouter**: `0x0000000000000000000000000000000000004b40`
   - Router SaucerSwap V1 (0.0.19264)
   
2. **_backendExecutor**: `0x0000000000000000000000000000000000597d8e`
   - Cuenta backend executor (0.0.5864846)

## 📋 Pasos para Verificar en HashScan

1. **Ir a HashScan Testnet**: https://hashscan.io/testnet/contract/0.0.6503848

2. **Hacer clic en "Verify" en la sección Contract Bytecode**

3. **Configurar la verificación**:
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: 0.8.24 (o la versión más cercana)
   - **Optimization**: Enabled (200 runs)

4. **Subir archivos**:
   - Subir `AutoSwapLimit.sol` como archivo principal
   - O usar `metadata.json` si está disponible la opción

5. **Parámetros del Constructor** (en formato ABI-encoded):
   ```
   Constructor Argument 1 (address): 0x0000000000000000000000000000000000004b40
   Constructor Argument 2 (address): 0x0000000000000000000000000000000000597d8e
   ```

6. **Seleccionar contrato**: Cuando pregunte qué contrato verificar, seleccionar **"AutoSwapLimit"**

7. **Hacer clic en "Verify"**

## 🔗 Enlaces Importantes

- **Contrato en HashScan**: https://hashscan.io/testnet/contract/0.0.6503848
- **Router SaucerSwap V1**: https://hashscan.io/testnet/contract/0.0.19264
- **TestToken desplegado**: https://hashscan.io/testnet/contract/0.0.6503845

## 📝 Dependencias

El contrato usa las siguientes dependencias de OpenZeppelin:
- `@openzeppelin/contracts/token/ERC20/IERC20.sol`
- `@openzeppelin/contracts/access/Ownable.sol`
- `@openzeppelin/contracts/utils/ReentrancyGuard.sol`

## ⚠️ Notas Importantes

- Asegúrate de seleccionar **"AutoSwapLimit"** como el contrato a verificar
- El contrato principal es AutoSwapLimit, no las interfaces
- Los archivos de verificación están en el directorio `verification-files/`
- El bytecode fue generado usando el SDK nativo de Hedera para garantizar visibilidad en HashScan