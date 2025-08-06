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

// Añadir referencia global para hre
declare var hre: any;

async function main() {
  console.log("🧪 Probando asociación de tokens HIP-206 en AutoSwapLimit...");

  // Configurar cliente de Hedera
  const client = Client.forTestnet();
  
  if (process.env.HEDERA_ACCOUNT_ID && process.env.PRIVATE_KEY) {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
    client.setOperator(accountId, privateKey);
  } else {
    throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
  }

  try {
    // Leer direcciones desplegadas
    const deployedPath = path.join(__dirname, "../deployed-contracts-nativo.json");
    if (!fs.existsSync(deployedPath)) {
      throw new Error("No se encontró el archivo deployed-contracts-nativo.json. Ejecuta el deploy primero.");
    }
    
    const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
    const contractId = deployed.autoSwapLimit;
    
    console.log(`📋 Contrato AutoSwapLimit: ${contractId}`);
    console.log(`🔗 Verificando funciones HIP-206...`);

    // 1. Verificar tokens soportados
    console.log("\n📊 1. Consultando tokens soportados...");
    await checkSupportedTokens(client, contractId);

    // 2. Verificar estado de asociación
    console.log("\n🔍 2. Verificando estado de tokens...");
    await checkTokenStatus(client, contractId);

    // 3. Obtener configuración del contrato
    console.log("\n⚙️ 3. Obteniendo configuración del contrato...");
    await getContractConfig(client, contractId);

    console.log("\n✅ Prueba de asociación HIP-206 completada!");

  } catch (error) {
    console.error("❌ Error durante la prueba:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Verificar tokens soportados por el contrato
 */
async function checkSupportedTokens(client: Client, contractId: string): Promise<void> {
  try {
    // Obtener lista de tokens soportados
    const supportedTokensQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getSupportedTokens");

    const supportedTokensResult = await supportedTokensQuery.execute(client);
    const supportedTokens = supportedTokensResult.getAddress(0);
    
    console.log(`  📋 Tokens soportados encontrados: ${supportedTokens ? supportedTokens.length : 0}`);

    // Obtener count de tokens soportados
    const countQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getSupportedTokenCount");

    const countResult = await countQuery.execute(client);
    const count = countResult.getUint256(0);
    
    console.log(`  🔢 Count de tokens soportados: ${count.toString()}`);

    // Verificar tokens específicos
    await checkSpecificToken(client, contractId, "0x0000000000000000000000000000000000001549", "USDC");
    await checkSpecificToken(client, contractId, "0x0000000000000000000000000000000000120f46", "SAUCE");

  } catch (error) {
    console.error("  ❌ Error consultando tokens soportados:", error);
  }
}

/**
 * Verificar un token específico
 */
async function checkSpecificToken(client: Client, contractId: string, tokenAddress: string, tokenName: string): Promise<void> {
  try {
    const tokenSupportedQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("isTokenSupported", new ContractFunctionParameters().addAddress(tokenAddress));

    const result = await tokenSupportedQuery.execute(client);
    const isSupported = result.getBool(0);
    
    console.log(`  ${isSupported ? '✅' : '❌'} ${tokenName} (${tokenAddress}): ${isSupported ? 'Soportado' : 'No soportado'}`);

  } catch (error) {
    console.error(`  ❌ Error verificando ${tokenName}:`, error);
  }
}

/**
 * Verificar estado general de tokens
 */
async function checkTokenStatus(client: Client, contractId: string): Promise<void> {
  try {
    // Obtener tokens disponibles
    const availableTokensQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getAvailableTokens");

    const result = await availableTokensQuery.execute(client);
    
    console.log(`  📋 Función getAvailableTokens ejecutada correctamente`);
    
    // Nota: Los resultados específicos dependen de cómo esté estructurada la función
    // En este caso solo verificamos que la función sea llamable

  } catch (error) {
    console.error("  ❌ Error consultando tokens disponibles:", error);
  }
}

/**
 * Obtener configuración del contrato
 */
async function getContractConfig(client: Client, contractId: string): Promise<void> {
  try {
    const configQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getContractConfig");

    const result = await configQuery.execute(client);
    
    console.log(`  ⚙️ Configuración del contrato obtenida correctamente`);
    
    // Obtener información específica
    const executionFee = result.getUint256(0);
    const minOrderAmount = result.getUint256(1);
    const nextOrderId = result.getUint256(3);
    
    console.log(`  💰 Execution Fee: ${executionFee.toString()} tinybars`);
    console.log(`  📏 Min Order Amount: ${minOrderAmount.toString()} tinybars`);
    console.log(`  🆔 Next Order ID: ${nextOrderId.toString()}`);

  } catch (error) {
    console.error("  ❌ Error obteniendo configuración:", error);
  }
}

// Manejar errores globales
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });