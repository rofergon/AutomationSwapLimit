# 🧪 Test Completo de Swap Flow

## Descripción

Este script ejecuta un test completo del flujo de swap en AutoSwapLimit con Router V1 de SaucerSwap:

1. ✅ **Verificación completa del sistema**
2. ✅ **Creación de orden real**
3. ✅ **Ejecución automática del swap**
4. ✅ **Validación del resultado**

## 🚀 Ejecución Rápida

```bash
# Comando principal
npm run test:complete-swap

# O directamente
npx hardhat run scripts/test-complete-swap-flow.ts --network hederaTestnet
```

## 📋 Requisitos Previos

### 1. Variables de Entorno (.env)
```env
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
PRIVATE_KEY=YOUR_PRIVATE_KEY_ECDSA
AUTOSWAP_CONTRACT_ID=0.0.YOUR_CONTRACT_ID  # Opcional
TESTNET_SAUCE_ADDRESS=0x0000000000000000000000000000000000120f46  # Opcional
```

### 2. HBAR Balance
- Mínimo **2 HBAR** en tu cuenta
- 1 HBAR para el swap + fees + gas

### 3. Contrato Desplegado
- Contrato AutoSwapLimit con Router V1 configurado
- Router: `0x0000000000000000000000000000000000004b40` (0.0.19264)

## 🔍 Qué Hace el Test

### Fase 1: Verificación del Sistema
```
🔧 1. Verificando configuración del router V1...
💵 2. Verificando tokens disponibles...
🛣️  3. Verificando paths de swap...
🔓 4. Verificando configuración de ejecución...
⚙️  5. Obteniendo configuración del contrato...
```

### Fase 2: Estimaciones Pre-Swap
```
💡 6. Probando estimaciones de swap...
🧪 Probando con 50 HBAR...
💵 USDC estimado: XXX wei
🎯 SAUCE estimado: XXX wei
```

### Fase 3: Creación y Ejecución
```
🚀 7. Creando orden de swap HBAR → USDC...
🔍 8. Verificando si la orden puede ejecutarse...
🚀 9. Ejecutando swap de la orden...
📊 10. Verificando estado final...
```

## 🎯 Orden Creada

- **Token**: USDC (0x0000000000000000000000000000000000001549)
- **Cantidad**: 1 HBAR + execution fee
- **Path**: WHBAR → USDC (directo)
- **Trigger**: Precio muy bajo (se activa inmediatamente)
- **Expiración**: 1 hora

## ✅ Resultado Exitoso

```
🎉 ¡ÉXITO COMPLETO!
✅ La orden se creó correctamente
✅ El swap se ejecutó exitosamente
✅ Router V1 funcionando perfectamente
✅ USDC como token objetivo funcionando
```

## ❌ Posibles Errores

### Error: CONTRACT_REVERT_EXECUTED
```
🔍 Diagnóstico CONTRACT_REVERT_EXECUTED:
   💡 La orden se creó correctamente
   ❌ Pero el swap en SaucerSwap falló
   🔍 Posibles causas:
     - Pool WHBAR/USDC sin liquidez
     - Slippage muy alto
     - MinAmountOut muy alto
     - Router no puede procesar el swap
```

**Solución**: 
- Verificar que el pool WHBAR/USDC tiene liquidez en SaucerSwap
- Reducir `minAmountOut` en el script
- Verificar que el router V1 está funcionando

### Error: Order exceeds router V1 limit
```
❌ Order amount too large: exceeds 180 HBAR limit for router V1
```

**Solución**: El script usa 1 HBAR (dentro del límite), pero verificar que `ROUTER_THRESHOLD` esté configurado correctamente.

### Error: Insufficient HBAR
```
❌ Insufficient HBAR: must exceed execution fee
```

**Solución**: Asegurar que tu cuenta tiene al menos 2 HBAR.

## 🔧 Personalización

### Cambiar Monto del Swap
```typescript
// En test-complete-swap-flow.ts línea ~234
const orderHbarAmount = 1.0; // Cambiar aquí (máximo 180 HBAR)
```

### Cambiar Token Objetivo
```typescript
// En test-complete-swap-flow.ts línea ~20
const usdcAddress = "0x0000000000000000000000000000000000001549"; // USDC
const sauceAddress = "0x0000000000000000000000000000000000120f46"; // SAUCE

// Cambiar en línea ~248
.addAddress(usdcAddress) // Cambiar por sauceAddress para SAUCE
```

### Cambiar MinAmountOut
```typescript
// En test-complete-swap-flow.ts línea ~236
const minAmountOut = "100000"; // Cambiar aquí (formato wei)
```

## 📊 Output Esperado

El script mostrará información detallada incluyendo:

- ✅ **Transaction IDs** de HashScan
- ✅ **Estado del router** y configuración
- ✅ **Estimaciones** de swap
- ✅ **Estado de la orden** antes y después
- ✅ **Resultado final** del swap

## 🔗 Enlaces Útiles

- [SaucerSwap Testnet](https://app.saucerswap.finance/)
- [HashScan Testnet](https://hashscan.io/testnet/)
- [Router V1 Contract](https://hashscan.io/testnet/contract/0.0.19264)

---

**💡 Tip**: Si el test falla, revisa primero que el pool WHBAR/USDC tenga liquidez en SaucerSwap testnet.