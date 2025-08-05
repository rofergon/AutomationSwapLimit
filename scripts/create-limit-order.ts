import {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  Hbar
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Script para crear una orden limit usando el SDK de Hedera
 * Demuestra la interacción directa con el contrato AutoSwapLimit
 */
async function main() {
  console.log("🎯 Creando orden limit en AutoSwapLimit...");

  // Configurar cliente de Hedera
  const client = Client.forTestnet();
  
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.PRIVATE_KEY) {
    throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
  }

  const operatorAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const operatorPrivateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
  client.setOperator(operatorAccountId, operatorPrivateKey);

  try {
    // Leer direcciones de contratos desplegados
    const deployedContractsPath = path.join(__dirname, "../deployed-contracts-nativo.json");
    const deployedContracts = JSON.parse(fs.readFileSync(deployedContractsPath, "utf8"));
    
    const autoSwapLimitId = deployedContracts.autoSwapLimit;
    const testTokenId = deployedContracts.testToken;
    
    console.log(`📋 AutoSwapLimit Contract: ${autoSwapLimitId}`);
    console.log(`🪙 TestToken: ${testTokenId}`);

    // Convertir testTokenId a dirección EVM
    const testTokenAddress = `0x${AccountId.fromString(testTokenId).toSolidityAddress()}`;
    
    // Parámetros de la orden limit (valores más conservadores para testnet)
    const orderParams = {
      tokenOut: testTokenAddress,                           // Token a recibir (TestToken)
      minAmountOut: "1000000000000000000",                 // 1 token (18 decimals)
      triggerPrice: "10000000000000000",                   // 0.01 HBAR por token (precio más bajo)
      expirationTime: Math.floor(Date.now() / 1000) + 7200, // 2 horas desde ahora
      hbarAmount: 0.15 // 0.15 HBAR total (execution fee + MIN_ORDER_AMOUNT + buffer)
    };

    console.log(`\n🔧 Parámetros de la orden limit:`);
    console.log(`  📍 Token de salida: ${orderParams.tokenOut}`);
    console.log(`  💰 Cantidad mínima: ${orderParams.minAmountOut} wei (1 TestToken)`);
    console.log(`  💱 Precio trigger: ${orderParams.triggerPrice} wei (0.01 HBAR por token)`);
    console.log(`  ⏰ Expiración: ${new Date(orderParams.expirationTime * 1000).toISOString()}`);
    console.log(`  💸 HBAR enviado: ${orderParams.hbarAmount} HBAR (fee + orden + buffer)`);

    // Obtener nextOrderId antes de crear la orden
    console.log(`\n📊 Obteniendo próximo Order ID...`);
    const nextOrderIdQuery = new ContractCallQuery()
      .setContractId(autoSwapLimitId)
      .setGas(100000)
      .setFunction("nextOrderId");

    const nextOrderIdResult = await nextOrderIdQuery.execute(client);
    const orderId = nextOrderIdResult.getUint256(0).toNumber();
    
    console.log(`📝 Próximo Order ID: ${orderId}`);

    // Crear la orden limit
    console.log(`\n🚀 Creando orden limit...`);
    
    const createOrderTx = new ContractExecuteTransaction()
      .setContractId(autoSwapLimitId)
      .setGas(3000000) // Aumentar gas para mayor seguridad
      .setPayableAmount(Hbar.fromTinybars(orderParams.hbarAmount * 100000000)) // Convertir HBAR a tinybars
      .setFunction("createSwapOrder",
        new ContractFunctionParameters()
          .addAddress(orderParams.tokenOut)
          .addUint256(orderParams.minAmountOut)
          .addUint256(orderParams.triggerPrice)
          .addUint256(orderParams.expirationTime)
      );

    const createOrderSubmit = await createOrderTx.execute(client);
    const createOrderReceipt = await createOrderSubmit.getReceipt(client);

    if (createOrderReceipt.status.toString() === "SUCCESS") {
      console.log(`✅ ¡Orden limit creada exitosamente!`);
      console.log(`📄 Transaction ID: ${createOrderSubmit.transactionId}`);
      console.log(`🔗 Ver en HashScan: https://hashscan.io/testnet/transaction/${createOrderSubmit.transactionId}`);
      
      // Verificar la orden creada
      console.log(`\n🔍 Verificando orden creada...`);
      
      const orderDetailsQuery = new ContractCallQuery()
        .setContractId(autoSwapLimitId)
        .setGas(200000)
        .setFunction("getOrderDetails",
          new ContractFunctionParameters().addUint256(orderId)
        );

      const orderDetailsResult = await orderDetailsQuery.execute(client);
      
      const tokenOut = orderDetailsResult.getAddress(0);
      const amountIn = orderDetailsResult.getUint256(1);
      const minAmountOut = orderDetailsResult.getUint256(2);
      const triggerPrice = orderDetailsResult.getUint256(3);
      const owner = orderDetailsResult.getAddress(4);
      const isActive = orderDetailsResult.getBool(5);
      const expirationTime = orderDetailsResult.getUint256(6);
      const isExecuted = orderDetailsResult.getBool(7);

      console.log(`\n📋 Detalles de la orden creada (ID: ${orderId}):`);
      console.log(`  🎯 Token de salida: ${tokenOut}`);
      console.log(`  💰 HBAR depositado: ${amountIn.toString()} tinybars`);
      console.log(`  📊 Cantidad mínima: ${minAmountOut.toString()} wei`);
      console.log(`  💱 Precio trigger: ${triggerPrice.toString()} wei`);
      console.log(`  👤 Propietario: ${owner}`);
      console.log(`  ✅ Activa: ${isActive}`);
      console.log(`  ⏰ Expira: ${new Date(expirationTime.toNumber() * 1000).toISOString()}`);
      console.log(`  🎯 Ejecutada: ${isExecuted}`);

      // Mostrar información adicional
      console.log(`\n👤 Información adicional de la orden:`);
      console.log(`📋 Order ID creada: ${orderId}`);
      console.log(`👤 Propietario: 0x${operatorAccountId.toSolidityAddress()}`);
      
      // Nota: getUserOrders devuelve un array dinámico que es más complejo de leer
      // con el SDK nativo de Hedera. Para simplificar, omitimos esta verificación.

      console.log(`\n🎉 ¡Proceso completado exitosamente!`);
      console.log(`💡 La orden será ejecutada automáticamente por el backend cuando:`);
      console.log(`   • El precio de ${testTokenId} alcance ${orderParams.triggerPrice} wei (0.01 HBAR por token)`);
      console.log(`   • Antes de ${new Date(orderParams.expirationTime * 1000).toISOString()}`);
      
    } else {
      console.error(`❌ Error: ${createOrderReceipt.status}`);
    }

  } catch (error) {
    console.error("💥 Error durante la ejecución:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Manejar errores globales
main()
  .then(() => {
    console.log(`\n✨ Script completado exitosamente`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });