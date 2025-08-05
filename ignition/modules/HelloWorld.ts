import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HelloWorldModule = buildModule("HelloWorldModule", (m) => {
  // Mensaje inicial para el contrato
  const initialMessage = m.getParameter("initialMessage", "Hola Hedera! Este es mi primer contrato");
  
  // Desplegar el contrato HelloWorld
  const helloWorld = m.contract("HelloWorld", [initialMessage]);

  return { helloWorld };
});

export default HelloWorldModule;