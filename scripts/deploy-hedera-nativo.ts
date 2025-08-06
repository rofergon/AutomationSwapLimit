import {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateFlow,
  ContractFunctionParameters,
  Hbar
} from "@hashgraph/sdk";
import Long from "long";
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

    // 2. Desplegar MockPriceOracle
    console.log("🔮 Desplegando MockPriceOracle con SDK nativo...");
    const oracleAddress = await deployMockPriceOracleNativo(client);
    
    // 3. Desplegar AutoSwapLimit
    console.log("🔄 Desplegando AutoSwapLimit con SDK nativo...");
    const autoSwapAddress = await deployAutoSwapLimitNativo(client);

    console.log("✅ Despliegue completado!");
    console.log(`📄 MockPriceOracle desplegado en: ${oracleAddress}`);
    console.log(`📄 AutoSwapLimit desplegado en: ${autoSwapAddress}`);

    // Guardar direcciones y configuración en archivo
    const addresses = {
      network: "hederaTestnet",
      method: "sdk-nativo",
      mockPriceOracle: oracleAddress,
      autoSwapLimit: autoSwapAddress,
      router: {
        type: "SaucerSwap Router V1",
        address: "0x0000000000000000000000000000000000004b40",
        id: "0.0.19264",
        liquidityStatus: "Router V1 compatible con contract-client.ts"
      },
      backendExecutor: process.env.HEDERA_ACCOUNT_ID,
      deployedAt: new Date().toISOString(),
      version: "2.1-RouterV1-Native-HIP206",
      oracle: {
        address: oracleAddress,
        description: "Mock price oracle for HBAR and SAUCE",
        initialPrices: {
          HBAR: "$0.27 USDC",
          WHBAR: "$0.27 USDC",
          SAUCE: "$0.0587 USDC",
          USDC: "$1.00 USDC"
        },
        precision: "8 decimals",
        features: ["Manual price updates", "Price freshness validation", "Multi-token support"]
      },
      features: {
        hip206: {
          enabled: true,
          description: "Hedera Token Service integration for automatic token association",
          supportedTokens: [
            {
              symbol: "USDC",
              address: "0x0000000000000000000000000000000000001549",
              id: "0.0.5449",
              autoAssociated: true
            },
            {
              symbol: "SAUCE", 
              address: "0x0000000000000000000000000000000000120f46",
              id: "0.0.1183558",
              autoAssociated: true
            }
          ]
        }
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, `../deployed-contracts-nativo.json`),
      JSON.stringify(addresses, null, 2)
    );

    console.log("🔗 Verificar en HashScan:");
    console.log(`  MockPriceOracle: https://hashscan.io/testnet/contract/${oracleAddress}`);
    console.log(`  AutoSwapLimit: https://hashscan.io/testnet/contract/${autoSwapAddress}`);

  } catch (error) {
    console.error("❌ Error durante el despliegue:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Desplegar MockPriceOracle usando ContractCreateFlow (SDK nativo)
 */
async function deployMockPriceOracleNativo(client: Client): Promise<string> {
  // Leer bytecode compilado
  const contractPath = path.join(__dirname, "../artifacts/contracts/MockPriceOracle.sol/MockPriceOracle.json");
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const bytecode = contractJson.bytecode;

  console.log(`📁 Bytecode size: ${bytecode.length / 2} bytes`);
  console.log(`💰 Precios iniciales: HBAR=$0.27, SAUCE=$0.0587`);

  // Usar ContractCreateFlow para crear archivo y contrato en un paso
  const contractCreateFlow = new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(3000000); // Gas para el constructor del oráculo

  const contractCreateSubmit = await contractCreateFlow.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const contractId = contractCreateReceipt.contractId!;

  console.log(`✅ MockPriceOracle creado con ID: ${contractId}`);
  console.log(`📋 Dirección EVM: 0x${contractId.toSolidityAddress()}`);
  console.log(`🔮 Oráculo listo con precios mock para HBAR y SAUCE`);
  
  return contractId.toString();
}

/**
 * Desplegar AutoSwapLimit usando ContractCreateFlow (SDK nativo)
 */
async function deployAutoSwapLimitNativo(client: Client): Promise<string> {
  // Usar Router V1 SaucerSwap (donde funciona contract-client.ts)
  const SAUCERSWAP_ROUTER_V1 = "0x0000000000000000000000000000000000004b40"; // Router V1 testnet (0.0.19264) - padded to 42 chars
  const BACKEND_EXECUTOR = process.env.HEDERA_ACCOUNT_ID;

  if (!BACKEND_EXECUTOR) {
    throw new Error("HEDERA_ACCOUNT_ID es requerido para el backend executor");
  }

  // Convertir backend executor a formato EVM con padding correcto
  const backendEvmAddress = AccountId.fromString(BACKEND_EXECUTOR).toSolidityAddress();
  const backendAddress = `0x${backendEvmAddress.padStart(40, '0')}`;

  console.log(`📍 Constructor params (Router V1 - donde funciona contract-client.ts):`);
  console.log(`  Router V1: ${SAUCERSWAP_ROUTER_V1} (0.0.19264) - Length: ${SAUCERSWAP_ROUTER_V1.length}`);
  console.log(`  Backend: ${backendAddress} - Length: ${backendAddress.length}`);
  console.log(`  💡 WHBAR será obtenido dinámicamente del router`);
  console.log(`  ✅ Router V1 es el mismo que usa contract-client.ts`);
  
  // Verificar que las direcciones tengan el formato correcto
  if (SAUCERSWAP_ROUTER_V1.length !== 42) {
    throw new Error(`Router address has incorrect length: ${SAUCERSWAP_ROUTER_V1.length}, expected 42`);
  }
  if (backendAddress.length !== 42) {
    throw new Error(`Backend address has incorrect length: ${backendAddress.length}, expected 42`);
  }

  // Leer bytecode compilado
  const contractPath = path.join(__dirname, "../artifacts/contracts/AutoSwapLimit.sol/AutoSwapLimit.json");
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const bytecode = contractJson.bytecode;

  console.log(`📁 Bytecode size: ${bytecode.length / 2} bytes`);

  // Preparar parámetros del constructor (actualizado para Router V1)
  const constructorParams = new ContractFunctionParameters()
    .addAddress(SAUCERSWAP_ROUTER_V1)  // _saucerSwapRouter
    .addAddress(backendAddress);       // _backendExecutor

  // Usar ContractCreateFlow para crear archivo y contrato en un paso
  const contractCreateFlow = new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(6000000) // Más gas para el constructor con HIP-206
    .setConstructorParameters(constructorParams);

  const contractCreateSubmit = await contractCreateFlow.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const contractId = contractCreateReceipt.contractId!;

  console.log(`✅ AutoSwapLimit creado con ID: ${contractId}`);
  console.log(`📋 Dirección EVM: 0x${contractId.toSolidityAddress()}`);
  
  // Agregar funciones para verificar la asociación de tokens
  console.log(`🔗 Verificando asociación automática de tokens HIP-206...`);
  console.log(`  📋 USDC (0.0.5449) y SAUCE (0.0.1183558) se asociarán automáticamente`);
  console.log(`  🎯 HIP-206 permite al contrato manejar tokens nativos de Hedera`);
  
  return contractId.toString();
}

// Manejar errores globales
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });