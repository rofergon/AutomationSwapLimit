import { ethers } from "hardhat";
import { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar
} from "@hashgraph/sdk";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔗 Iniciando interacción con contratos en Hedera...");

  const network = hre.network.name;
  console.log(`📡 Red seleccionada: ${network}`);

  // Cargar direcciones de contratos desplegados
  const addressesPath = path.join(__dirname, `../deployed-contracts-${network}.json`);
  
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`No se encontraron contratos desplegados para la red ${network}. Ejecuta primero el script de despliegue.`);
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  console.log("📄 Contratos cargados:", addresses);

  if (network === "hederaTestnet" || network === "hederaMainnet" || network === "hederaLocal") {
    // Interacción usando Hedera SDK
    await interactWithHederaSDK(addresses);
  } else {
    // Interacción usando ethers.js
    await interactWithEthers(addresses);
  }
}

/**
 * Interactuar usando el SDK nativo de Hedera
 */
async function interactWithHederaSDK(addresses: any) {
  console.log("🔧 Interactuando usando Hedera SDK nativo...");

  // Configurar cliente
  const client = Client.forTestnet();
  
  if (process.env.HEDERA_ACCOUNT_ID && process.env.PRIVATE_KEY) {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
    client.setOperator(accountId, privateKey);
  } else {
    throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
  }

  try {
    // 1. Consultar información del TestToken
    console.log("\n🪙 === TestToken Info ===");
    await queryTestTokenInfo(client, addresses.testToken);

    // 2. Mint algunos tokens de prueba
    console.log("\n💰 === Minting Test Tokens ===");
    await mintTestTokens(client, addresses.testToken);

    // 3. Consultar información del AutoSwapLimit
    console.log("\n🔄 === AutoSwapLimit Info ===");
    await queryAutoSwapInfo(client, addresses.autoSwapLimit);

    // 4. Ejemplo: crear una orden de swap
    console.log("\n📝 === Crear Orden de Swap ===");
    // await createSwapOrder(client, addresses);

    console.log("✅ Interacción completada!");

  } catch (error) {
    console.error("❌ Error durante la interacción:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Interactuar usando ethers.js
 */
async function interactWithEthers(addresses: any) {
  console.log("🔧 Interactuando usando ethers.js...");

  const [account] = await ethers.getSigners();
  console.log(`📍 Cuenta: ${account.address}`);

  // Cargar contratos
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = TestToken.attach(addresses.testToken);

  const AutoSwapLimit = await ethers.getContractFactory("AutoSwapLimit");
  const autoSwapLimit = AutoSwapLimit.attach(addresses.autoSwapLimit);

  try {
    // 1. Consultar información del TestToken
    console.log("\n🪙 === TestToken Info ===");
    const name = await testToken.name();
    const symbol = await testToken.symbol();
    const decimals = await testToken.decimals();
    const totalSupply = await testToken.totalSupply();
    const balance = await testToken.balanceOf(account.address);

    console.log(`  Nombre: ${name}`);
    console.log(`  Símbolo: ${symbol}`);
    console.log(`  Decimales: ${decimals}`);
    console.log(`  Suministro total: ${ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`  Balance cuenta: ${ethers.formatEther(balance)} ${symbol}`);

    // 2. Mint más tokens (si somos el owner)
    console.log("\n💰 === Minting Test Tokens ===");
    const mintAmount = ethers.parseEther("1000");
    const mintTx = await testToken.mint(account.address, mintAmount);
    await mintTx.wait();
    console.log(`✅ Minteados ${ethers.formatEther(mintAmount)} ${symbol}`);

    // 3. Consultar información del AutoSwapLimit
    console.log("\n🔄 === AutoSwapLimit Info ===");
    const nextOrderId = await autoSwapLimit.nextOrderId();
    const executionFee = await autoSwapLimit.executionFee();
    console.log(`  Próximo ID de orden: ${nextOrderId}`);
    console.log(`  Fee de ejecución: ${ethers.formatEther(executionFee)} HBAR`);

    // 4. Ejemplo: crear una orden de swap HBAR -> TEST Token
    console.log("\n📝 === Crear Orden de Swap HBAR -> Token ===");
    
    // Obtener cotización estimada
    const hbarAmount = ethers.parseEther("10"); // 10 HBAR
    const totalValue = hbarAmount + executionFee;
    
    console.log(`📊 Consultando cotización para ${ethers.formatEther(hbarAmount)} HBAR...`);
    const estimatedOut = await autoSwapLimit.getEstimatedAmountOut(addresses.testToken, hbarAmount);
    console.log(`💱 Estimación: ${ethers.formatEther(estimatedOut)} ${symbol}`);

    // Configurar orden con slippage del 5%
    const minAmountOut = (estimatedOut * 95n) / 100n; // 5% slippage
    const triggerPrice = ethers.parseEther("0.9"); // Precio trigger (cuando el token valga 0.9 HBAR)
    const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24 horas

    console.log("📝 Creando orden de swap HBAR -> Token...");
    console.log(`  💰 HBAR para swap: ${ethers.formatEther(hbarAmount)}`);
    console.log(`  💰 Fee de ejecución: ${ethers.formatEther(executionFee)}`);
    console.log(`  💰 Total HBAR: ${ethers.formatEther(totalValue)}`);
    console.log(`  🎯 Token objetivo: ${addresses.testToken}`);
    console.log(`  📊 Min tokens esperados: ${ethers.formatEther(minAmountOut)}`);

    const createOrderTx = await autoSwapLimit.createSwapOrder(
      addresses.testToken,    // tokenOut
      minAmountOut,          // minAmountOut
      triggerPrice,          // triggerPrice
      expirationTime,        // expirationTime
      { value: totalValue }   // HBAR para swap + fee de ejecución
    );
    
    const receipt = await createOrderTx.wait();
    console.log(`✅ Orden creada! Hash: ${receipt.hash}`);

    // 5. Consultar órdenes del usuario
    console.log("\n📋 === Órdenes del Usuario ===");
    const userOrders = await autoSwapLimit.getUserOrders(account.address);
    console.log(`  Órdenes activas: ${userOrders.length}`);
    
    for (let i = 0; i < userOrders.length; i++) {
      const orderId = userOrders[i];
      const orderDetails = await autoSwapLimit.getOrderDetails(orderId);
      console.log(`  Orden ${orderId}:`);
      console.log(`    TokenOut: ${orderDetails.tokenOut}`);
      console.log(`    HBAR depositado: ${ethers.formatEther(orderDetails.amountIn)}`);
      console.log(`    Min tokens out: ${ethers.formatEther(orderDetails.minAmountOut)}`);
      console.log(`    Precio trigger: ${ethers.formatEther(orderDetails.triggerPrice)} HBAR`);
      console.log(`    Activa: ${orderDetails.isActive}`);
      console.log(`    Ejecutada: ${orderDetails.isExecuted}`);
      console.log(`    Expira: ${new Date(Number(orderDetails.expirationTime) * 1000).toLocaleString()}`);
    }

    console.log("✅ Interacción completada!");

  } catch (error) {
    console.error("❌ Error durante la interacción:", error);
    throw error;
  }
}

/**
 * Consultar información del TestToken usando Hedera SDK
 */
async function queryTestTokenInfo(client: Client, contractId: string) {
  // Nota: Las consultas con Hedera SDK requieren la ABI del contrato
  // Por simplicidad, aquí mostramos cómo hacer consultas básicas
  console.log(`📊 Consultando información del contrato ${contractId}...`);
  
  // Ejemplo de consulta (requiere implementar ABI decoding)
  // const query = new ContractCallQuery()
  //   .setContractId(contractId)
  //   .setGas(100000)
  //   .setFunction("name");
  
  // const result = await query.execute(client);
  // console.log("Resultado de consulta:", result);
}

/**
 * Mint tokens usando Hedera SDK
 */
async function mintTestTokens(client: Client, contractId: string) {
  console.log(`💰 Minting tokens en contrato ${contractId}...`);
  
  const mintAmount = ethers.parseEther("1000");
  const accountId = client.operatorAccountId!;
  
  // Crear transacción de mint
  const transaction = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(300000)
    .setFunction("mint", 
      new ContractFunctionParameters()
        .addAddress(accountId.toSolidityAddress())
        .addUint256(mintAmount)
    );

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  
  console.log(`✅ Tokens minteados! Status: ${receipt.status}`);
}

/**
 * Consultar información del AutoSwapLimit
 */
async function queryAutoSwapInfo(client: Client, contractId: string) {
  console.log(`📊 Consultando AutoSwapLimit ${contractId}...`);
  
  // Implementar consultas específicas del contrato
  // Similar a queryTestTokenInfo pero para AutoSwapLimit
}

// Manejar errores globales
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });