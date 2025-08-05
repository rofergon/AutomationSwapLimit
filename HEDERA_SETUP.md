# 🚀 Configuración de Hardhat para Hedera Hashgraph

Este proyecto está configurado para desarrollar y desplegar contratos inteligentes en las redes de **Hedera Hashgraph** usando **Hardhat** y las RPC oficiales de **Hashio**.

## 📋 Información de las Redes

### Testnet (Desarrollo)
- **URL RPC**: `https://testnet.hashio.io/api`
- **Chain ID**: `296`
- **Explorador**: [HashScan Testnet](https://hashscan.io/testnet)
- **HBAR de prueba**: [Portal de desarrollo de Hedera](https://portal.hedera.com)

### Mainnet (Producción)
- **URL RPC**: `https://mainnet.hashio.io/api`
- **Chain ID**: `295`
- **Explorador**: [HashScan Mainnet](https://hashscan.io/mainnet)

## 🛠️ Configuración Inicial

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
Copia y edita el archivo `.env`:
```bash
# En .env
PRIVATE_KEY=tu_clave_privada_aqui
CONTRACT_ADDRESS=direccion_del_contrato_desplegado
```

**⚠️ IMPORTANTE**: 
- Nunca compartas tu `PRIVATE_KEY`
- Usa wallets de prueba para testnet
- Considera usar un hardware wallet para mainnet

### 3. Obtener HBAR para Testnet
1. Ve al [Portal de Desarrollo de Hedera](https://portal.hedera.com)
2. Crea una cuenta
3. Solicita HBAR de testnet
4. Transfiere a tu wallet

## 📝 Contratos Incluidos

### HelloWorld.sol
Un contrato simple que demuestra:
- ✅ Almacenamiento de estado
- ✅ Modificadores de acceso
- ✅ Eventos
- ✅ Funciones públicas y privadas

## 🚀 Comandos de Despliegue

### Compilar Contratos
```bash
npx hardhat compile
```

### Desplegar en Testnet
```bash
npx hardhat run scripts/deploy.ts --network hederaTestnet
```

### Desplegar en Mainnet
```bash
npx hardhat run scripts/deploy.ts --network hederaMainnet
```

### Usando Hardhat Ignition (Alternativo)
```bash
# Testnet
npx hardhat ignition deploy ignition/modules/HelloWorld.ts --network hederaTestnet

# Mainnet
npx hardhat ignition deploy ignition/modules/HelloWorld.ts --network hederaMainnet
```

## 🔄 Interactuar con Contratos

### Método 1: Script de Interacción
```bash
# Asegúrate de tener CONTRACT_ADDRESS en .env
npx hardhat run scripts/interact.ts --network hederaTestnet
```

### Método 2: Consola de Hardhat
```bash
npx hardhat console --network hederaTestnet
```

```javascript
// En la consola
const HelloWorld = await ethers.getContractFactory("HelloWorld");
const contract = HelloWorld.attach("DIRECCION_DEL_CONTRATO");
await contract.getMessage();
await contract.incrementCounter();
```

## 🧪 Testing

### Ejecutar Tests
```bash
npx hardhat test
```

### Tests en Testnet
```bash
npx hardhat test --network hederaTestnet
```

## 📊 Verificación de Contratos

Los contratos se pueden verificar manualmente en HashScan:
1. Ve a [HashScan](https://hashscan.io)
2. Busca la dirección del contrato
3. Ve a la pestaña "Contract"
4. Sube el código fuente si es necesario

## 🔧 Configuración Avanzada

### Gas y Gas Price
El proyecto está configurado con:
- **Gas Limit**: 300,000
- **Gas Price**: 10 gwei

Puedes ajustar estos valores en `hardhat.config.ts`:
```typescript
networks: {
  hederaTestnet: {
    gas: 500000,        // Aumentar si es necesario
    gasPrice: 20000000000, // 20 gwei
  }
}
```

### Timeouts
Para redes lentas, puedes aumentar los timeouts:
```typescript
networks: {
  hederaTestnet: {
    timeout: 60000, // 60 segundos
  }
}
```

## 🚨 Solución de Problemas

### Error: "insufficient funds"
- Verifica que tu wallet tenga HBAR suficiente
- Para testnet, solicita más HBAR en el portal de desarrollo

### Error: "network not supported"
- Verifica el chain ID en MetaMask
- Testnet: 296, Mainnet: 295

### Error: "private key not found"
- Verifica que PRIVATE_KEY esté configurado en `.env`
- Asegúrate de que el archivo `.env` esté en la raíz del proyecto

### Error de compilación
```bash
# Limpiar caché y recompilar
npx hardhat clean
npx hardhat compile
```

## 📚 Recursos Útiles

- [Documentación de Hedera](https://docs.hedera.com)
- [Portal de Desarrollo](https://portal.hedera.com)
- [HashScan Explorer](https://hashscan.io)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Hashio RPC Documentation](https://swirlds.com/hashio-docs/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.