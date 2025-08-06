import { ethers } from "hardhat";

async function main() {
    console.log("🧪 Testing Oracle Integration with AutoSwapLimit...");
    
    // Note: This script demonstrates how the oracle would integrate with AutoSwapLimit
    // It shows the expected flow without requiring actual deployed contracts
    
    const [deployer] = await ethers.getSigners();
    console.log("🔍 Testing from account:", deployer.address);
    
    // Deploy Oracle first
    console.log("\n1️⃣ Deploying MockPriceOracle...");
    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    const oracle = await MockPriceOracle.deploy();
    await oracle.waitForDeployment();
    
    const oracleAddress = await oracle.getAddress();
    console.log("✅ Oracle deployed to:", oracleAddress);
    
    // Test token addresses (Hedera Testnet)
    const HBAR_ADDRESS = "0x0000000000000000000000000000000000000000";
    const SAUCE_ADDRESS = "0x0000000000000000000000000000000000120f46";
    const USDC_ADDRESS = "0x00000000000000000000000000000000000014F5";
    
    console.log("\n2️⃣ Testing Price Oracle Functions...");
    
    // Get initial prices
    console.log("\n📊 Initial Prices:");
    const [hbarPrice] = await oracle.getPrice(HBAR_ADDRESS);
    const [saucePrice] = await oracle.getPrice(SAUCE_ADDRESS);
    const [usdcPrice] = await oracle.getPrice(USDC_ADDRESS);
    
    console.log("- HBAR:", await oracle.formatPrice(hbarPrice));
    console.log("- SAUCE:", await oracle.formatPrice(saucePrice));
    console.log("- USDC:", await oracle.formatPrice(usdcPrice));
    
    // Test price updates
    console.log("\n3️⃣ Testing Price Updates...");
    
    // Update HBAR price to $0.30
    const newHbarPrice = 30000000; // $0.30 with 8 decimals
    await oracle.updatePrice(HBAR_ADDRESS, newHbarPrice);
    console.log("✅ Updated HBAR price to $0.30");
    
    // Update SAUCE price to $0.065
    const newSaucePrice = 6500000; // $0.065 with 8 decimals
    await oracle.updatePrice(SAUCE_ADDRESS, newSaucePrice);
    console.log("✅ Updated SAUCE price to $0.065");
    
    // Verify updates
    const [updatedHbarPrice] = await oracle.getPrice(HBAR_ADDRESS);
    const [updatedSaucePrice] = await oracle.getPrice(SAUCE_ADDRESS);
    
    console.log("\n📈 Updated Prices:");
    console.log("- HBAR:", await oracle.formatPrice(updatedHbarPrice));
    console.log("- SAUCE:", await oracle.formatPrice(updatedSaucePrice));
    
    console.log("\n4️⃣ Testing Integration Scenarios...");
    
    // Scenario 1: Check if SAUCE price reaches trigger
    const triggerPrice = 6000000; // $0.06 trigger
    const currentSaucePrice = updatedSaucePrice;
    
    console.log(`\n🎯 Scenario 1: SAUCE Limit Order`);
    console.log(`- Trigger Price: ${await oracle.formatPrice(triggerPrice)}`);
    console.log(`- Current Price: ${await oracle.formatPrice(currentSaucePrice)}`);
    console.log(`- Can Execute: ${currentSaucePrice >= triggerPrice ? "YES ✅" : "NO ❌"}`);
    
    // Scenario 2: HBAR price movement
    console.log(`\n🎯 Scenario 2: HBAR Limit Order`);
    const hbarTrigger = 28000000; // $0.28 trigger
    console.log(`- Trigger Price: ${await oracle.formatPrice(hbarTrigger)}`);
    console.log(`- Current Price: ${await oracle.formatPrice(updatedHbarPrice)}`);
    console.log(`- Can Execute: ${updatedHbarPrice >= hbarTrigger ? "YES ✅" : "NO ❌"}`);
    
    console.log("\n5️⃣ Testing Multiple Price Updates...");
    
    // Batch price update
    const tokens = [HBAR_ADDRESS, SAUCE_ADDRESS];
    const prices = [32000000, 7000000]; // $0.32 and $0.07
    
    await oracle.updatePrices(tokens, prices);
    console.log("✅ Batch updated prices");
    
    // Verify batch update
    const [finalHbarPrice] = await oracle.getPrice(HBAR_ADDRESS);
    const [finalSaucePrice] = await oracle.getPrice(SAUCE_ADDRESS);
    
    console.log("\n📊 Final Prices:");
    console.log("- HBAR:", await oracle.formatPrice(finalHbarPrice));
    console.log("- SAUCE:", await oracle.formatPrice(finalSaucePrice));
    
    console.log("\n6️⃣ Testing Price Freshness...");
    
    // Check if prices are fresh
    const hbarFresh = await oracle.isPriceFresh(HBAR_ADDRESS);
    const sauceFresh = await oracle.isPriceFresh(SAUCE_ADDRESS);
    
    console.log("- HBAR price fresh:", hbarFresh ? "YES ✅" : "NO ❌");
    console.log("- SAUCE price fresh:", sauceFresh ? "YES ✅" : "NO ❌");
    
    // Get price ages
    const hbarAge = await oracle.getPriceAge(HBAR_ADDRESS);
    const sauceAge = await oracle.getPriceAge(SAUCE_ADDRESS);
    
    console.log("- HBAR price age:", hbarAge.toString(), "seconds");
    console.log("- SAUCE price age:", sauceAge.toString(), "seconds");
    
    console.log("\n7️⃣ Integration Summary...");
    
    console.log(`
📋 Oracle Integration Guide for AutoSwapLimit:

1. Deploy Oracle Contract:
   - Address: ${oracleAddress}
   - Owner: ${await oracle.owner()}

2. Add Oracle to AutoSwapLimit:
   - Modify executeSwapOrder() to call oracle.getPrice()
   - Verify currentPrice parameter against oracle
   - Add price freshness checks

3. Price Update Workflow:
   - Backend service calls oracle.updatePrice()
   - Prices updated before executing orders
   - Multiple prices can be updated in batch

4. Example Integration Code:

   // In AutoSwapLimit.executeSwapOrder()
   function executeSwapOrder(uint256 orderId) external {
       // Get current price from oracle
       (uint256 oraclePrice, ) = priceOracle.getPrice(order.tokenOut);
       
       // Verify price is fresh
       require(priceOracle.isPriceFresh(order.tokenOut), "Price too old");
       
       // Check trigger condition
       require(oraclePrice >= order.triggerPrice, "Price below trigger");
       
       // Continue with swap execution...
   }

5. Price Management:
   - Update prices via oracle.updatePrice(token, newPrice)
   - Prices use 8 decimal precision
   - Maximum 24-hour price age allowed
    `);
    
    console.log("🎉 Oracle Integration Testing Completed!");
    
    // Return oracle address for use in other scripts
    return {
        oracleAddress,
        owner: await oracle.owner(),
        supportedTokens: await oracle.getSupportedTokens()
    };
}

main()
    .then((result) => {
        console.log("\n✅ Test completed with results:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });