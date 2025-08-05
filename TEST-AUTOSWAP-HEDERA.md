# Test y Interacción con AutoSwapLimit en Hedera

Este documento describe cómo usar los tests y scripts para interactuar con el contrato **AutoSwapLimit** desplegado en Hedera Testnet usando el SDK nativo de Hedera.

## 📋 Contratos Desplegados

Según el archivo `deployed-contracts-nativo.json`:

- **TestToken**: `0.0.6503116` (EVM: `0x0000000000000000000000000000000000633acc`)
- **AutoSwapLimit**: `0.0.6503121` (EVM: `0x0000000000000000000000000000000000633ad1`)

## 🧪 Test Completo

### Ejecutar Test de Integración

```bash
npm run test:hedera
```

Este test realiza las siguientes operaciones:

1. **Configuración del Cliente**: Conecta con Hedera Testnet usando el SDK nativo
2. **Creación de Orden**: Crea una orden limit con parámetros específicos
3. **Verificación**: Confirma que la orden se creó correctamente
4. **Consultas**: Obtiene detalles de la orden y órdenes del usuario
5. **Estimación**: Intenta obtener precios estimados de SaucerSwap
6. **Limpieza**: Cancela la orden creada para limpiar el estado

### Funcionalidades Testadas

- ✅ `createSwapOrder()` - Crear orden limit
- ✅ `getOrderDetails()` - Obtener detalles de orden
- ✅ `getUserOrders()` - Listar órdenes del usuario
- ✅ `getEstimatedAmountOut()` - Estimación de precios
- ✅ `cancelSwapOrder()` - Cancelar orden
- ✅ `getContractBalance()` - Balance del contrato
- ✅ `executionFee` - Verificar fee de ejecución

## 🎯 Script de Creación de Orden

### Crear Orden Limit Simple

```bash
npm run create-order
```

Este script demuestra cómo crear una orden limit real con los siguientes parámetros:

- **Token de salida**: TestToken desplegado
- **Cantidad mínima**: 1 TestToken (1e18 wei)
- **Precio trigger**: 0.01 HBAR por token (1e16 wei)
- **Expiración**: 2 horas desde la ejecución
- **HBAR enviado**: 0.1 HBAR (incluye execution fee)

### Flujo del Script

1. 📡 Conecta con Hedera Testnet
2. 📋 Carga direcciones de contratos desplegados
3. 🔧 Configura parámetros de la orden
4. 📝 Obtiene el próximo Order ID
5. 🚀 Ejecuta `createSwapOrder()`
6. ✅ Verifica la transacción
7. 🔍 Consulta detalles de la orden creada
8. 👤 Lista todas las órdenes del usuario

## 📊 Estructura de una Orden Limit

```solidity
struct SwapOrder {
    address tokenOut;       // Token a recibir
    uint256 amountIn;       // HBAR depositado (menos execution fee)
    uint256 minAmountOut;   // Mínimo tokens a recibir
    uint256 triggerPrice;   // Precio que activa el swap
    address owner;          // Propietario de la orden
    bool isActive;          // Si la orden está activa
    uint256 expirationTime; // Tiempo de expiración
    bool isExecuted;        // Si fue ejecutada
}
```

## 🔧 Configuración Requerida

### Variables de Entorno (.env)

```env
HEDERA_ACCOUNT_ID=0.0.tu_account_id
PRIVATE_KEY=tu_private_key_ecdsa
```

### Dependencias

El proyecto usa las siguientes dependencias principales:

- `@hashgraph/sdk`: SDK nativo de Hedera
- `hardhat`: Framework de desarrollo
- `ethers`: Para manipulación de tipos
- `@openzeppelin/contracts`: Contratos estándar

## 💡 Ejemplos de Uso

### 1. Crear Orden Limit Básica

```typescript
import { ContractExecuteTransaction, ContractFunctionParameters, Hbar } from "@hashgraph/sdk";

const createOrderTx = new ContractExecuteTransaction()
  .setContractId("0.0.6503121")
  .setGas(2000000)
  .setPayableAmount(Hbar.fromTinybars(110000000)) // 1.1 HBAR
  .setFunction("createSwapOrder",
    new ContractFunctionParameters()
      .addAddress("0x0000000000000000000000000000000000633acc") // TestToken
      .addUint256("1000000000000000000")  // 1 token
      .addUint256("100000000000000000")   // 0.1 HBAR trigger
      .addUint256(Math.floor(Date.now() / 1000) + 3600) // 1 hora
  );
```

### 2. Consultar Detalles de Orden

```typescript
import { ContractCallQuery, ContractFunctionParameters } from "@hashgraph/sdk";

const orderDetailsQuery = new ContractCallQuery()
  .setContractId("0.0.6503121")
  .setGas(200000)
  .setFunction("getOrderDetails",
    new ContractFunctionParameters().addUint256(orderId)
  );

const result = await orderDetailsQuery.execute(client);
const isActive = result.getBool(5);
```

### 3. Cancelar Orden

```typescript
const cancelOrderTx = new ContractExecuteTransaction()
  .setContractId("0.0.6503121")
  .setGas(1000000)
  .setFunction("cancelSwapOrder",
    new ContractFunctionParameters().addUint256(orderId)
  );
```

## 🚀 Ejecución de Órdenes

Las órdenes creadas serán ejecutadas automáticamente por el backend cuando:

1. **Precio Trigger**: El precio del token alcance o supere el `triggerPrice`
2. **Liquidez Disponible**: Haya suficiente liquidez en SaucerSwap
3. **Antes de Expiración**: La orden no haya expirado
4. **Gas Disponible**: El backend tenga suficiente gas para la ejecución

## 📱 Monitoreo

### HashScan Links

- **Contrato AutoSwapLimit**: https://hashscan.io/testnet/contract/0.0.6503121
- **TestToken**: https://hashscan.io/testnet/contract/0.0.6503116

### Verificar Transacciones

Cada script muestra el Transaction ID que puedes buscar en HashScan:
```
https://hashscan.io/testnet/transaction/{TRANSACTION_ID}
```

## ⚠️ Consideraciones

1. **Testnet**: Estos ejemplos están configurados para Hedera Testnet
2. **SaucerSwap**: La liquidez en testnet puede ser limitada
3. **Fees**: Cada orden requiere un execution fee (configurado en el contrato)
4. **Expiración**: Las órdenes expiran automáticamente según el tiempo configurado
5. **Gas**: Las transacciones requieren gas suficiente para la ejecución

## 🔍 Troubleshooting

### Error "CONTRACT_REVERT_EXECUTED"
- **Causa común**: Parámetros incorrectos o insuficiente HBAR
- **Solución**: Usar valores más conservadores (ej: 0.1 HBAR en lugar de 1 HBAR)
- **Gas**: Asegurar suficiente gas (mínimo 3,000,000 para createSwapOrder)

### Error "getUint256Array is not a function"
- **Causa**: Método incorrecto para leer arrays en SDK de Hedera
- **Solución**: Usar métodos específicos del SDK o evitar arrays dinámicos en queries simples
- **Workaround**: Acceder a elementos individuales en lugar del array completo

### Error "Insufficient HBAR"
- Asegúrate de enviar más HBAR que el `executionFee`
- Verifica el balance de tu cuenta
- El execution fee actual es ~0.01 HBAR

### Error "Invalid output token"
- Confirma que la dirección del token es válida
- Usa direcciones EVM correctas (formato 0x...)
- Convierte Account ID a dirección EVM usando `AccountId.toSolidityAddress()`

### Error "Price does not reach trigger"
- Solo el backend puede ejecutar órdenes
- El precio actual debe superar el trigger price

### Error de Gas
- Aumenta el límite de gas en las transacciones
- Para `createSwapOrder`: usa al menos 3,000,000 gas
- Para `executeSwapOrder`: usa al menos 3,000,000 gas
- Para queries simples: 100,000-200,000 gas es suficiente

### Problemas de Liquidez en Testnet
- SaucerSwap en testnet puede tener liquidez limitada
- Las estimaciones de precio pueden fallar
- Usar precios trigger más bajos (ej: 0.01 HBAR en lugar de 0.1 HBAR)