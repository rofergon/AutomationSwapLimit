import {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateFlow,
  ContractFunctionParameters,
  Hbar
} from "@hashgraph/sdk";
import * as fs from "fs";
import * as path from "path";

// Añadir referencia global para hre
declare var hre: any;

async function main() {
  console.log("🚀 Desplegando contratos usando SDK NATIVO de Hedera...");
  console.log("📡 Esto garantiza que el bytecode sea visible en HashScan");

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
    // 1. Compilar contratos
    console.log("📦 Compilando contratos...");
    await hre.run("compile");

    // 2. Desplegar TestToken
    console.log("🪙 Desplegando TestToken con SDK nativo...");
    const testTokenAddress = await deployTestTokenNativo(client);
    
    // 3. Desplegar AutoSwapLimit
    console.log("🔄 Desplegando AutoSwapLimit con SDK nativo...");
    const autoSwapAddress = await deployAutoSwapLimitNativo(client);

    console.log("✅ Despliegue completado!");
    console.log(`📄 TestToken desplegado en: ${testTokenAddress}`);
    console.log(`📄 AutoSwapLimit desplegado en: ${autoSwapAddress}`);

    // Guardar direcciones en archivo
    const addresses = {
      network: "hederaTestnet",
      method: "sdk-nativo",
      testToken: testTokenAddress,
      autoSwapLimit: autoSwapAddress,
      deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, `../deployed-contracts-nativo.json`),
      JSON.stringify(addresses, null, 2)
    );

    console.log("🔗 Verificar en HashScan:");
    console.log(`  TestToken: https://hashscan.io/testnet/contract/${testTokenAddress}`);
    console.log(`  AutoSwapLimit: https://hashscan.io/testnet/contract/${autoSwapAddress}`);

  } catch (error) {
    console.error("❌ Error durante el despliegue:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Desplegar TestToken usando ContractCreateFlow (SDK nativo)
 */
async function deployTestTokenNativo(client: Client): Promise<string> {
  // Leer bytecode compilado
  const contractPath = path.join(__dirname, "../artifacts/contracts/TestToken.sol/TestToken.json");
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const bytecode = contractJson.bytecode;

  console.log(`📁 Bytecode size: ${bytecode.length / 2} bytes`);

  // Usar ContractCreateFlow para crear archivo y contrato en un paso
  const contractCreateFlow = new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(2000000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addString("Test Token")              // name
        .addString("TEST")                    // symbol
        .addUint8(18)                        // decimals
        .addUint256("1000000000000000000000000") // initial supply (1M tokens with 18 decimals)
    );

  const contractCreateSubmit = await contractCreateFlow.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const contractId = contractCreateReceipt.contractId!;

  console.log(`✅ TestToken creado con ID: ${contractId}`);
  console.log(`📋 Dirección EVM: 0x${contractId.toSolidityAddress()}`);
  
  return contractId.toString();
}

/**
 * Desplegar AutoSwapLimit usando ContractCreateFlow (SDK nativo)
 */
async function deployAutoSwapLimitNativo(client: Client): Promise<string> {
  // Direcciones del testnet
  const SAUCERSWAP_ROUTER = process.env.SAUCERSWAP_TESTNET_ROUTER_EVM || "0x0000000000000000000000000000000000159398";
  const WHBAR_TOKEN = process.env.WHBAR_TESTNET_TOKEN_ID || "0.0.15058";
  const BACKEND_EXECUTOR = process.env.HEDERA_ACCOUNT_ID;

  if (!BACKEND_EXECUTOR) {
    throw new Error("HEDERA_ACCOUNT_ID es requerido para el backend executor");
  }

  // Convertir direcciones a formato EVM
  const whbarEvm = AccountId.fromString(WHBAR_TOKEN).toSolidityAddress();
  const whbarAddress = `0x${whbarEvm}`;
  const backendEvmAddress = AccountId.fromString(BACKEND_EXECUTOR).toSolidityAddress();
  const backendAddress = `0x${backendEvmAddress}`;

  console.log(`📍 Constructor params:`);
  console.log(`  Router: ${SAUCERSWAP_ROUTER}`);
  console.log(`  WHBAR: ${whbarAddress}`);
  console.log(`  Backend: ${backendAddress}`);

  // Leer bytecode compilado
  const contractPath = path.join(__dirname, "../artifacts/contracts/AutoSwapLimit.sol/AutoSwapLimit.json");
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const bytecode = contractJson.bytecode;

  console.log(`📁 Bytecode size: ${bytecode.length / 2} bytes`);

  // Preparar parámetros del constructor
  const constructorParams = new ContractFunctionParameters()
    .addAddress(SAUCERSWAP_ROUTER)  // _saucerSwapRouter
    .addAddress(whbarAddress)       // _weth  
    .addAddress(backendAddress);    // _backendExecutor

  // Usar ContractCreateFlow para crear archivo y contrato en un paso
  const contractCreateFlow = new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(4000000) // Más gas para el constructor complejo
    .setConstructorParameters(constructorParams);

  const contractCreateSubmit = await contractCreateFlow.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const contractId = contractCreateReceipt.contractId!;

  console.log(`✅ AutoSwapLimit creado con ID: ${contractId}`);
  console.log(`📋 Dirección EVM: 0x${contractId.toSolidityAddress()}`);
  
  return contractId.toString();
}

// Manejar errores globales
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });