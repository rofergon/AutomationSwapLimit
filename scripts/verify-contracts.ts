import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔍 Iniciando verificación de contratos en Hedera testnet...");

  // Leer direcciones de contratos desplegados
  const deployedContractsPath = path.join(__dirname, "../deployed-contracts-hederaTestnet.json");
  
  if (!fs.existsSync(deployedContractsPath)) {
    throw new Error("No se encontró el archivo deployed-contracts-hederaTestnet.json");
  }

  const deployedContracts = JSON.parse(fs.readFileSync(deployedContractsPath, "utf8"));
  
  console.log("📋 Contratos a verificar:");
  console.log(`  TestToken: ${deployedContracts.testToken}`);
  console.log(`  AutoSwapLimit: ${deployedContracts.autoSwapLimit}`);

  try {
    // Verificar TestToken
    console.log("\n🪙 Verificando TestToken...");
    await run("verify:verify", {
      address: deployedContracts.testToken,
      constructorArguments: [
        "Test Token",           // name
        "TEST",                 // symbol
        18,                     // decimals
        "1000000000000000000000000" // initial supply (1M tokens with 18 decimals)
      ],
      network: "hederaTestnet"
    });
    console.log("✅ TestToken verificado exitosamente!");

    // Verificar AutoSwapLimit
    console.log("\n🔄 Verificando AutoSwapLimit...");
    
    // Parámetros del constructor (mismos que en deploy)
    const SAUCERSWAP_ROUTER = process.env.SAUCERSWAP_TESTNET_ROUTER_EVM || "0x0000000000000000000000000000000000004b40";
    const WHBAR_TOKEN = process.env.WHBAR_TESTNET_TOKEN_ID || "0.0.15058";
    const BACKEND_EXECUTOR = process.env.HEDERA_ACCOUNT_ID;

    if (!BACKEND_EXECUTOR) {
      throw new Error("HEDERA_ACCOUNT_ID es requerido en .env");
    }

    // Convertir WHBAR Token ID a dirección EVM
    const { AccountId } = await import("@hashgraph/sdk");
    const whbarEvm = AccountId.fromString(WHBAR_TOKEN).toSolidityAddress();
    const whbarAddress = `0x${whbarEvm}`;
    const backendEvmAddress = AccountId.fromString(BACKEND_EXECUTOR).toSolidityAddress();
    const backendAddress = `0x${backendEvmAddress}`;

    await run("verify:verify", {
      address: deployedContracts.autoSwapLimit,
      constructorArguments: [
        SAUCERSWAP_ROUTER,  // _saucerSwapRouter
        whbarAddress,       // _weth
        backendAddress      // _backendExecutor
      ],
      network: "hederaTestnet"
    });
    console.log("✅ AutoSwapLimit verificado exitosamente!");

  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  El contrato ya está verificado");
    } else {
      console.error("❌ Error durante la verificación:", error.message);
      
      // Si falla la verificación automática, proporcionar instrucciones manuales
      console.log("\n📝 Verificación manual recomendada:");
      console.log("1. Ve a https://hashscan.io/testnet");
      console.log("2. Busca tu contrato por dirección");
      console.log("3. Haz clic en 'Verify' en la sección Contract Bytecode");
      console.log("4. Sube el archivo build-info JSON más reciente de artifacts/build-info/");
      console.log("5. Para Hardhat solo necesitas el archivo JSON de build-info");
    }
  }

  console.log("\n🎉 Proceso de verificación completado!");
  console.log("\n🔗 Enlaces para verificar en HashScan:");
  console.log(`  TestToken: https://hashscan.io/testnet/contract/${deployedContracts.testToken}`);
  console.log(`  AutoSwapLimit: https://hashscan.io/testnet/contract/${deployedContracts.autoSwapLimit}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });