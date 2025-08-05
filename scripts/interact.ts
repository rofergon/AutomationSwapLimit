import { ethers } from "hardhat";

async function main() {
  // Dirección del contrato desplegado (debes reemplazar esto)
  const contractAddress = process.env.CONTRACT_ADDRESS || "";
  
  if (!contractAddress) {
    console.log("❌ Por favor, define CONTRACT_ADDRESS en el archivo .env");
    console.log("Ejemplo: CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890");
    process.exit(1);
  }
  
  console.log("🔗 Conectando al contrato HelloWorld...");
  console.log(`Dirección del contrato: ${contractAddress}`);
  
  // Obtener el contrato
  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const helloWorld = HelloWorld.attach(contractAddress);
  
  // Obtener información del contrato
  console.log("\n📖 Información actual del contrato:");
  
  try {
    const message = await helloWorld.getMessage();
    const owner = await helloWorld.getOwner();
    const counter = await helloWorld.getCounter();
    
    console.log(`- Mensaje: "${message}"`);
    console.log(`- Propietario: ${owner}`);
    console.log(`- Contador: ${counter}`);
    
    // Incrementar contador
    console.log("\n🔄 Incrementando contador...");
    const [signer] = await ethers.getSigners();
    const tx = await helloWorld.connect(signer).incrementCounter();
    await tx.wait();
    
    const newCounter = await helloWorld.getCounter();
    console.log(`✅ Contador incrementado a: ${newCounter}`);
    
    // Si eres el propietario, cambiar mensaje
    if (signer.address.toLowerCase() === owner.toLowerCase()) {
      console.log("\n📝 Cambiando mensaje (eres el propietario)...");
      const newMessage = `Mensaje actualizado en ${new Date().toLocaleString()}`;
      const tx2 = await helloWorld.connect(signer).setMessage(newMessage);
      await tx2.wait();
      
      const updatedMessage = await helloWorld.getMessage();
      console.log(`✅ Mensaje actualizado: "${updatedMessage}"`);
    } else {
      console.log(`\n⚠️  No eres el propietario, no puedes cambiar el mensaje`);
      console.log(`Tu dirección: ${signer.address}`);
      console.log(`Propietario: ${owner}`);
    }
    
  } catch (error) {
    console.error("❌ Error al interactuar con el contrato:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });