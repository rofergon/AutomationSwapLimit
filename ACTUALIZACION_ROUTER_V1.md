# Actualización AutoSwapLimit - Router V1 SaucerSwap

## 📋 Resumen de Cambios

Se ha actualizado el contrato `AutoSwapLimit.sol` para usar correctamente **SaucerSwapV1RouterV3 (0.0.19264)** según la ABI proporcionada y resolver problemas con las llamadas del contrato.

## 🔧 Cambios Principales Implementados

### 1. Interfaz ISaucerSwapRouter Actualizada
- ✅ Agregadas todas las funciones de la ABI oficial de SaucerSwapV1RouterV3
- ✅ Incluye funciones adicionales: `WHBAR()`, `whbar()`, `factory()`, etc.
- ✅ Soporte para funciones de liquidez y fee-on-transfer tokens
- ✅ Funciones de utilidad: `getAmountIn`, `getAmountOut`, `quote`, etc.

### 2. Manejo Correcto de Addresses
- ✅ WHBAR obtenido dinámicamente del router: `router.WHBAR()`
- ✅ Constructor simplificado: `constructor(address _saucerSwapRouter, address _backendExecutor)`
- ✅ Eliminado parámetro `_weth` del constructor (se obtiene del router)

### 3. Límite de Router V1 (180 HBAR)
- ✅ Constante `ROUTER_THRESHOLD = 18000000000` (180 HBAR en tinybars)
- ✅ Validación en `createSwapOrder()` para órdenes <= 180 HBAR
- ✅ Validación adicional en `executeSwapOrder()`
- ✅ Preparación para soporte futuro de Router V2 (>180 HBAR)

### 4. Nuevas Funciones de Diagnóstico
- ✅ `getRouterInfo()`: Información completa del router y configuración
- ✅ `canExecuteOrder(orderId)`: Validación si una orden puede ejecutarse
- ✅ `getRouterThresholdHBAR()`: Threshold en HBAR (180)
- ✅ `getContractConfig()`: Configuración expandida incluyendo threshold y WHBAR

### 5. Mejoras en Validación
- ✅ Función `_isWithinRouterV1Limits()`: Verificar límites del router
- ✅ Validaciones mejoradas en `_getOptimalPath()`
- ✅ Eventos para logging de threshold excedido

## 📦 Archivos Modificados

```
contracts/AutoSwapLimit.sol          ← Contrato principal actualizado
scripts/test-router-v1-integration.ts ← Nuevo script de validación
ACTUALIZACION_ROUTER_V1.md          ← Esta guía
```

## 🚀 Configuración de Deployment

### Constructor Actualizado
```solidity
constructor(
    address _saucerSwapRouter,  // 0x0000000000000000000000000000000000004b40 (0.0.19264)
    address _backendExecutor
)
```

### Direcciones para Hedera Testnet
```
Router V1:     0x0000000000000000000000000000000000004b40  (0.0.19264)
WHBAR:         Se obtiene dinámicamente del router
USDC:          0x0000000000000000000000000000000000001549  (0.0.5449) ✅ Verificado
USDT:          No disponible en SaucerSwap Testnet
```

## 🧪 Script de Validación

### Ejecutar Pruebas
```bash
# Test de integración del router (verificación completa)
npm run test:router-v1

# Test completo: crear orden + ejecutar swap
npm run test:complete-swap

# O usando npx directamente
npx ts-node scripts/test-router-v1-integration.ts
npx ts-node scripts/test-complete-swap-flow.ts
```

### Qué Verifica test:router-v1
- ✅ Router V1 configurado correctamente
- ✅ WHBAR address obtenida del router
- ✅ Threshold de 180 HBAR funcionando
- ✅ Estimaciones con diferentes montos
- ✅ Nuevas funciones de diagnóstico
- ✅ Validación de órdenes existentes

### Qué Hace test:complete-swap
- ✅ Verificación completa del router y configuración
- ✅ Crea una orden real de 1 HBAR → USDC
- ✅ Verifica que la orden puede ejecutarse
- ✅ Ejecuta el swap automáticamente
- ✅ Valida el resultado final
- ✅ Diagnóstico completo en caso de errores

## 🔍 Funciones de Debugging Nuevas

### `getRouterInfo()`
```solidity
function getRouterInfo() external view returns (
    address routerAddress,
    address whbarFromRouter,
    address factoryAddress,
    uint256 thresholdTinybars,
    uint256 thresholdHBAR
)
```

### `canExecuteOrder(uint256 orderId)`
```solidity
function canExecuteOrder(uint256 orderId) external view returns (
    bool canExecute, 
    string memory reason
)
```

### `getContractConfig()` Expandida
```solidity
function getContractConfig() external view returns (
    uint256 currentExecutionFee,
    uint256 minOrderAmount,
    address currentBackendExecutor,
    uint256 currentNextOrderId,
    uint256 routerThreshold,      // ← Nuevo
    address whbarAddress          // ← Nuevo
)
```

### `getAvailableTokens()` - Nuevo
```solidity
function getAvailableTokens() external pure returns (
    address usdcAddress,
    string memory usdcInfo
)
```

### `getOptimalPathPreview()` - Nuevo
```solidity
function getOptimalPathPreview(address tokenOut) external view returns (
    address[] memory path,
    string memory pathInfo
)
```

## ⚠️ Limitaciones Actuales y Solución

### ❌ Problema Detectado: Router V1 Sin Liquidez en Testnet
- ❌ **Router V1 (0.0.19264)**: NO tiene pools funcionales en testnet
- ❌ **Pools WHBAR/USDC y WHBAR/SAUCE**: No existen en Router V1 testnet
- ❌ **Todas las estimaciones fallan**: CONTRACT_REVERT_EXECUTED

### ✅ Solución: Migrar a Router V2
- ✅ **Router V2 (0.0.1414040)**: SÍ está accesible y tiene pools
- ✅ **Más liquidez disponible**: Lanzado en noviembre 2023
- ✅ **Sin límites de 180 HBAR**: Puede manejar cualquier cantidad

### 🔄 Migración Necesaria
```bash
# Actualizar .env para usar Router V2
SAUCERSWAP_TESTNET_ROUTER_ID=0.0.1414040
SAUCERSWAP_TESTNET_ROUTER_EVM=0x0000000000000000000000000000000000159398

# Re-desplegar contrato con Router V2
npm run deploy:nativo
```

## 🔄 Plan de Migración

### 1. Re-deploy del Contrato
```typescript
// Usar constructor actualizado
const autoSwapLimit = await deployContract({
    routerAddress: "0x0000000000000000000000000000000000004b40", // Router V1
    backendExecutor: process.env.BACKEND_EXECUTOR_ADDRESS
});
```

### 2. Validar Configuración
```bash
npx ts-node scripts/test-router-v1-integration.ts
```

### 3. Actualizar Frontend/Backend
- ✅ Verificar límite de 180 HBAR antes de crear órdenes
- ✅ Usar `canExecuteOrder()` antes de ejecutar
- ✅ Mostrar threshold usando `getRouterThresholdHBAR()`

## 📊 Comparación de Routers

| Router | Address | Límite | Uso Actual |
|--------|---------|--------|------------|
| **SaucerSwapV1RouterV3** | 0.0.19264 | ≤ 180 HBAR | ✅ **Implementado** |
| SaucerSwapV2SwapRouter | 0.0.1414040 | > 180 HBAR | 🔄 Futuro |

## 🐛 Problemas Resueltos

1. ✅ **Direcciones WHBAR incorrectas**: Ahora se obtienen dinámicamente del router
2. ✅ **Interface incompleta**: Agregadas todas las funciones de la ABI oficial  
3. ✅ **Sin validación de límites**: Implementado threshold de 180 HBAR
4. ✅ **Falta de debugging**: Agregadas múltiples funciones de diagnóstico
5. ✅ **Direcciones de tokens incorrectas**: USDC actualizado a dirección correcta (0.0.5449)
6. ✅ **USDT no disponible**: Eliminado USDT ya que no existe en SaucerSwap testnet

## 🪙 Tokens Disponibles Actualizados

### USDC - Dirección Corregida
- **Dirección anterior**: `0x000000000000000000000000000000000001E7Be` ❌
- **Dirección correcta**: `0x0000000000000000000000000000000000001549` ✅ (0.0.5449)
- **Path**: Directo WHBAR → USDC (más eficiente)

### USDT - Eliminado
- **Estado**: No disponible en SaucerSwap testnet ❌
- **Alternativa**: Usar USDC como stablecoin principal ✅

### Nuevas Funciones de Token Info
```typescript
// Obtener tokens disponibles
const [usdcAddr, usdcInfo] = await contract.getAvailableTokens();
console.log(`USDC: ${usdcAddr} - ${usdcInfo}`);

// Ver path de swap para cualquier token
const [path, pathInfo] = await contract.getOptimalPathPreview(tokenAddress);
console.log(`Path: ${path} - ${pathInfo}`);
```

## 📞 Contacto y Soporte

Para dudas sobre la implementación o problemas con el router, verificar:
1. 🧪 Ejecutar `scripts/test-router-v1-integration.ts`
2. 🔍 Revisar logs de `getRouterInfo()`
3. 📋 Usar `canExecuteOrder()` para debugging de órdenes específicas

---

**Actualización completada** ✅  
*Fecha: ${new Date().toISOString().split('T')[0]}*