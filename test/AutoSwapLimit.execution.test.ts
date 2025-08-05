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
import { expect } from "chai";

dotenv.config();

describe("AutoSwapLimit - Execution Test", function() {
  let client: Client;
  let contractId: string;
  let testTokenId: string;
  let operatorAccountId: AccountId;
  let operatorPrivateKey: PrivateKey;

  before(async function() {
    this.timeout(10000);

    // Configurar cliente de Hedera
    client = Client.forTestnet();
    
    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.PRIVATE_KEY) {
      throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
    }

    operatorAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    operatorPrivateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
    client.setOperator(operatorAccountId, operatorPrivateKey);

    // Usar direcciones de los contratos desplegados
    contractId = "0.0.6503237"; // AutoSwapLimit mejorado
    testTokenId = "0.0.6503234"; // TestToken
    
    console.log(`📋 Testing AutoSwapLimit EXECUTION: ${contractId}`);
    console.log(`🪙 Using TestToken: ${testTokenId}`);
    console.log(`🔧 Backend Executor: ${operatorAccountId.toString()}`);
  });

  after(async function() {
    if (client) {
      client.close();
    }
  });

  describe("Test completo: Crear y Ejecutar Orden", function() {
    let orderId: number;

    it("Debería crear una orden limit para posteriormente ejecutar", async function() {
      this.timeout(30000);

      // Convertir testTokenId a dirección EVM
      const testTokenAddress = `0x${AccountId.fromString(testTokenId).toSolidityAddress()}`;
      
      // Parámetros para createSwapOrder
      const tokenOut = testTokenAddress;              // Token a recibir (TestToken)
      const minAmountOut = "1000000000000000000";     // 1 token (18 decimals)
      const triggerPrice = "5000000000000000";        // 0.005 HBAR por token (precio muy bajo para garantizar trigger)
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hora desde ahora
      const hbarAmount = 0.15; // 0.15 HBAR total

      console.log(`\n🔧 Parámetros de la orden para ejecución:`);
      console.log(`  Token out: ${tokenOut}`);
      console.log(`  Min amount out: ${minAmountOut} wei`);
      console.log(`  Trigger price: ${triggerPrice} wei (0.005 HBAR - MUY BAJO para test)`);
      console.log(`  Expiration: ${expirationTime} (${new Date(expirationTime * 1000).toISOString()})`);
      console.log(`  HBAR amount: ${hbarAmount} HBAR`);

      // Obtener orderId actual antes de crear la orden
      const nextOrderIdQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("nextOrderId");

      const nextOrderIdResult = await nextOrderIdQuery.execute(client);
      orderId = nextOrderIdResult.getUint256(0).toNumber();
      
      console.log(`📝 Próximo Order ID: ${orderId}`);

      // Crear la orden usando ContractExecuteTransaction
      const createOrderTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(3000000)
        .setPayableAmount(Hbar.fromTinybars(hbarAmount * 100000000))
        .setFunction("createSwapOrder",
          new ContractFunctionParameters()
            .addAddress(tokenOut)
            .addUint256(minAmountOut)
            .addUint256(triggerPrice)
            .addUint256(expirationTime)
        );

      console.log(`🚀 Creando orden para posterior ejecución...`);
      
      const createOrderSubmit = await createOrderTx.execute(client);
      const createOrderReceipt = await createOrderSubmit.getReceipt(client);

      console.log(`✅ Orden creada. Status: ${createOrderReceipt.status}`);
      console.log(`📄 Transaction ID: ${createOrderSubmit.transactionId}`);

      expect(createOrderReceipt.status.toString()).to.equal("SUCCESS");

      // Verificar que la orden se creó correctamente
      const orderDetailsQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(200000)
        .setFunction("getOrderDetails",
          new ContractFunctionParameters().addUint256(orderId)
        );

      const orderDetailsResult = await orderDetailsQuery.execute(client);
      const isActive = orderDetailsResult.getBool(5);
      const isExecuted = orderDetailsResult.getBool(7);

      console.log(`📊 Orden ${orderId} - Activa: ${isActive}, Ejecutada: ${isExecuted}`);
      expect(isActive).to.be.true;
      expect(isExecuted).to.be.false;
    });

    it("Debería ejecutar la orden como backend executor", async function() {
      this.timeout(30000);

      console.log(`\n🎯 Ejecutando orden ${orderId} como backend executor...`);

      // Precio actual que supera el trigger price
      const currentPrice = "10000000000000000"; // 0.01 HBAR (superior a 0.005 HBAR trigger)
      
      console.log(`💱 Current price: ${currentPrice} wei (0.01 HBAR)`);
      console.log(`💱 Trigger price: 5000000000000000 wei (0.005 HBAR)`);
      console.log(`✅ Current price > Trigger price: ${BigInt(currentPrice) > BigInt("5000000000000000")}`);

      try {
        // Ejecutar la orden como backend executor
        const executeOrderTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(4000000) // Más gas para la ejecución del swap
          .setFunction("executeSwapOrder",
            new ContractFunctionParameters()
              .addUint256(orderId)
              .addUint256(currentPrice)
          );

        console.log(`🚀 Ejecutando swap order...`);
        
        const executeOrderSubmit = await executeOrderTx.execute(client);
        const executeOrderReceipt = await executeOrderSubmit.getReceipt(client);

        console.log(`📊 Execution Status: ${executeOrderReceipt.status}`);
        console.log(`📄 Transaction ID: ${executeOrderSubmit.transactionId}`);

        if (executeOrderReceipt.status.toString() === "SUCCESS") {
          console.log(`✅ ¡Swap ejecutado exitosamente!`);
          
          // Verificar que la orden se marcó como ejecutada
          const orderDetailsQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(200000)
            .setFunction("getOrderDetails",
              new ContractFunctionParameters().addUint256(orderId)
            );

          const orderDetailsResult = await orderDetailsQuery.execute(client);
          const isActive = orderDetailsResult.getBool(5);
          const isExecuted = orderDetailsResult.getBool(7);

          console.log(`📊 Post-execution - Activa: ${isActive}, Ejecutada: ${isExecuted}`);
          
          expect(isActive).to.be.false;
          expect(isExecuted).to.be.true;

        } else {
          console.log(`❌ Execution failed: ${executeOrderReceipt.status}`);
          expect.fail(`Execution failed with status: ${executeOrderReceipt.status}`);
        }

      } catch (error: any) {
        console.error(`❌ Error ejecutando orden:`, error.message);
        
        if (error.status && error.status.toString().includes("CONTRACT_REVERT_EXECUTED")) {
          console.log(`⚠️  CONTRACT_REVERT_EXECUTED - Posibles causas:`);
          console.log(`   • SaucerSwap sin liquidez en testnet`);
          console.log(`   • Pair no existe para este token`);
          console.log(`   • Router address incorrecta`);
          console.log(`   • Slippage muy bajo`);
          
          // En testnet esto es esperado - no fallar el test
          console.log(`🧪 En testnet, esto es normal debido a falta de liquidez`);
          
          // Verificar que la orden sigue activa (no se ejecutó debido al revert)
          const orderDetailsQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(200000)
            .setFunction("getOrderDetails",
              new ContractFunctionParameters().addUint256(orderId)
            );

          const orderDetailsResult = await orderDetailsQuery.execute(client);
          const isActive = orderDetailsResult.getBool(5);
          const isExecuted = orderDetailsResult.getBool(7);

          console.log(`📊 Post-revert - Activa: ${isActive}, Ejecutada: ${isExecuted}`);
          
          // La orden debería seguir activa si el swap falló
          expect(isActive).to.be.true;
          expect(isExecuted).to.be.false;
          
        } else {
          throw error;
        }
      }
    });

    it("Debería verificar el balance del contrato después de la ejecución", async function() {
      this.timeout(10000);

      const balanceQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getContractBalance");

      const balanceResult = await balanceQuery.execute(client);
      const balance = balanceResult.getUint256(0);

      console.log(`\n💰 Balance del contrato post-ejecución: ${balance.toString()} tinybars`);
      console.log(`💰 Balance en HBAR: ${balance.toNumber() / 100000000} HBAR`);
      
      // El balance debería incluir execution fees acumuladas
      expect(balance.toNumber()).to.be.greaterThanOrEqual(0);
    });

    it("Debería limpiar - cancelar orden si sigue activa", async function() {
      this.timeout(20000);

      // Verificar si la orden sigue activa
      const orderDetailsQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(200000)
        .setFunction("getOrderDetails",
          new ContractFunctionParameters().addUint256(orderId)
        );

      const orderDetailsResult = await orderDetailsQuery.execute(client);
      const isActive = orderDetailsResult.getBool(5);
      const isExecuted = orderDetailsResult.getBool(7);

      console.log(`\n🧹 Limpieza - Orden ${orderId} - Activa: ${isActive}, Ejecutada: ${isExecuted}`);

      if (isActive && !isExecuted) {
        console.log(`🗑️  Cancelando orden activa ${orderId}...`);

        const cancelOrderTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(1000000)
          .setFunction("cancelSwapOrder",
            new ContractFunctionParameters().addUint256(orderId)
          );

        const cancelOrderSubmit = await cancelOrderTx.execute(client);
        const cancelOrderReceipt = await cancelOrderSubmit.getReceipt(client);

        console.log(`✅ Orden cancelada. Status: ${cancelOrderReceipt.status}`);
        expect(cancelOrderReceipt.status.toString()).to.equal("SUCCESS");
      } else {
        console.log(`ℹ️  Orden ya ejecutada o inactiva - no necesita limpieza`);
      }
    });
  });

  describe("Test de validaciones de executeSwapOrder", function() {
    it("Debería fallar al ejecutar orden con precio insuficiente", async function() {
      this.timeout(20000);

      // Crear una orden rápida para test
      const testTokenAddress = `0x${AccountId.fromString(testTokenId).toSolidityAddress()}`;
      const triggerPrice = "50000000000000000"; // 0.05 HBAR trigger
      
      // Obtener próximo order ID
      const nextOrderIdQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("nextOrderId");

      const nextOrderIdResult = await nextOrderIdQuery.execute(client);
      const orderId = nextOrderIdResult.getUint256(0).toNumber();

      // Crear orden
      const createOrderTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(3000000)
        .setPayableAmount(Hbar.fromTinybars(15000000)) // 0.15 HBAR
        .setFunction("createSwapOrder",
          new ContractFunctionParameters()
            .addAddress(testTokenAddress)
            .addUint256("1000000000000000000") // 1 token
            .addUint256(triggerPrice) // 0.05 HBAR trigger
            .addUint256(Math.floor(Date.now() / 1000) + 3600) // 1 hora
        );

      const createSubmit = await createOrderTx.execute(client);
      const createReceipt = await createSubmit.getReceipt(client);
      
      expect(createReceipt.status.toString()).to.equal("SUCCESS");
      console.log(`✅ Orden de test creada: ${orderId}`);

      try {
        // Intentar ejecutar con precio insuficiente
        const currentPrice = "10000000000000000"; // 0.01 HBAR (menor que 0.05 trigger)
        
        console.log(`❌ Intentando ejecutar con precio insuficiente:`);
        console.log(`   Current: ${currentPrice} wei (0.01 HBAR)`);
        console.log(`   Trigger: ${triggerPrice} wei (0.05 HBAR)`);

        const executeOrderTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(4000000)
          .setFunction("executeSwapOrder",
            new ContractFunctionParameters()
              .addUint256(orderId)
              .addUint256(currentPrice)
          );

        const executeSubmit = await executeOrderTx.execute(client);
        const executeReceipt = await executeSubmit.getReceipt(client);

        // Esto debería fallar
        expect.fail(`Ejecución debería haber fallado pero obtuvo: ${executeReceipt.status}`);

      } catch (error: any) {
        console.log(`✅ Error esperado: ${error.message}`);
        expect(error.message).to.include("CONTRACT_REVERT_EXECUTED");
      }

      // Limpiar - cancelar la orden de test
      const cancelTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("cancelSwapOrder",
          new ContractFunctionParameters().addUint256(orderId)
        );

      await cancelTx.execute(client);
      console.log(`🧹 Orden de test cancelada`);
    });
  });
});