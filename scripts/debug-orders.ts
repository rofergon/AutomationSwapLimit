import {
  Client,
  AccountId,
  PrivateKey,
  ContractCallQuery,
  ContractFunctionParameters
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Investigando estado de las órdenes...");

  // Configurar cliente de Hedera
  const client = Client.forTestnet();
  
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.PRIVATE_KEY) {
    throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
  }

  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
  client.setOperator(accountId, privateKey);

  const contractId = "0.0.6503346"; // AutoSwapLimit con SaucerSwap V2 Router

  try {
    console.log(`📋 Contrato: ${contractId}`);
    console.log(`👤 Usuario: ${accountId.toString()}`);

    // 1. Obtener nextOrderId
    console.log(`\n🔢 Verificando nextOrderId...`);
    const nextOrderIdQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("nextOrderId");

    const nextOrderIdResult = await nextOrderIdQuery.execute(client);
    const nextOrderId = nextOrderIdResult.getUint256(0).toNumber();
    console.log(`   Next Order ID: ${nextOrderId}`);

    // 2. Verificar órdenes existentes (desde 1 hasta nextOrderId-1)
    console.log(`\n📊 Verificando órdenes existentes...`);
    
    for (let orderId = 1; orderId < nextOrderId; orderId++) {
      try {
        const orderDetailsQuery = new ContractCallQuery()
          .setContractId(contractId)
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

        console.log(`\n   🎯 Orden ${orderId}:`);
        console.log(`      Token Out: ${tokenOut}`);
        console.log(`      Amount In: ${amountIn.toString()} tinybars`);
        console.log(`      Min Amount Out: ${minAmountOut.toString()}`);
        console.log(`      Trigger Price: ${triggerPrice.toString()}`);
        console.log(`      Owner: ${owner}`);
        console.log(`      ✅ Activa: ${isActive}`);
        console.log(`      ⏰ Expiración: ${new Date(expirationTime.toNumber() * 1000).toLocaleString()}`);
        console.log(`      🚀 Ejecutada: ${isExecuted}`);

        // Verificar si es del usuario actual
        const userAccountEvm = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!).toSolidityAddress();
        const userEvmAddress = `0x${userAccountEvm}`;
        
        if (owner.toLowerCase() === userEvmAddress.toLowerCase()) {
          console.log(`      👤 ES TUYA ✅`);
        } else {
          console.log(`      👤 De otro usuario`);
        }

      } catch (error: any) {
        console.log(`   ❌ Orden ${orderId}: Error al consultar - ${error.message?.substring(0, 50)}...`);
      }
    }

    // 3. Verificar configuración del contrato
    console.log(`\n⚙️  Configuración del contrato:`);
    try {
      const configQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(200000)
        .setFunction("getContractConfig");

      const configResult = await configQuery.execute(client);
      const executionFee = configResult.getUint256(0);
      const minOrderAmount = configResult.getUint256(1);
      const backendExecutor = configResult.getAddress(2);
      const currentNextOrderId = configResult.getUint256(3);

      console.log(`   Execution Fee: ${executionFee.toString()} tinybars`);
      console.log(`   Min Order Amount: ${minOrderAmount.toString()} tinybars`);
      console.log(`   Backend Executor: ${backendExecutor}`);
      console.log(`   Next Order ID: ${currentNextOrderId.toString()}`);

    } catch (error: any) {
      console.log(`   ❌ Error obteniendo configuración: ${error.message}`);
    }

  } catch (error: any) {
    console.error("❌ Error durante la investigación:", error);
    throw error;
  } finally {
    client.close();
  }
}

main()
  .then(() => {
    console.log("\n🏁 Investigación completada");
  })
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });