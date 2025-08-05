import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Hedera Testnet
    hederaTestnet: {
      url: process.env.TESTNET_RPC_URL || "https://testnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.TESTNET_CHAIN_ID || "296"),
      gas: 10000000, // 10M gas limit
      gasPrice: 370000000000, // 370 Gwei (mínimo requerido por Hedera)
    },
    // Hedera Mainnet
    hederaMainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.MAINNET_CHAIN_ID || "295"),
      gas: 10000000,
      gasPrice: 370000000000, // 370 Gwei (mínimo requerido por Hedera)
    },
    // Hedera Local Node (para desarrollo local)
    hederaLocal: {
      url: "http://127.0.0.1:7546",
      accounts: [
        "0x105d050185ccb907fba04dd92d8de9e32c18305e097ab41dadda21489a211524",
        "0x2e1d968b041d84dd120a5860cee60cd83f9374ef527ca86996317ada3d0d03e7"
      ],
      chainId: 298,
      gas: 10000000,
      gasPrice: 1000000000,
    },
  },
  // Configuración para verificación de contratos
  etherscan: {
    apiKey: {
      hederaTestnet: "test",
      hederaMainnet: "test",
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io/testnet",
        },
      },
      {
        network: "hederaMainnet", 
        chainId: 295,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io/mainnet",
        },
      },
    ],
  },
  // Configuración de sourcify para verificación automática
  sourcify: {
    enabled: true,
    apiUrl: "https://server-verify.hashscan.io",
    browserUrl: "https://hashscan.io",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};

export default config;