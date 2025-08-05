import { ethers } from "hardhat";
import { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractCreateTransaction, 
  ContractFunctionParameters,
  FileCreateTransaction,
  FileAppendTransaction,
  Hbar
} from "@hashgraph/sdk";
import Long from "long";
import * as fs from "fs";
import * as path from "path";

// Añadir referencia global para hre
declare var hre: any;

async function main() {
  console.log("🚀 Iniciando despliegue en Hedera...");

  // Determinar la red basada en la configuración de Hardhat
  const network = hre.network.name;
  console.log(`📡 Red seleccionada: ${network}`);

  // Forzar uso de ethers.js (método recomendado por la documentación oficial)
  if (network === "hederaLocal") {
    // Solo usar SDK nativo para red local
    await deployWithHederaSDK(network);
  } else {
    // Usar ethers.js para testnet y mainnet (método oficial recomendado)
    await deployWithEthers();
  }
}

/**
 * Despliegue usando el SDK nativo de Hedera
 */
async function deployWithHederaSDK(network: string) {
  console.log("🔧 Desplegando usando Hedera SDK nativo...");

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
    console.log("🪙 Desplegando TestToken...");
    const testTokenAddress = await deployTestTokenWithSDK(client);
    
    // 3. Desplegar AutoSwapLimit
    console.log("🔄 Desplegando AutoSwapLimit...");
    const autoSwapAddress = await deployAutoSwapLimitWithSDK(client);

    console.log("✅ Despliegue completado!");
    console.log(`📄 TestToken desplegado en: ${testTokenAddress}`);
    console.log(`📄 AutoSwapLimit desplegado en: ${autoSwapAddress}`);

    // Guardar direcciones en archivo
    const addresses = {
      network,
      testToken: testTokenAddress,
      autoSwapLimit: autoSwapAddress,
      deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, `../deployed-contracts-${network}.json`),
      JSON.stringify(addresses, null, 2)
    );

  } catch (error) {
    console.error("❌ Error durante el despliegue:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Despliegue usando ethers.js (para compatibilidad EVM)
 */
async function deployWithEthers() {
  console.log("🔧 Desplegando usando ethers.js (EVM compatible)...");

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Desplegando con cuenta: ${deployer.address}`);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Balance de la cuenta: ${ethers.formatEther(balance)} HBAR`);

  // 1. Desplegar TestToken
  console.log("🪙 Desplegando TestToken...");
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy(
    "Test Token",           // name
    "TEST",                 // symbol
    18,                     // decimals
    ethers.parseEther("1000000") // initial supply (1M tokens)
  );
  
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  console.log(`✅ TestToken desplegado en: ${testTokenAddress}`);

  // 2. Desplegar AutoSwapLimit
  console.log("🔄 Desplegando AutoSwapLimit...");
  
  // Direcciones del testnet para ethers.js deploy
  const SAUCERSWAP_ROUTER = process.env.SAUCERSWAP_TESTNET_ROUTER_EVM || "0x0000000000000000000000000000000000004b40";
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

  console.log(`📍 Constructor params: Router=${SAUCERSWAP_ROUTER}, WHBAR=${whbarAddress}, Backend=${backendAddress}`);

  const AutoSwapLimit = await ethers.getContractFactory("AutoSwapLimit");
  // NOTA: Si hay error aquí, primero recompile el contrato con: npx hardhat compile
  const autoSwapLimit = await AutoSwapLimit.deploy(
    SAUCERSWAP_ROUTER,  // _saucerSwapRouter
    whbarAddress,       // _weth
    backendAddress      // _backendExecutor
  );
  
  await autoSwapLimit.waitForDeployment();
  const autoSwapAddress = await autoSwapLimit.getAddress();
  console.log(`✅ AutoSwapLimit desplegado en: ${autoSwapAddress}`);

  // Guardar direcciones
  const network = hre.network.name;
  const addresses = {
    network,
    testToken: testTokenAddress,
    autoSwapLimit: autoSwapAddress,
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, `../deployed-contracts-${network}.json`),
    JSON.stringify(addresses, null, 2)
  );

  console.log("✅ Despliegue completado con ethers.js!");
}

/**
 * Desplegar TestToken usando Hedera SDK
 */
