# AutoSwapLimit - Sistema de Órdenes Límite para SaucerSwap en Hedera

## 🎯 Descripción

AutoSwapLimit es un contrato inteligente que permite a los usuarios crear órdenes límite automáticas para intercambiar HBAR por tokens en SaucerSwap. El contrato integra directamente con el router de SaucerSwap en Hedera Testnet y es ejecutado por un backend que monitorea los precios mediante oráculos.

## ✨ Características Principales

- **✅ Órdenes Límite de HBAR a Tokens**: Los usuarios depositan HBAR y crean órdenes que se ejecutan cuando se alcanza un precio objetivo
- **🤖 Ejecución Automática**: Un backend monitorea los precios y ejecuta las órdenes cuando se cumplen las condiciones
- **🔗 Integración Real con SaucerSwap**: Usa el router oficial de SaucerSwap (no simulación)
- **💰 Sistema de Fees**: Fee de ejecución que se paga al backend por procesar las órdenes
- **🛡️ Seguridad**: Protección contra re-entrancy y validaciones estrictas
- **📊 Cotizaciones en Tiempo Real**: Consulta precios estimados directamente de SaucerSwap

## 🏗️ Arquitectura del Sistema

```
Usuario → AutoSwapLimit Contract → SaucerSwap Router → Usuario recibe tokens
                ↑
        Backend + Oráculo de Precios
```

1. **Usuario**: Deposita HBAR y crea orden límite
2. **Backend**: Monitorea precios con oráculos externos 
3. **Contrato**: Ejecuta swap automático cuando se alcanza el precio trigger
4. **SaucerSwap**: Procesa el intercambio real
5. **Usuario**: Recibe los tokens directamente en su wallet

## 📋 Funciones Principales

### Para Usuarios

#### `createSwapOrder()`
Crea una nueva orden límite de HBAR a token:
```solidity
function createSwapOrder(
    address tokenOut,        // Token a recibir (ej: SAUCE)
    uint256 minAmountOut,    // Cantidad mínima de tokens a recibir
    uint256 triggerPrice,    // Precio que activa el swap (en HBAR)
    uint256 expirationTime   // Tiempo de expiración
) external payable
```

**Ejemplo de uso:**
- Deposito: 10 HBAR + 0.01 HBAR (fee)
- Quiero: Mínimo 500 SAUCE tokens
- Trigger: Cuando SAUCE valga 0.02 HBAR o menos
- Expira: En 24 horas

#### `cancelSwapOrder()`
Cancela una orden activa y devuelve los HBAR + fee:
```solidity
function cancelSwapOrder(uint256 orderId) external
```

#### `getEstimatedAmountOut()`
Consulta cuántos tokens recibirías por una cantidad de HBAR:
```solidity
function getEstimatedAmountOut(address tokenOut, uint256 amountIn) 
    external view returns (uint256)
```

#### `getUserOrders()`
Obtiene todas las órdenes de un usuario:
```solidity
function getUserOrders(address user) external view returns (uint256[] memory)
```

### Para el Backend

#### `executeSwapOrder()`
Ejecuta una orden cuando se cumple el precio trigger (solo backend):
```solidity
function executeSwapOrder(uint256 orderId, uint256 currentPrice) external
```

### Para el Owner

#### `updateBackendExecutor()`
Actualiza la dirección del backend autorizado:
```solidity
function updateBackendExecutor(address newBackendExecutor) external onlyOwner
```

## 🚀 Deploy del Contrato

### Prerrequisitos

1. Node.js y npm instalados
2. Hardhat configurado
3. Variables de entorno configuradas en `.env`:

```bash
HEDERA_ACCOUNT_ID=0.0.tu_account_id
PRIVATE_KEY=0x_tu_private_key

# Direcciones del Testnet (ya configuradas)
SAUCERSWAP_TESTNET_ROUTER_ID=0.0.19264
SAUCERSWAP_TESTNET_ROUTER_EVM=0x0000000000000000000000000000000000004b40
WHBAR_TESTNET_TOKEN_ID=0.0.15058
```

### Pasos de Deploy

1. **Compilar el contrato:**
```bash
npx hardhat compile
```

2. **Deployar en testnet:**
```bash
npx hardhat run scripts/deploy-hedera.ts --network hederaTestnet
```

El script automáticamente:
- Usa las direcciones correctas del router de SaucerSwap testnet
- Configura WHBAR como token base
- Establece tu cuenta como backend executor inicial
- Guarda las direcciones deployadas en `deployed-contracts-hederaTestnet.json`

## 🧪 Pruebas e Interacción

### Ejecutar pruebas:
```bash
npx hardhat test
```

### Interactuar con el contrato deployado:
```bash
npx hardhat run scripts/interact-hedera.ts --network hederaTestnet
```

Este script:
- Muestra información del contrato
- Consulta cotizaciones de ejemplo
- Crea una orden límite de prueba
- Lista todas las órdenes del usuario

## 💡 Ejemplo de Uso Completo

### 1. Crear Orden Límite
```typescript
// Usuario quiere cambiar 10 HBAR por SAUCE cuando SAUCE valga ≤ 0.02 HBAR
const createOrderTx = await autoSwapLimit.createSwapOrder(
  "0x0000000000000000000000000000000000120f46", // SAUCE token testnet
  ethers.parseUnits("500", 18),    // Mínimo 500 SAUCE
  ethers.parseEther("0.02"),       // Trigger: 0.02 HBAR por SAUCE
  Math.floor(Date.now()/1000) + 86400, // Expira en 24h
  { value: ethers.parseEther("10.01") } // 10 HBAR + 0.01 fee
);
```

### 2. Backend Ejecuta Orden
```typescript
// El backend detecta que SAUCE ahora vale 0.019 HBAR
await autoSwapLimit.executeSwapOrder(
  1, // orderId
  ethers.parseEther("0.019") // precio actual
);
```

### 3. Usuario Recibe Tokens
El usuario automáticamente recibe los tokens SAUCE en su wallet.

## 🔧 Configuración del Backend

Para configurar el backend que ejecuta las órdenes:

1. **Monitoreo de Precios**: Implementar oráculo que consulte precios de SaucerSwap
2. **Base de Datos**: Trackear órdenes activas y sus precios trigger
3. **Ejecución**: Llamar `executeSwapOrder()` cuando se cumplan las condiciones
4. **Gas Management**: Asegurar suficiente HBAR para las transacciones

## 📊 Direcciones del Testnet

- **SaucerSwap Router**: `0.0.19264` (`0x0000000000000000000000000000000000004b40`)
- **WHBAR Token**: `0.0.15058`
- **SAUCE Token**: `0.0.1183558` (`0x0000000000000000000000000000000000120f46`)

## 🔒 Seguridad

- ✅ Protección contra re-entrancy
- ✅ Validación de parámetros de entrada
- ✅ Solo el backend puede ejecutar órdenes
- ✅ Solo el propietario puede cancelar sus órdenes
- ✅ Timeouts automáticos para órdenes expiradas
- ✅ Validación de precios mínimos (slippage protection)

## 🎯 Casos de Uso

1. **DCA (Dollar Cost Averaging)**: Comprar tokens gradualmente a precios específicos
2. **Trading de Límites**: Ejecutar compras cuando los precios caen a niveles objetivo
3. **Arbitraje Automatizado**: Aprovechar diferencias de precio entre exchanges
4. **Gestión de Riesgo**: Comprar tokens solo cuando alcanzan precios favorables

## 🛠️ Próximas Mejoras

- [ ] Soporte para más pares de trading (token-to-token)
- [ ] Órdenes de venta (token-to-HBAR)
- [ ] Stop-loss automático
- [ ] Interfaz web para crear/gestionar órdenes
- [ ] API REST para el backend
- [ ] Notificaciones cuando se ejecutan órdenes

---

¿Necesitas ayuda? Consulta la documentación de [Hedera](https://docs.hedera.com/) y [SaucerSwap](https://www.saucerswap.finance/).