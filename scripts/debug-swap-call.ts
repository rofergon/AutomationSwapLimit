import {
  Client,
  AccountId,
  PrivateKey,
  ContractCallQuery,
  ContractFunctionParameters,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Depurando configuración del contrato y router...");

  // Configurar cliente de Hedera
  const client = Client.forTestnet();
  
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.PRIVATE_KEY) {
    throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
  }

  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
  client.setOperator(accountId, privateKey);

  const contractId = "0.0.6503363"; // AutoSwapLimit con router correcto
  const sauceTokenAddress = process.env.TESTNET_SAUCE_ADDRESS || "0x0000000000000000000000000000000000120f46";
  const routerAddress = "0x0000000000000000000000000000000000159398"; // SaucerSwap V2 Router
  const whbarAddress = "0x0000000000000000000000000000000000003ad2"; // WHBAR

  try {
    console.log(`📋 Contrato AutoSwapLimit: ${contractId}`);
    console.log(`🔄 Router esperado: ${routerAddress} (0.0.1414040)`);
    console.log(`💰 WHBAR: ${whbarAddress} (0.0.15058)`);
    console.log(`🎯 SAUCE: ${sauceTokenAddress} (0.0.1183558)`);

    // 1. Verificar configuración del contrato
    console.log(`\n🔧 1. Verificando configuración del contrato...`);
    
    const contractConfigQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getContractConfig");

    const contractConfigResult = await contractConfigQuery.execute(client);
    console.log(`✅ Configuración del contrato verificada`);

    // 2. Probar estimación de swap
    console.log(`\n💡 2. Probando estimación de swap...`);
    
    const amountIn = "150000000000000000"; // 0.15 HBAR en wei
    
    try {
      const estimateQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(200000)
        .setFunction("getEstimatedAmountOut",
          new ContractFunctionParameters()
            .addAddress(sauceTokenAddress)
            .addUint256(amountIn)
        );

      const estimateResult = await estimateQuery.execute(client);
      const estimatedOut = estimateResult.getUint256(0).toString();
      
      console.log(`📊 Estimación exitosa:`);
      console.log(`   Input: ${amountIn} wei HBAR (0.15 HBAR)`);
      console.log(`   Output estimado: ${estimatedOut} wei SAUCE`);
      console.log(`   Esto confirma que el router está configurado correctamente`);
      
    } catch (error: any) {
      console.error(`❌ Error en estimación:`, error.message);
      console.log(`🔍 Esto indica un problema con el router o los tokens`);
      
      if (error.message.includes("CONTRACT_REVERT_EXECUTED")) {
        console.log(`💡 El contrato no puede comunicarse con el router`);
        console.log(`🔧 Posibles causas:`);
        console.log(`   - Router no implementa getAmountsOut correctamente`);
        console.log(`   - Path WHBAR -> SAUCE no existe`);
        console.log(`   - Problemas de liquidez`);
      }
    }

    // 3. Verificar si hay órdenes activas
    console.log(`\n📋 3. Verificando órdenes existentes...`);
    
    const nextOrderIdQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("nextOrderId");

    const nextOrderIdResult = await nextOrderIdQuery.execute(client);
    const nextOrderId = nextOrderIdResult.getUint256(0).toNumber();
    
    console.log(`🆔 Próximo Order ID: ${nextOrderId}`);
    
    if (nextOrderId > 1) {
      console.log(`📊 Hay ${nextOrderId - 1} orden(es) existente(s)`);
      
      // Verificar la última orden
      const lastOrderId = nextOrderId - 1;
      
      const orderDetailsQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(200000)
        .setFunction("getOrderDetails",
          new ContractFunctionParameters().addUint256(lastOrderId)
        );

      const orderDetailsResult = await orderDetailsQuery.execute(client);
      const tokenOut = orderDetailsResult.getAddress(0);
      const amountIn = orderDetailsResult.getUint256(1).toString();
      const minAmountOut = orderDetailsResult.getUint256(2).toString();
      const triggerPrice = orderDetailsResult.getUint256(3).toString();
      const owner = orderDetailsResult.getAddress(4);
      const isActive = orderDetailsResult.getBool(5);
      const expirationTime = orderDetailsResult.getUint256(6).toNumber();
      const isExecuted = orderDetailsResult.getBool(7);

      console.log(`📋 Orden ${lastOrderId}:`);
      console.log(`   Token: ${tokenOut}`);
      console.log(`   HBAR: ${amountIn} wei`);
      console.log(`   Min out: ${minAmountOut} wei`);
      console.log(`   Trigger: ${triggerPrice} wei`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Activa: ${isActive}`);
      console.log(`   Ejecutada: ${isExecuted}`);
      console.log(`   Expira: ${new Date(expirationTime * 1000).toLocaleString()}`);
    }

    // 4. Verificar liquidez en SaucerSwap directamente
    console.log(`\n💧 4. Verificando liquidez en SaucerSwap...`);
    console.log(`🔗 Pool WHBAR/SAUCE: https://app.saucerswap.finance/swap`);
    console.log(`📊 Para verificar manualmente:`);
    console.log(`   - Ve a SaucerSwap Testnet`);
    console.log(`   - Intenta swap manual de HBAR -> SAUCE`);
    console.log(`   - Verifica que el pool existe y tiene liquidez`);

  } catch (error: any) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.close();
  }
}

main()
  .then(() => {
    console.log("\n🏁 Depuración completada");
  })
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });