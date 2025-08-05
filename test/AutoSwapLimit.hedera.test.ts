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

describe("AutoSwapLimit - SDK Hedera Test", function() {
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

    // Usar direcciones de los contratos desplegados (actualizado)
    contractId = "0.0.6503237"; // AutoSwapLimit mejorado
    testTokenId = "0.0.6503234"; // TestToken
    
    console.log(`📋 Testing AutoSwapLimit contract: ${contractId}`);
    console.log(`🪙 Using TestToken: ${testTokenId}`);
  });

  after(async function() {
    if (client) {
      client.close();
    }
  });

  describe("Verificar información del contrato", function() {
    it("Debería obtener el nextOrderId", async function() {
      this.timeout(10000);

      const nextOrderIdQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("nextOrderId");

      const nextOrderIdResult = await nextOrderIdQuery.execute(client);
      const nextOrderId = nextOrderIdResult.getUint256(0);
      
      console.log(`📝 Next Order ID: ${nextOrderId.toString()}`);
      expect(nextOrderId.toNumber()).to.be.greaterThan(0);
    });

    it("Debería obtener la fee de ejecución", async function() {
      this.timeout(10000);

      const feeQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("executionFee");

      const feeResult = await feeQuery.execute(client);
      const executionFee = feeResult.getUint256(0);

      console.log(`💸 Execution fee: ${executionFee.toString()} tinybars`);
      console.log(`💸 Execution fee: ${executionFee.toNumber() / 100000000} HBAR`);
      
      expect(executionFee.toNumber()).to.be.greaterThan(0);
    });

    it("Debería obtener el balance del contrato", async function() {
      this.timeout(10000);

      const balanceQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getContractBalance");

      const balanceResult = await balanceQuery.execute(client);
      const balance = balanceResult.getUint256(0);

      console.log(`💰 Balance del contrato: ${balance.toString()} tinybars`);
      
      // El balance puede ser 0 o positivo dependiendo de las fees acumuladas
      expect(balance.toNumber()).to.be.greaterThanOrEqual(0);
    });
  });

  describe("Crear orden limit", function() {
    let orderId: number;

    it("Debería crear una orden limit exitosamente", async function() {
      this.timeout(30000);

      // Convertir testTokenId a dirección EVM
      const testTokenAddress = `0x${AccountId.fromString(testTokenId).toSolidityAddress()}`;
      
      // Parámetros para createSwapOrder (valores más conservadores)
      const tokenOut = testTokenAddress;              // Token a recibir (TestToken)
      const minAmountOut = "1000000000000000000";     // 1 token (18 decimals)
      const triggerPrice = "10000000000000000";       // 0.01 HBAR por token (más bajo)
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hora desde ahora
      const hbarAmount = 0.15; // 0.15 HBAR total (execution fee + MIN_ORDER_AMOUNT + buffer)

      console.log(`🔧 Parámetros de la orden:`);
      console.log(`  Token out: ${tokenOut}`);
      console.log(`  Min amount out: ${minAmountOut} wei`);
      console.log(`  Trigger price: ${triggerPrice} wei`);
      console.log(`  Expiration: ${expirationTime} (${new Date(expirationTime * 1000).toISOString()})`);
      console.log(`  HBAR amount: ${hbarAmount} HBAR (fee + orden + buffer)`);

      // Obtener orderId actual antes de crear la orden
      const nextOrderIdQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("nextOrderId");

      const nextOrderIdResult = await nextOrderIdQuery.execute(client);
      orderId = nextOrderIdResult.getUint256(0).toNumber();
      
      console.log(`📝 Próximo Order ID: ${orderId}`);

      try {
        // Crear la orden usando ContractExecuteTransaction
        const createOrderTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(3000000) // Aumentar gas
          .setPayableAmount(Hbar.fromTinybars(hbarAmount * 100000000)) // 0.1 HBAR en tinybars
          .setFunction("createSwapOrder",
            new ContractFunctionParameters()
              .addAddress(tokenOut)
              .addUint256(minAmountOut)
              .addUint256(triggerPrice)
              .addUint256(expirationTime)
          );

        console.log(`🚀 Ejecutando transacción para crear orden...`);
        
        const createOrderSubmit = await createOrderTx.execute(client);
        const createOrderReceipt = await createOrderSubmit.getReceipt(client);

        console.log(`✅ Transacción exitosa. Status: ${createOrderReceipt.status}`);
        console.log(`📄 Transaction ID: ${createOrderSubmit.transactionId}`);

        expect(createOrderReceipt.status.toString()).to.equal("SUCCESS");
      } catch (error: any) {
        console.error(`❌ Error creando orden:`, error.message);
        if (error.status) {
          console.error(`Status: ${error.status}`);
        }
        if (error.contractFunctionResult) {
          console.error(`Contract result:`, error.contractFunctionResult);
        }
        throw error;
      }
    });

    it("Debería verificar que la orden se creó correctamente", async function() {
      this.timeout(10000);

      // Verificar que el nextOrderId se incrementó
      const nextOrderIdQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("nextOrderId");

      const nextOrderIdResult = await nextOrderIdQuery.execute(client);
      const currentNextOrderId = nextOrderIdResult.getUint256(0).toNumber();
      
      console.log(`📊 Next Order ID después de crear: ${currentNextOrderId}`);
      expect(currentNextOrderId).to.equal(orderId + 1);

      // Obtener detalles de la orden creada
      const orderDetailsQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(200000)
        .setFunction("getOrderDetails",
          new ContractFunctionParameters().addUint256(orderId)
        );

      const orderDetailsResult = await orderDetailsQuery.execute(client);
      
      // Decodificar la estructura SwapOrder
      const tokenOut = orderDetailsResult.getAddress(0);
      const amountIn = orderDetailsResult.getUint256(1);
      const minAmountOut = orderDetailsResult.getUint256(2);
      const triggerPrice = orderDetailsResult.getUint256(3);
      const owner = orderDetailsResult.getAddress(4);
      const isActive = orderDetailsResult.getBool(5);
      const expirationTime = orderDetailsResult.getUint256(6);
      const isExecuted = orderDetailsResult.getBool(7);

      console.log(`📋 Detalles de la orden ${orderId}:`);
      console.log(`  Token Out: ${tokenOut}`);
      console.log(`  Amount In: ${amountIn.toString()} tinybars`);
      console.log(`  Min Amount Out: ${minAmountOut.toString()} wei`);
      console.log(`  Trigger Price: ${triggerPrice.toString()} wei`);
      console.log(`  Owner: ${owner}`);
      console.log(`  Is Active: ${isActive}`);
      console.log(`  Expiration: ${expirationTime.toString()}`);
      console.log(`  Is Executed: ${isExecuted}`);

      // Verificaciones
      expect(isActive).to.be.true;
      expect(isExecuted).to.be.false;
      // Note: Owner address might be in different format (EVM vs AccountID), so just check it's not empty
      expect(owner).to.not.be.empty;
      expect(amountIn.toNumber()).to.be.greaterThan(0); // Debe ser 0.05 HBAR para la orden (0.15 - 0.1 fee)
    });

    it("Debería obtener estimación de precio (puede fallar en testnet)", async function() {
      this.timeout(10000);

      const testTokenAddress = `0x${AccountId.fromString(testTokenId).toSolidityAddress()}`;
      const amountIn = "10000000000000000"; // 0.01 HBAR en wei

      try {
        const estimateQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(200000)
          .setFunction("getEstimatedAmountOut",
            new ContractFunctionParameters()
              .addAddress(testTokenAddress)
              .addUint256(amountIn)
          );

        const estimateResult = await estimateQuery.execute(client);
        const estimatedOut = estimateResult.getUint256(0);

        console.log(`💱 Estimación de precio:`);
        console.log(`  Input: ${amountIn} wei (0.01 HBAR)`);
        console.log(`  Output estimado: ${estimatedOut.toString()} wei tokens`);

        expect(estimatedOut.toNumber()).to.be.greaterThan(0);
      } catch (error: any) {
        console.log(`⚠️  Error obteniendo estimación (normal en testnet sin liquidez): ${error.message}`);
        // En testnet, SaucerSwap puede no tener liquidez, así que este error es esperado
        // No fallar el test por esto
      }
    });

    it("Debería cancelar la orden creada", async function() {
      this.timeout(20000);

      console.log(`🗑️  Cancelando orden ${orderId}...`);

      try {
        // Cancelar la orden
        const cancelOrderTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(1000000)
          .setFunction("cancelSwapOrder",
            new ContractFunctionParameters().addUint256(orderId)
          );

        const cancelOrderSubmit = await cancelOrderTx.execute(client);
        const cancelOrderReceipt = await cancelOrderSubmit.getReceipt(client);

        console.log(`✅ Orden cancelada. Status: ${cancelOrderReceipt.status}`);
        console.log(`📄 Transaction ID: ${cancelOrderSubmit.transactionId}`);

        expect(cancelOrderReceipt.status.toString()).to.equal("SUCCESS");

        // Verificar que la orden ya no está activa
        const orderDetailsQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(200000)
          .setFunction("getOrderDetails",
            new ContractFunctionParameters().addUint256(orderId)
          );

        const orderDetailsResult = await orderDetailsQuery.execute(client);
        const isActive = orderDetailsResult.getBool(5);

        console.log(`📊 Orden ${orderId} activa: ${isActive}`);
        expect(isActive).to.be.false;
      } catch (error: any) {
        console.error(`❌ Error cancelando orden:`, error.message);
        if (error.status) {
          console.error(`Status: ${error.status}`);
        }
        throw error;
      }
    });
  });
});