async function deployTestTokenWithSDK(client: Client): Promise<string> {
  // Leer bytecode compilado
  const contractPath = path.join(__dirname, "../artifacts/contracts/TestToken.sol/TestToken.json");
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const bytecode = contractJson.bytecode;

  // Crear archivo con el bytecode del contrato
  const fileCreateTx = new FileCreateTransaction()
    .setContents(bytecode)
    .setKeys([client.operatorPublicKey!])
    .setMaxTransactionFee(new Hbar(2));

  const fileCreateSubmit = await fileCreateTx.execute(client);
  const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
  const bytecodeFileId = fileCreateReceipt.fileId!;

  console.log(`📁 Archivo de bytecode creado: ${bytecodeFileId}`);

  // Crear contrato
  const contractCreateTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(2000000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addString("Test Token")              // name
        .addString("TEST")                    // symbol
        .addUint8(18)                        // decimals
        .addUint256(Long.fromString((1000000n * 10n ** 18n).toString())) // initial supply (1M tokens with 18 decimals)
    );

  const contractCreateSubmit = await contractCreateTx.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const contractId = contractCreateReceipt.contractId!;

  console.log(`✅ TestToken creado con ID: ${contractId}`);
  return contractId.toString();
}

/**
 * Desplegar AutoSwapLimit usando Hedera SDK
 */
async function deployAutoSwapLimitWithSDK(client: Client): Promise<string> {
  // Direcciones del testnet desde .env
  const SAUCERSWAP_ROUTER = process.env.SAUCERSWAP_TESTNET_ROUTER_EVM || "0x0000000000000000000000000000000000004b40";
  const WHBAR_TOKEN = process.env.WHBAR_TESTNET_TOKEN_ID || "0.0.15058";
  const BACKEND_EXECUTOR = process.env.HEDERA_ACCOUNT_ID;

  if (!BACKEND_EXECUTOR) {
    throw new Error("HEDERA_ACCOUNT_ID es requerido para el backend executor");
  }

  console.log(`📍 SaucerSwap Router: ${SAUCERSWAP_ROUTER}`);
  console.log(`📍 WHBAR Token ID: ${WHBAR_TOKEN}`);
  console.log(`📍 Backend Executor: ${BACKEND_EXECUTOR}`);

  // Convertir WHBAR Token ID a dirección EVM
  const whbarEvm = AccountId.fromString(WHBAR_TOKEN).toSolidityAddress();
  const whbarAddress = `0x${whbarEvm}`;
  const backendEvmAddress = AccountId.fromString(BACKEND_EXECUTOR).toSolidityAddress();
  const backendAddress = `0x${backendEvmAddress}`;

  console.log(`📍 WHBAR EVM Address: ${whbarAddress}`);
  console.log(`📍 Backend EVM Address: ${backendAddress}`);

  // Leer bytecode compilado
  const contractPath = path.join(__dirname, "../artifacts/contracts/AutoSwapLimit.sol/AutoSwapLimit.json");
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const bytecode = contractJson.bytecode;

  // Crear archivo con el bytecode del contrato
  const fileCreateTx = new FileCreateTransaction()
    .setContents(bytecode)
    .setKeys([client.operatorPublicKey!])
    .setMaxTransactionFee(new Hbar(2));

  const fileCreateSubmit = await fileCreateTx.execute(client);
  const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
  const bytecodeFileId = fileCreateReceipt.fileId!;

  console.log(`📁 Archivo de bytecode creado: ${bytecodeFileId}`);

  // Preparar parámetros del constructor
  const constructorParams = new ContractFunctionParameters()
    .addAddress(SAUCERSWAP_ROUTER)  // _saucerSwapRouter
    .addAddress(whbarAddress)       // _weth  
    .addAddress(backendAddress);    // _backendExecutor

  // Crear contrato con parámetros de constructor
  const contractCreateTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(3500000) // Incrementar gas para el constructor
    .setConstructorParameters(constructorParams);

  const contractCreateSubmit = await contractCreateTx.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const contractId = contractCreateReceipt.contractId!;

  console.log(`✅ AutoSwapLimit creado con ID: ${contractId}`);
  console.log(`📋 Router: ${SAUCERSWAP_ROUTER}`);
  console.log(`📋 WHBAR: ${whbarAddress}`);
  console.log(`📋 Backend: ${backendAddress}`);
  
  return contractId.toString();
}

// Manejar errores globales
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });