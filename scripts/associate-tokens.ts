import {
  Client,
  AccountId,
  PrivateKey,
  TokenAssociateTransaction,
  TokenId,
  Hbar
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔗 Asociando cuenta con tokens necesarios...");

  // Configurar cliente de Hedera
  const client = Client.forTestnet();
  
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.PRIVATE_KEY) {
    throw new Error("HEDERA_ACCOUNT_ID y PRIVATE_KEY son requeridos en .env");
  }

  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);
  client.setOperator(accountId, privateKey);

  try {
    // Tokens a asociar
    const tokensToAssociate = [
      {
        name: "SAUCE (SaucerSwap Token)",
        id: process.env.TESTNET_SAUCE_TOKEN_ID || "0.0.1183558"
      },
      {
        name: "WHBAR (Wrapped HBAR)",
        id: process.env.WHBAR_TESTNET_TOKEN_ID || "0.0.15058"
      }
    ];

    console.log(`👤 Cuenta: ${accountId.toString()}`);
    console.log(`📋 Tokens a asociar:`);
    
    for (const token of tokensToAssociate) {
      console.log(`  - ${token.name}: ${token.id}`);
    }

    // Crear array de TokenIds
    const tokenIds = tokensToAssociate.map(token => TokenId.fromString(token.id));

    // Crear transacción de asociación
    const transaction = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds(tokenIds);

    console.log(`\n🚀 Ejecutando asociación de tokens...`);
    
    // Ejecutar transacción
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    console.log(`✅ Asociación exitosa!`);
    console.log(`📄 Transaction ID: ${txResponse.transactionId}`);
    console.log(`📊 Status: ${receipt.status}`);
    console.log(`🔗 Ver en HashScan: https://hashscan.io/testnet/transaction/${txResponse.transactionId}`);

    console.log(`\n🎯 Ahora tu cuenta puede recibir estos tokens:`);
    for (const token of tokensToAssociate) {
      console.log(`  ✅ ${token.name} (${token.id})`);
    }

    console.log(`\n💡 Próximo paso: Ejecutar el test nuevamente`);
    console.log(`   npm run test:real-pool`);

  } catch (error: any) {
    if (error.status && error.status.toString().includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
      console.log(`✅ Los tokens ya están asociados con tu cuenta!`);
      console.log(`💡 El problema puede ser otro - continuemos investigando...`);
    } else {
      console.error("❌ Error durante la asociación:", error);
      throw error;
    }
  } finally {
    client.close();
  }
}

main()
  .then(() => {
    console.log("🏁 Proceso de asociación completado");
  })
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });