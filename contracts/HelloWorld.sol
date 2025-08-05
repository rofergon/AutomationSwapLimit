// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title HelloWorld
 * @dev Un contrato simple para demostrar despliegue en Hedera
 */
contract HelloWorld {
    string private message;
    address private owner;
    uint256 private counter;
    
    event MessageChanged(string newMessage, address changedBy);
    event CounterIncremented(uint256 newValue, address incrementedBy);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el propietario puede ejecutar esta funcion");
        _;
    }
    
    constructor(string memory _initialMessage) {
        message = _initialMessage;
        owner = msg.sender;
        counter = 0;
    }
    
    /**
     * @dev Retorna el mensaje actual
     */
    function getMessage() public view returns (string memory) {
        return message;
    }
    
    /**
     * @dev Cambia el mensaje (solo el propietario)
     */
    function setMessage(string memory _newMessage) public onlyOwner {
        message = _newMessage;
        emit MessageChanged(_newMessage, msg.sender);
    }
    
    /**
     * @dev Retorna el contador actual
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }
    
    /**
     * @dev Incrementa el contador (cualquiera puede llamarla)
     */
    function incrementCounter() public {
        counter += 1;
        emit CounterIncremented(counter, msg.sender);
    }
    
    /**
     * @dev Retorna la direccion del propietario
     */
    function getOwner() public view returns (address) {
        return owner;
    }
    
    /**
     * @dev Permite al propietario transferir la propiedad
     */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Nueva direccion no puede ser la direccion cero");
        owner = _newOwner;
    }
}