// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for SaucerSwap Router
interface ISaucerSwapRouter {
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
    
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

/**
 * @title AutoSwapLimit
 * @dev Automation contract for limit swaps using SaucerSwap on Hedera
 * Users deposit HBAR and create limit orders that can be executed by authorized executors or anyone
 */
contract AutoSwapLimit is Ownable, ReentrancyGuard {
    
    struct SwapOrder {
        address tokenOut;       // Token to receive from swap
        uint256 amountIn;       // Amount of HBAR deposited
        uint256 minAmountOut;   // Minimum amount of tokens to receive
        uint256 triggerPrice;   // Price that triggers the swap (token price in terms of HBAR)
        address owner;          // Order owner
        bool isActive;          // Whether the order is active
        uint256 expirationTime; // Expiration time
        bool isExecuted;        // Whether the order was executed
    }
    
    // SaucerSwap Router and WETH addresses (Testnet)
    ISaucerSwapRouter public immutable saucerSwapRouter;
    address public immutable WETH; // WHBAR token address
    
    // Common tokens for routing (Testnet addresses - these need to be verified)
    // Note: These addresses should be updated with actual testnet token addresses
    address public constant USDC = 0x000000000000000000000000000000000001E7Be; // USDC testnet (placeholder)
    address public constant USDT = 0x000000000000000000000000000000000001E7AE; // USDT testnet (placeholder)
    
    // Mappings for orders
    mapping(uint256 => SwapOrder) public swapOrders;
    mapping(address => uint256[]) public userOrders;
    
    // Executor management
    mapping(address => bool) public authorizedExecutors;
    address[] public executorList;
    
    uint256 public nextOrderId = 1;
    uint256 public executionFee = 10000000; // 0.1 HBAR in tinybars (flexible for Hedera)
    uint256 public constant MIN_ORDER_AMOUNT = 1000000; // 0.01 HBAR minimum order
    
    // Execution modes
    bool public publicExecutionEnabled = true; // Allow anyone to execute orders
    
    // Backend executor address (primary executor)
    address public backendExecutor;
    
    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed user,
        address tokenOut,
        uint256 amountIn,
        uint256 triggerPrice
    );
    
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed executor,
        uint256 amountOut,
        uint256 executionPrice
    );
    
    event OrderCancelled(uint256 indexed orderId, address indexed user);
    
    event BackendExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    
    event ExecutionFeeUpdated(uint256 indexed oldFee, uint256 indexed newFee);
    
    event ExecutorAdded(address indexed executor);
    
    event ExecutorRemoved(address indexed executor);
    
    event PublicExecutionToggled(bool enabled);
    
    modifier onlyOrderOwner(uint256 orderId) {
        require(swapOrders[orderId].owner == msg.sender, "You are not the owner of this order");
        _;
    }
    
    modifier onlyActiveOrder(uint256 orderId) {
        require(swapOrders[orderId].isActive, "Order not active");
        require(!swapOrders[orderId].isExecuted, "Order already executed");
        require(block.timestamp < swapOrders[orderId].expirationTime, "Order expired");
        _;
    }
    
    modifier onlyAuthorizedExecutor() {
        require(
            publicExecutionEnabled || 
            authorizedExecutors[msg.sender] || 
            msg.sender == backendExecutor || 
            msg.sender == owner(), 
            "Not authorized to execute orders"
        );
        _;
    }
    
    constructor(address _saucerSwapRouter, address _weth, address _backendExecutor) Ownable(msg.sender) {
        require(_saucerSwapRouter != address(0), "Router address cannot be zero");
        require(_weth != address(0), "WETH address cannot be zero");
        require(_backendExecutor != address(0), "Backend executor cannot be zero");
        
        saucerSwapRouter = ISaucerSwapRouter(_saucerSwapRouter);
        WETH = _weth;
        backendExecutor = _backendExecutor;
        
        // Add backend executor to authorized list
        authorizedExecutors[_backendExecutor] = true;
        executorList.push(_backendExecutor);
    }
    
    /**
     * @dev Create a new automatic swap order from HBAR to token
     * @param tokenOut Address of the token to receive
     * @param minAmountOut Minimum amount of tokens to receive
     * @param triggerPrice Price that triggers the swap (token price in HBAR)
     * @param expirationTime Order expiration time
     */
    function createSwapOrder(
        address tokenOut,
        uint256 minAmountOut,
        uint256 triggerPrice,
        uint256 expirationTime
    ) external payable {
        require(msg.value > executionFee, "Insufficient HBAR: must exceed execution fee");
        require(minAmountOut > 0, "Minimum amount must be greater than 0");
        require(triggerPrice > 0, "Trigger price must be greater than 0");
        require(expirationTime > block.timestamp, "Expiration time must be in the future");
        require(expirationTime <= block.timestamp + 30 days, "Expiration time too far in future");
        require(tokenOut != address(0), "Invalid output token address");
        
        uint256 hbarForSwap = msg.value - executionFee;
        require(hbarForSwap >= MIN_ORDER_AMOUNT, "Order amount too small: must be at least MIN_ORDER_AMOUNT");
        
        // Create order
        swapOrders[nextOrderId] = SwapOrder({
            tokenOut: tokenOut,
            amountIn: hbarForSwap,
            minAmountOut: minAmountOut,
            triggerPrice: triggerPrice,
            owner: msg.sender,
            isActive: true,
            expirationTime: expirationTime,
            isExecuted: false
        });
        
        userOrders[msg.sender].push(nextOrderId);
        
        emit OrderCreated(
            nextOrderId,
            msg.sender,
            tokenOut,
            hbarForSwap,
            triggerPrice
        );
        
        nextOrderId++;
    }
    
    /**
     * @dev Execute a swap order (public or authorized executors)
     * @param orderId ID of the order to execute
     * @param currentPrice Current token price in terms of HBAR (verified by oracle)
     */
    function executeSwapOrder(uint256 orderId, uint256 currentPrice) 
        external 
        nonReentrant 
        onlyAuthorizedExecutor
        onlyActiveOrder(orderId) 
    {
        SwapOrder storage order = swapOrders[orderId];
        
        // Verify that the price meets the trigger condition
        require(currentPrice >= order.triggerPrice, "Price does not reach trigger");
        
        // Mark order as executed before swap (to prevent re-entrancy)
        order.isActive = false;
        order.isExecuted = true;
        
        // Create intelligent path for swap
        address[] memory path = _getOptimalPath(order.tokenOut);
        
        // Calculate deadline (10 minutes from now)
        uint256 deadline = block.timestamp + 600;
        
        // Execute real swap on SaucerSwap
        uint256[] memory amounts = saucerSwapRouter.swapExactETHForTokens{value: order.amountIn}(
            order.minAmountOut,  // amountOutMin
            path,                // path
            order.owner,         // to (send tokens directly to owner)
            deadline             // deadline
        );
        
        // amounts[path.length - 1] is the amount of tokens received
        uint256 amountOut = amounts[path.length - 1];
        
        // Pay fee to executor (whoever executed the order)
        payable(msg.sender).transfer(executionFee);
        
        emit OrderExecuted(orderId, msg.sender, amountOut, currentPrice);
    }
    
    /**
     * @dev Cancel a swap order
     * @param orderId ID of the order to cancel
     */
    function cancelSwapOrder(uint256 orderId) 
        external 
        onlyOrderOwner(orderId) 
        onlyActiveOrder(orderId) 
    {
        SwapOrder storage order = swapOrders[orderId];
        
        // Mark as inactive
        order.isActive = false;
        
        // Return deposited HBAR to owner
        payable(order.owner).transfer(order.amountIn);
        
        // Return execution fee
        payable(order.owner).transfer(executionFee);
        
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @dev Add authorized executor (owner only)
     * @param executor Address to authorize
     */
    function addExecutor(address executor) external onlyOwner {
        require(executor != address(0), "Executor cannot be zero address");
        require(!authorizedExecutors[executor], "Executor already authorized");
        
        authorizedExecutors[executor] = true;
        executorList.push(executor);
        
        emit ExecutorAdded(executor);
    }
    
    /**
     * @dev Remove authorized executor (owner only)
     * @param executor Address to remove
     */
    function removeExecutor(address executor) external onlyOwner {
        require(authorizedExecutors[executor], "Executor not authorized");
        require(executor != backendExecutor, "Cannot remove backend executor");
        
        authorizedExecutors[executor] = false;
        
        // Remove from executorList
        for (uint256 i = 0; i < executorList.length; i++) {
            if (executorList[i] == executor) {
                executorList[i] = executorList[executorList.length - 1];
                executorList.pop();
                break;
            }
        }
        
        emit ExecutorRemoved(executor);
    }
    
    /**
     * @dev Toggle public execution (owner only)
     * @param enabled Whether to enable public execution
     */
    function togglePublicExecution(bool enabled) external onlyOwner {
        publicExecutionEnabled = enabled;
        emit PublicExecutionToggled(enabled);
    }
    
    /**
     * @dev Get list of authorized executors
     */
    function getAuthorizedExecutors() external view returns (address[] memory) {
        return executorList;
    }
    
    /**
     * @dev Check if address is authorized executor
     */
    function isAuthorizedExecutor(address executor) external view returns (bool) {
        return authorizedExecutors[executor] || executor == backendExecutor || executor == owner();
    }
    
    /**
     * @dev Get user orders
     * @param user User address
     * @return Array of order IDs
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }
    
    /**
     * @dev Get order details
     * @param orderId Order ID
     * @return Order details
     */
    function getOrderDetails(uint256 orderId) external view returns (SwapOrder memory) {
        return swapOrders[orderId];
    }
    
    /**
     * @dev Update backend executor address (owner only)
     * @param newBackendExecutor New backend executor address
     */
    function updateBackendExecutor(address newBackendExecutor) external onlyOwner {
        require(newBackendExecutor != address(0), "Backend executor cannot be zero");
        
        // Remove old backend executor from authorized list
        authorizedExecutors[backendExecutor] = false;
        
        // Remove from executorList
        for (uint256 i = 0; i < executorList.length; i++) {
            if (executorList[i] == backendExecutor) {
                executorList[i] = executorList[executorList.length - 1];
                executorList.pop();
                break;
            }
        }
        
        address oldExecutor = backendExecutor;
        backendExecutor = newBackendExecutor;
        
        // Add new backend executor to authorized list
        authorizedExecutors[newBackendExecutor] = true;
        executorList.push(newBackendExecutor);
        
        emit BackendExecutorUpdated(oldExecutor, newBackendExecutor);
    }
    
    /**
     * @dev Get estimated quote from SaucerSwap
     * @param tokenOut Output token address
     * @param amountIn Input HBAR amount
     * @return Estimated output token amount
     */
    function getEstimatedAmountOut(address tokenOut, uint256 amountIn) 
        external view returns (uint256) {
        address[] memory path = _getOptimalPath(tokenOut);
        
        uint256[] memory amounts = saucerSwapRouter.getAmountsOut(amountIn, path);
        return amounts[path.length - 1]; // Output token amount
    }
    
    /**
     * @dev Get optimal path for swapping WHBAR to tokenOut
     * @param tokenOut Target token address
     * @return path Array of token addresses for optimal swap route
     */
    function _getOptimalPath(address tokenOut) internal view returns (address[] memory path) {
        // Direct path for stablecoins that might have direct WHBAR pairs
        if (tokenOut == USDC || tokenOut == USDT) {
            path = new address[](2);
            path[0] = WETH;
            path[1] = tokenOut;
            return path;
        }
        
        // For SAUCE and other tokens, try multi-hop through USDC
        // Path: WHBAR -> USDC -> TOKEN
        path = new address[](3);
        path[0] = WETH;    // WHBAR
        path[1] = USDC;    // Intermediate token
        path[2] = tokenOut; // Target token
        
        return path;
    }
    
    /**
     * @dev Update execution fee (owner only)
     * @param newFee New execution fee
     */
    function updateExecutionFee(uint256 newFee) external onlyOwner {
        require(newFee > 0, "Fee must be greater than 0");
        require(newFee <= 1000000000, "Fee too high: max 10 HBAR"); // Max 10 HBAR
        uint256 oldFee = executionFee;
        executionFee = newFee;
        emit ExecutionFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Function to receive HBAR directly
     */
    receive() external payable {
        // Allow receiving HBAR for orders and fees
    }
    
    /**
     * @dev Get total contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get contract configuration
     */
    function getContractConfig() external view returns (
        uint256 currentExecutionFee,
        uint256 minOrderAmount,
        address currentBackendExecutor,
        uint256 currentNextOrderId
    ) {
        return (executionFee, MIN_ORDER_AMOUNT, backendExecutor, nextOrderId);
    }
    
    /**
     * @dev Get execution configuration
     */
    function getExecutionConfig() external view returns (
        bool publicExecutionEnabled_,
        uint256 authorizedExecutorCount,
        address backendExecutor_
    ) {
        return (publicExecutionEnabled, executorList.length, backendExecutor);
    }
    
    /**
     * @dev Get minimum total HBAR needed to create an order
     */
    function getMinimumHbarForOrder() external view returns (uint256) {
        return executionFee + MIN_ORDER_AMOUNT;
    }
    
    /**
     * @dev Check if an order exists and is valid
     */
    function isValidOrder(uint256 orderId) external view returns (bool) {
        return orderId > 0 && orderId < nextOrderId && swapOrders[orderId].owner != address(0);
    }
    
    /**
     * @dev Get count of orders for a user
     */
    function getUserOrderCount(address user) external view returns (uint256) {
        return userOrders[user].length;
    }
}