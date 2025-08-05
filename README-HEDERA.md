# 🚀 Entorno de Desarrollo para Contratos en Hedera

Este proyecto está configurado para desarrollar, compilar, desplegar y verificar contratos inteligentes en la red de Hedera usando las mejores prácticas y herramientas oficiales.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Contratos Incluidos](#contratos-incluidos)
- [Scripts Disponibles](#scripts-disponibles)
- [Testing](#testing)
- [Verificación de Contratos](#verificación-de-contratos)
- [Recursos](#recursos)

## ✨ Características

- 🔧 **Hardhat** configurado para redes de Hedera (Testnet/Mainnet/Local)
- 📚 **OpenZeppelin Contracts** para seguridad y estándares
- 🧪 **Framework de Testing** completo con Chai y Mocha
- 🔍 **Verificación automática** de contratos en HashScan
- 📱 **SDK de Hedera** para interacciones nativas
- ⚡ **ethers.js** para compatibilidad EVM
- 🔒 **Configuración segura** de variables de entorno

## 🛠 Requisitos Previos

- **Node.js** v18+ 
- **npm** o **yarn**
- **Cuenta en Hedera** (Testnet/Mainnet)
- **HBAR** para gas fees

## 📥 Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Compilar contratos:**
```bash
npm run compile
```

## ⚙️ Configuración

### 1. Variables de Entorno

Tu archivo `.env` ya está configurado con:

```bash
# Hedera Account Configuration
HEDERA_ACCOUNT_ID=0.0.5864846
PRIVATE_KEY=0x321de7a5c8df80cd6116f66fc193ee1461fa40625199d713a27dddb51fc457e5

# Network URLs
TESTNET_RPC_URL=https://testnet.hashio.io/api
MAINNET_RPC_URL=https://mainnet.hashio.io/api
TESTNET_CHAIN_ID=296
MAINNET_CHAIN_ID=295
```

### 2. Redes Configuradas

El proyecto incluye configuración para:

- **hederaTestnet**: Red de pruebas de Hedera
- **hederaMainnet**: Red principal de Hedera  
- **hederaLocal**: Nodo local de Hedera para desarrollo

## 🚀 Uso

### Compilar Contratos

```bash
npm run compile
```

### Desplegar en Testnet

```bash
npm run deploy:testnet
```

### Desplegar en Mainnet

```bash
npm run deploy:mainnet
```

### Interactuar con Contratos

```bash
npm run interact:testnet
npm run interact:mainnet
```

### Ejecutar Tests

```bash
npm run test
```

## 📄 Contratos Incluidos

### 1. AutoSwapLimit.sol
Contrato principal para automatización de intercambios con límites:

- ✅ Crear órdenes de intercambio automático
- ✅ Ejecutar órdenes cuando se cumplen condiciones
- ✅ Cancelar órdenes activas
- ✅ Sistema de fees y recompensas
- ✅ Controles de seguridad con OpenZeppelin

### 2. TestToken.sol
Token ERC20 para pruebas:

- ✅ Mint/Burn funcionalidad
- ✅ Control de acceso con Ownable
- ✅ Configuración flexible de decimales

## 🔧 Scripts Disponibles

### Scripts de Hardhat

| Comando | Descripción |
|---------|-------------|
| `npm run compile` | Compilar contratos |
| `npm run test` | Ejecutar tests |
| `npm run deploy:testnet` | Desplegar en Hedera Testnet |
| `npm run deploy:mainnet` | Desplegar en Hedera Mainnet |
| `npm run interact:testnet` | Interactuar con contratos en Testnet |
| `npm run interact:mainnet` | Interactuar con contratos en Mainnet |

### Scripts Personalizados

#### deploy-hedera.ts
Despliega contratos usando tanto:
- **Hedera SDK nativo** (recomendado para funcionalidades avanzadas)
- **ethers.js** (para compatibilidad EVM estándar)

#### interact-hedera.ts
Interactúa con contratos desplegados:
- Consultar información de contratos
- Ejecutar transacciones
- Monitorear eventos

## 🧪 Testing

### Ejecutar Tests Completos

```bash
npm run test
```

### Ejecutar Tests Específicos

```bash
npx hardhat test test/AutoSwapLimit.test.ts
```

### Tests Incluidos

- ✅ **Deployment tests**: Verificar despliegue correcto
- ✅ **Functionality tests**: Probar todas las funciones
- ✅ **Security tests**: Validar controles de acceso
- ✅ **Edge cases**: Casos límite y errores

## 🔍 Verificación de Contratos

### Verificación Automática

Los contratos se verifican automáticamente durante el despliegue usando **Sourcify** y **HashScan**.

### Verificación Manual

```bash
npx hardhat verify --network hederaTestnet DEPLOYED_CONTRACT_ADDRESS "Constructor" "Args"
```

### Ejemplo

```bash
npx hardhat verify --network hederaTestnet 0x1234... "Test Token" "TEST" 18 "1000000000000000000000000"
```

## 📚 Recursos Útiles

### Documentación Oficial

- [Hedera Docs](https://docs.hedera.com)
- [Hedera SDK JavaScript](https://github.com/hashgraph/hedera-sdk-js)
- [Hardhat Hedera Plugin](https://docs.hedera.com/hedera/tutorials/smart-contracts/deploy-a-smart-contract-using-hardhat-hedera-json-rpc-relay)

### Herramientas de Desarrollo

- [HashScan Explorer](https://hashscan.io) - Explorador de bloques
- [Hedera Portal](https://portal.hedera.com) - Portal de desarrolladores
- [Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/mirror-node-rest-api)

### Recursos de la Comunidad

- [Discord de Hedera](https://discord.com/invite/hedera)
- [GitHub de Hedera](https://github.com/hashgraph)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/hedera-hashgraph)

## 🔐 Mejores Prácticas de Seguridad

1. **Never commit private keys** - Usa variables de entorno
2. **Test exhaustively** - Siempre prueba en testnet primero
3. **Use OpenZeppelin** - Para controles de seguridad estándar
4. **Verify contracts** - Siempre verifica el código fuente
5. **Monitor gas usage** - Optimiza para costos en Hedera

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Si necesitas ayuda:

1. Revisa la [documentación oficial de Hedera](https://docs.hedera.com)
2. Busca en [Stack Overflow](https://stackoverflow.com/questions/tagged/hedera-hashgraph)
3. Únete al [Discord de Hedera](https://discord.com/invite/hedera)

---

**¡Happy coding en Hedera! 🚀**