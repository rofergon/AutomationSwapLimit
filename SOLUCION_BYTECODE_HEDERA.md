# Solución: Bytecode No Visible en HashScan - Hedera

## 🔍 Problema Identificado

Tu contrato se **desplegó exitosamente** en Hedera testnet, pero el bytecode no aparece en HashScan porque **el contrato no ha sido verificado**.

### ¿Por qué sucede esto?
En Hedera, cuando usas ethers.js para desplegar contratos (como hiciste), el bytecode se almacena en la red pero no es visible en HashScan hasta que el contrato se verifica usando **Sourcify**, el sistema de verificación integrado.

## 📍 Tus Contratos Desplegados

- **TestToken**: `0x7142A4b3f71834775C760366173f1B69f8eaFe88`
- **AutoSwapLimit**: `0xaaa51B3C7b17F10A7fF720E085509079794B1334`

## 🚀 Soluciones

### Opción A: Verificación Automática (Recomendada)

Ejecuta el script de verificación que he creado:

```bash
npm run verify:auto
```

Este comando:
1. Lee las direcciones de tus contratos desplegados
2. Utiliza Hardhat para verificar automáticamente en HashScan
3. Usa la configuración ya establecida en tu `hardhat.config.ts`

### Opción B: Verificación Manual en HashScan

Si la verificación automática falla, puedes hacerlo manualmente:

#### Paso 1: Ir a HashScan
- Abre https://hashscan.io/testnet
- Busca la dirección de tu contrato

#### Paso 2: Iniciar Verificación
- En la página del contrato, busca "Contract Bytecode"
- Haz clic en "Verify"

#### Paso 3: Subir Archivos
Para contratos de **Hardhat**, necesitas **solo el archivo JSON de build-info**:

Archivos disponibles en tu proyecto:
- `artifacts/build-info/ff7b5ebbf4726be35534ca1cf6a97797.json`
- `artifacts/build-info/bfdcd5f48dcc5198c30f86ab20576dce.json`
- `artifacts/build-info/b7d92ed19eaba68f2738cbf6c6603192.json`

**Usa el archivo más grande/reciente** (probablemente el de 1.8MB).

## ✅ Verificación de Éxito

Una vez verificado correctamente, en HashScan podrás ver:
- ✅ Código fuente completo
- ✅ Bytecode desplegado
- ✅ ABI del contrato
- ✅ Funciones y variables
- ✅ Constructor parameters

## 🔗 Enlaces Directos

- [TestToken en HashScan](https://hashscan.io/testnet/contract/0x7142A4b3f71834775C760366173f1B69f8eaFe88)
- [AutoSwapLimit en HashScan](https://hashscan.io/testnet/contract/0xaaa51B3C7b17F10A7fF720E085509079794B1334)

## 📚 Documentación de Referencia

- [Hedera: How to Verify a Smart Contract on HashScan](https://docs.hedera.com/hedera/tutorials/smart-contracts/how-to-verify-a-smart-contract-on-hashscan)
- [Hedera: Verifying Smart Contracts](https://docs.hedera.com/hedera/core-concepts/smart-contracts/verifying-smart-contracts-beta)

## 🛠️ ¿Por qué tu configuración ya estaba lista?

Tu `hardhat.config.ts` ya incluía la configuración correcta:

```typescript
etherscan: {
  customChains: [
    {
      network: "hederaTestnet",
      chainId: 296,
      urls: {
        apiURL: "https://server-verify.hashscan.io",
        browserURL: "https://hashscan.io/testnet",
      },
    }
  ]
},
sourcify: {
  enabled: true,
  apiUrl: "https://server-verify.hashscan.io",
  browserUrl: "https://hashscan.io",
}
```

## 🔍 Verificación del Estado

Después de verificar, puedes comprobar el estado ejecutando:

```bash
# Verificar en HashScan directamente
open https://hashscan.io/testnet/contract/0xaaa51B3C7b17F10A7fF720E085509079794B1334
```

## ❓ Si tienes problemas

1. **Error de gas price**: Ya lo resolviste ajustando `gasPrice: 370000000000`
2. **Error de verificación**: Usa la verificación manual con build-info JSON
3. **Archivo incorrecto**: Usa el archivo build-info más reciente
4. **Error de parámetros**: Verifica que los constructor parameters sean correctos

## 🎯 Conclusión

El problema no era con el deployment sino con la **falta de verificación**. Una vez verificado, el bytecode será completamente visible en HashScan y tu contrato tendrá transparencia total.