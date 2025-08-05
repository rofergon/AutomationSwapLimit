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

dotenv.config();

async function main() {
  console.log("🚀 Creando nueva orden fresca para ejecutar...");
  console.log("🔧 Script actualizado: verifica y configura ejecución pública");

  // Configurar cliente de Hedera
  const client = Client.forTestnet();
  
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.PRIVATE_KEY) {
    throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
  }

  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
  client.setOperator(accountId, privateKey);

  const contractId = "0.0.6503363"; // AutoSwapLimit con SaucerSwap V2 Router CORRECTO (0.0.1414040)

  try {
    // SAUCE token oficial
    const sauceTokenAddress = process.env.TESTNET_SAUCE_ADDRESS || "0x0000000000000000000000000000000000120f46";
    
    console.log(`📋 Contrato: ${contractId}`);
    console.log(`👤 Usuario: ${accountId.toString()}`);
    console.log(`🎯 Token: SAUCE (${sauceTokenAddress})`);

    // 1. Verificar y configurar ejecución pública
    console.log(`\n🔧 Verificando configuración de ejecución pública...`);
    
    const executionConfigQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getExecutionConfig");

    const executionConfigResult = await executionConfigQuery.execute(client);
    const isPublicExecutionEnabled = executionConfigResult.getBool(0);
    const authorizedExecutorCount = executionConfigResult.getUint256(1).toNumber();
    const backendExecutor = executionConfigResult.getAddress(2);

    console.log(`🔓 Ejecución pública: ${isPublicExecutionEnabled ? '✅ HABILITADA' : '❌ DESHABILITADA'}`);
    console.log(`👥 Ejecutores autorizados: ${authorizedExecutorCount}`);
    console.log(`🤖 Backend executor: ${backendExecutor}`);

    // Si la ejecución pública no está habilitada, habilitarla
    if (!isPublicExecutionEnabled) {
      console.log(`\n🔄 Habilitando ejecución pública...`);
      
      const togglePublicTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("togglePublicExecution",
          new ContractFunctionParameters().addBool(true)
        );

      const togglePublicSubmit = await togglePublicTx.execute(client);
      const togglePublicReceipt = await togglePublicSubmit.getReceipt(client);

      if (togglePublicReceipt.status.toString() === "SUCCESS") {
        console.log(`✅ Ejecución pública habilitada correctamente`);
      } else {
        console.log(`❌ Error habilitando ejecución pública: ${togglePublicReceipt.status}`);
        throw new Error("No se pudo habilitar la ejecución pública");
      }
    } else {
      console.log(`✅ Ejecución pública ya está habilitada`);
    }

    // 2. Verificar configuración del router
    console.log(`\n🔍 Verificando configuración del contrato...`);
    
    const contractConfigQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getContractConfig");

    const contractConfigResult = await contractConfigQuery.execute(client);
    const currentExecutionFee = contractConfigResult.getUint256(0).toString();
    const minOrderAmount = contractConfigResult.getUint256(1).toString();
    const backendExecutorFromContract = contractConfigResult.getAddress(2);
    const nextOrderIdFromContract = contractConfigResult.getUint256(3).toNumber();

    console.log(`⚙️  Fee de ejecución: ${currentExecutionFee} tinybars`);
    console.log(`💰 Monto mínimo orden: ${minOrderAmount} tinybars`);
    console.log(`🤖 Backend executor: ${backendExecutorFromContract}`);
    console.log(`🆔 Próximo Order ID: ${nextOrderIdFromContract}`);
    console.log(`📍 Router configurado: SaucerSwap V2 (0.0.1414040)`);

    // 3. Obtener próximo orderId
    const nextOrderIdQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("nextOrderId");

    const nextOrderIdResult = await nextOrderIdQuery.execute(client);
    const orderId = nextOrderIdResult.getUint256(0).toNumber();

    console.log(`\n🆔 Nueva Order ID será: ${orderId}`);

    // 3. Crear nueva orden con parámetros realistas
    const minAmountOut = "1000000000000000000";        // 1 SAUCE
    const triggerPrice = "500000000000000";             // 0.0005 HBAR/SAUCE (muy bajo)
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hora
    const hbarAmount = 0.15; // 0.15 HBAR

    console.log(`\n🔧 Parámetros de la orden:`);
    console.log(`  Min SAUCE out: ${minAmountOut} wei (1 SAUCE)`);
    console.log(`  Trigger: ${triggerPrice} wei (0.0005 HBAR/SAUCE)`);
    console.log(`  HBAR: ${hbarAmount} HBAR`);
    console.log(`  Expiración: ${new Date(expirationTime * 1000).toLocaleString()}`);

    const createOrderTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(3000000)
      .setPayableAmount(Hbar.fromTinybars(hbarAmount * 100000000))
      .setFunction("createSwapOrder",
        new ContractFunctionParameters()
          .addAddress(sauceTokenAddress)
          .addUint256(minAmountOut)
          .addUint256(triggerPrice)
          .addUint256(expirationTime)
      );

    console.log(`\n🚀 Creando orden ${orderId}...`);
    
    const createOrderSubmit = await createOrderTx.execute(client);
    const createOrderReceipt = await createOrderSubmit.getReceipt(client);

    console.log(`📊 Resultado: ${createOrderReceipt.status}`);
    console.log(`📄 Transaction ID: ${createOrderSubmit.transactionId}`);

    if (createOrderReceipt.status.toString() === "SUCCESS") {
      console.log(`✅ ¡Orden ${orderId} creada exitosamente!`);
      
      // 4. Verificar que la orden está activa
      const orderDetailsQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(200000)
        .setFunction("getOrderDetails",
          new ContractFunctionParameters().addUint256(orderId)
        );

      const orderDetailsResult = await orderDetailsQuery.execute(client);
      const isActive = orderDetailsResult.getBool(5);
      const isExecuted = orderDetailsResult.getBool(7);

      console.log(`\n📊 Estado de la orden ${orderId}:`);
      console.log(`  ✅ Activa: ${isActive}`);
      console.log(`  🚀 Ejecutada: ${isExecuted}`);

      if (isActive) {
        console.log(`\n🎯 AHORA intenta ejecutar la orden:`);
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Comando para ejecutar manualmente:`);
        console.log(`   npm run execute-order -- ${orderId}`);
        
        // 5. Intentar ejecutar inmediatamente
        console.log(`\n🚀 Intentando ejecutar orden ${orderId}...`);
        
        const currentPrice = "1000000000000000000"; // 1 HBAR/SAUCE (muy alto)
        console.log(`💱 Precio actual: ${currentPrice} wei (1 HBAR/SAUCE)`);
        console.log(`💱 Precio trigger: ${triggerPrice} wei (0.0005 HBAR/SAUCE)`);
        console.log(`✅ Precio actual supera trigger - debería ejecutarse`);

        const executeOrderTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(5000000)
          .setFunction("executeSwapOrder",
            new ContractFunctionParameters()
              .addUint256(orderId)
              .addUint256(currentPrice)
          );

        try {
          const executeOrderSubmit = await executeOrderTx.execute(client);
          const executeOrderReceipt = await executeOrderSubmit.getReceipt(client);

          if (executeOrderReceipt.status.toString() === "SUCCESS") {
            console.log(`🎉 ¡SWAP EXITOSO! Order ${orderId} ejecutada correctamente`);
            console.log(`📄 Execute Transaction ID: ${executeOrderSubmit.transactionId}`);
            console.log(`🔗 Ver en HashScan: https://hashscan.io/testnet/transaction/${executeOrderSubmit.transactionId}`);
          } else {
            console.log(`❌ Execution failed: ${executeOrderReceipt.status}`);
          }

        } catch (error: any) {
          console.error(`❌ Error durante ejecución:`, error.message);
          
          if (error.status && error.status.toString().includes("CONTRACT_REVERT_EXECUTED")) {
            console.log(`⚠️  CONTRACT_REVERT_EXECUTED - Problema en el swap`);
            console.log(`💡 La orden se creó correctamente, pero el swap falló`);
            console.log(`🔍 Posibles causas: liquidez, slippage, routing`);
          } else {
            console.log(`🔍 Otro tipo de error: ${error.status}`);
          }
        }

      } else {
        console.log(`❌ La orden no está activa después de crearse`);
      }

    } else {
      console.log(`❌ Error creando orden: ${createOrderReceipt.status}`);
    }

  } catch (error: any) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.close();
  }
}

main()
  .then(() => {
    console.log("\n🏁 Proceso completado");
  })
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });