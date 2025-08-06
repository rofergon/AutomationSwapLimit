# MockPriceOracle Contract

Un contrato oráculo para proporcionar precios mock de HBAR y SAUCE en términos de USDC para el sistema AutoSwapLimit en Hedera.

## 📋 Características

- **Precios Mock**: Precios configurables manualmente para testing
- **Precisión de 8 decimales**: Compatible con estándares como Chainlink
- **Control de acceso**: Solo el owner puede actualizar precios
- **Validación de precios**: Límites de cambio de precio y edad máxima
- **Múltiples tokens**: Soporte para HBAR, WHBAR, USDC y SAUCE
- **Actualización en lote**: Permite actualizar múltiples precios a la vez

## 🪙 Tokens Soportados

| Token | Dirección (Hedera Testnet) | Precio Inicial |
|-------|---------------------------|----------------|
| HBAR | `0x0000000000000000000000000000000000000000` | $0.27 |
| WHBAR | `0x0000000000000000000000000000000000003aD2` | $0.27 |
| USDC | `0x00000000000000000000000000000000000014F5` | $1.00 |
| SAUCE | `0x0000000000000000000000000000000000120f46` | $0.0587 |

## 🚀 Despliegue

```bash
# Compilar contratos
npx hardhat compile

# Desplegar con SDK nativo de Hedera (incluye el oráculo)
npx hardhat run scripts/deploy-hedera-nativo.ts --network hedera-testnet

# Probar integración del oráculo
npx hardhat run scripts/test-oracle-integration.ts --network hedera-testnet
```

## 📖 Uso Básico

### Obtener Precio Actual

```solidity
// Obtener precio de SAUCE
(uint256 price, uint256 lastUpdated) = oracle.getPrice(SAUCE_ADDRESS);

// Obtener solo el precio (compatible con Chainlink)
uint256 saucePrice = oracle.latestPrice(SAUCE_ADDRESS);

// Verificar si el precio es reciente
bool isFresh = oracle.isPriceFresh(SAUCE_ADDRESS);
```

### Actualizar Precios (Solo Owner)

```solidity
// Actualizar precio de HBAR a $0.30
oracle.updatePrice(HBAR_ADDRESS, 30000000); // 8 decimales

// Actualizar múltiples precios
address[] memory tokens = [HBAR_ADDRESS, SAUCE_ADDRESS];
uint256[] memory prices = [32000000, 7000000]; // $0.32 y $0.07
oracle.updatePrices(tokens, prices);
```

### Gestión de Tokens

```solidity
// Agregar nuevo token
oracle.addToken(newTokenAddress, 5000000); // $0.05

// Remover token
oracle.removeToken(tokenAddress);

// Activar/desactivar feed de precios
oracle.setPriceFeedActive(tokenAddress, false);
```

## 🔧 Configuración

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `PRICE_DECIMALS` | 8 | Decimales de precisión |
| `PRICE_PRECISION` | 10^8 | Factor de precisión |
| `MAX_PRICE_AGE` | 24 horas | Edad máxima del precio |
| `MAX_PRICE_CHANGE_PERCENT` | 10% | Cambio máximo por actualización |

## 🔗 Integración con AutoSwapLimit

Para integrar el oráculo con el contrato AutoSwapLimit:

### 1. Modificar AutoSwapLimit

```solidity
import "./MockPriceOracle.sol";

contract AutoSwapLimit {
    MockPriceOracle public priceOracle;
    
    constructor(address _priceOracle) {
        priceOracle = MockPriceOracle(_priceOracle);
    }
    
    function executeSwapOrder(uint256 orderId) external {
        SwapOrder storage order = swapOrders[orderId];
        
        // Obtener precio actual del oráculo
        (uint256 currentPrice, ) = priceOracle.getPrice(order.tokenOut);
        
        // Verificar que el precio sea reciente
        require(priceOracle.isPriceFresh(order.tokenOut), "Price too old");
        
        // Verificar condición de trigger
        require(currentPrice >= order.triggerPrice, "Price below trigger");
        
        // Continuar con la ejecución del swap...
    }
}
```

### 2. Función de Ejecución Actualizada

```solidity
function executeSwapOrder(uint256 orderId) 
    external 
    nonReentrant 
    onlyAuthorizedExecutor
    onlyActiveOrder(orderId) 
{
    SwapOrder storage order = swapOrders[orderId];
    
    // Validar precio con oráculo
    (uint256 oraclePrice, ) = priceOracle.getPrice(order.tokenOut);
    require(priceOracle.isPriceFresh(order.tokenOut), "Oracle price too old");
    require(oraclePrice >= order.triggerPrice, "Oracle price below trigger");
    
    // Marcar orden como ejecutada
    order.isActive = false;
    order.isExecuted = true;
    
    // Ejecutar swap en SaucerSwap
    // ... resto de la lógica de swap
    
    emit OrderExecuted(orderId, msg.sender, amountOut, oraclePrice);
}
```

## 📊 Eventos

```solidity
event PriceUpdated(address indexed token, uint256 oldPrice, uint256 newPrice, uint256 timestamp);
event TokenAdded(address indexed token, uint256 initialPrice);
event TokenRemoved(address indexed token);
event PriceFeedActivated(address indexed token);
event PriceFeedDeactivated(address indexed token);
```

## 🛠 Funciones de Utilidad

### Formateo de Precios

```solidity
// Convertir precio a formato legible
string memory formattedPrice = oracle.formatPrice(8000000); // "0.08 USDC"
```

### Información del Oráculo

```solidity
// Obtener configuración
(uint256 decimals, uint256 precision, uint256 maxAge, uint256 maxChangePercent) = oracle.getOracleConfig();

// Obtener tokens soportados
address[] memory tokens = oracle.getSupportedTokens();

// Verificar si token está soportado
bool isSupported = oracle.isSupportedToken(tokenAddress);
```

## 🎯 Ejemplos de Uso

### Crear Orden Límite con Verificación de Precio

```javascript
// Frontend/Backend code
const oracle = new ethers.Contract(oracleAddress, oracleABI, signer);
const autoSwapLimit = new ethers.Contract(autoSwapAddress, autoSwapABI, signer);

// Verificar precio actual antes de crear orden
const currentPrice = await oracle.latestPrice(SAUCE_ADDRESS);
const triggerPrice = ethers.parseUnits("0.06", 8); // $0.06 con 8 decimales

if (currentPrice < triggerPrice) {
    // Crear orden límite
    await autoSwapLimit.createSwapOrder(
        SAUCE_ADDRESS,
        minAmountOut,
        triggerPrice,
        expirationTime,
        { value: ethers.parseEther("1.0") } // 1 HBAR
    );
}
```

### Monitoreo y Ejecución Automatizada

```javascript
// Backend monitoring service
async function monitorOrders() {
    const orders = await autoSwapLimit.getUserOrders(userAddress);
    
    for (const orderId of orders) {
        const order = await autoSwapLimit.getOrderDetails(orderId);
        
        if (order.isActive && !order.isExecuted) {
            // Verificar precio actual
            const currentPrice = await oracle.latestPrice(order.tokenOut);
            
            if (currentPrice >= order.triggerPrice) {
                // Ejecutar orden
                await autoSwapLimit.executeSwapOrder(orderId);
                console.log(`Order ${orderId} executed at price ${currentPrice}`);
            }
        }
    }
}

// Ejecutar cada 30 segundos
setInterval(monitorOrders, 30000);
```

## 🔒 Seguridad

- ✅ Control de acceso con OpenZeppelin Ownable
- ✅ Validación de rangos de precio
- ✅ Límites de cambio de precio por actualización
- ✅ Verificación de edad máxima de precios
- ✅ Validación de direcciones de tokens

## 🚨 Consideraciones

- **Solo para Testing**: Este es un oráculo mock para desarrollo y testing
- **Precios Manuales**: Requiere actualización manual de precios
- **Sin Feeds Externos**: No se conecta a fuentes de precios reales
- **Centralizado**: El owner controla todos los precios

Para producción, considera usar oráculos descentralizados como Chainlink o Pyth.

## 📝 Licencia

MIT License