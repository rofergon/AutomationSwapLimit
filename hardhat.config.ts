import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Clave privada desde variables de entorno o una clave de ejemplo para testing
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Hedera Testnet (chainId: 296)
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: [PRIVATE_KEY],
      gas: 300000,
      gasPrice: 10000000000, // 10 gwei
    },
    // Hedera Mainnet (chainId: 295)
    hederaMainnet: {
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: [PRIVATE_KEY],
      gas: 300000,
      gasPrice: 10000000000, // 10 gwei
    },
    // Hedera Testnet local (si usas un nodo local)
    hederaLocal: {
      url: "http://localhost:7546",
      chainId: 298,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    // Para verificación de contratos (opcional)
    apiKey: {
      hederaTestnet: "abc", // No se requiere clave real para Hedera
      hederaMainnet: "abc",
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://testnet.hashio.io/api",
          browserURL: "https://hashscan.io/testnet"
        }
      },
      {
        network: "hederaMainnet",
        chainId: 295,
        urls: {
          apiURL: "https://mainnet.hashio.io/api",
          browserURL: "https://hashscan.io/mainnet"
        }
      }
    ]
  },
};

export default config;
