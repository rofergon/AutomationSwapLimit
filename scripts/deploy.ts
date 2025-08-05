import { ethers } from "hardhat";

async function main() {
  console.log("Iniciando despliegue en Hedera...");
  
  // Obtener la red actual
  const network = await ethers.provider.getNetwork();
  console.log(`Red: ${network.name} (chainId: ${network.chainId})`);
  
  // Obtener el deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Desplegando con cuenta: ${deployer.address}`);
  
  // Verificar balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance de la cuenta: ${ethers.formatEther(balance)} HBAR`);
  
  // Mensaje inicial
  const initialMessage = "¡Hola Hedera! Este es mi primer contrato inteligente";
  
  // Desplegar HelloWorld
  console.log("\nDesplegando HelloWorld...");
  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const helloWorld = await HelloWorld.deploy(initialMessage);
  
  await helloWorld.waitForDeployment();
  const helloWorldAddress = await helloWorld.getAddress();
  
  console.log(`✅ HelloWorld desplegado en: ${helloWorldAddress}`);
  
  // Verificar que el contrato funciona
  console.log("\nVerificando el contrato...");
  const message = await helloWorld.getMessage();
  const owner = await helloWorld.getOwner();
  const counter = await helloWorld.getCounter();
  
  console.log(`Mensaje: "${message}"`);
  console.log(`Propietario: ${owner}`);
  console.log(`Contador: ${counter}`);
  
  // Incrementar contador como prueba
  console.log("\nProbando funcionalidad...");
  const tx = await helloWorld.incrementCounter();
  await tx.wait();
  
  const newCounter = await helloWorld.getCounter();
  console.log(`Nuevo contador: ${newCounter}`);
  
  console.log("\n🎉 Despliegue completado exitosamente!");
  console.log(`\n📋 Resumen del despliegue:`);
  console.log(`- Red: ${network.name} (chainId: ${network.chainId})`);
  console.log(`- Contrato: HelloWorld`);
  console.log(`- Dirección: ${helloWorldAddress}`);
  console.log(`- Deployer: ${deployer.address}`);
  console.log(`- Hash de transacción: ${helloWorld.deploymentTransaction()?.hash}`);
  
  // Información adicional según la red
  if (network.chainId === 296n) {
    console.log(`\n🔍 Explorar en HashScan Testnet:`);
    console.log(`https://hashscan.io/testnet/contract/${helloWorldAddress}`);
  } else if (network.chainId === 295n) {
    console.log(`\n🔍 Explorar en HashScan Mainnet:`);
    console.log(`https://hashscan.io/mainnet/contract/${helloWorldAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error durante el despliegue:", error);
    process.exit(1);
  });