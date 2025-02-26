// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Cards {
    address public owner;
    
    struct Card {
        string id;
        string name;
        string description;
        uint8 manaCost;
        bool isActive;
        uint256 createdAt;
        uint256 lastUpdated;
        bool targeted;  // true = can target enemies, false = self-cast only
    }
    
    // Array to store all card IDs
    string[] public cardIds;
    
    // Mapping from card ID to Card struct
    mapping(string => Card) public cards;
    
    // Events
    event CardAdded(string id, string name, uint8 manaCost);
    event CardUpdated(string id, string name, uint8 manaCost);
    event CardStatusChanged(string id, bool isActive);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function addCard(
        string calldata id,
        string calldata name,
        string calldata description,
        uint8 manaCost,
        bool targeted
    ) public onlyOwner {
        require(cards[id].createdAt == 0, "Card with this ID already exists");
        
        cards[id] = Card({
            id: id,
            name: name,
            description: description,
            manaCost: manaCost,
            isActive: true,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp,
            targeted: targeted
        });
        
        cardIds.push(id);
        
        emit CardAdded(id, name, manaCost);
    }
    
    function updateCard(
        string calldata id,
        string calldata name,
        string calldata description,
        uint8 manaCost,
        bool targeted
    ) public onlyOwner {
        require(cards[id].createdAt != 0, "Card does not exist");
        
        cards[id].name = name;
        cards[id].description = description;
        cards[id].manaCost = manaCost;
        cards[id].targeted = targeted;
        cards[id].lastUpdated = block.timestamp;
        
        emit CardUpdated(id, name, manaCost);
    }
    
    function setCardStatus(string calldata id, bool isActive) public onlyOwner {
        require(cards[id].createdAt != 0, "Card does not exist");
        cards[id].isActive = isActive;
        cards[id].lastUpdated = block.timestamp;
        
        emit CardStatusChanged(id, isActive);
    }
    
    // View functions
    function getCard(string calldata id) public view returns (Card memory) {
        require(cards[id].createdAt != 0, "Card does not exist");
        return cards[id];
    }
    
    function getAllCardIds() public view returns (string[] memory) {
        return cardIds;
    }
    
    function getActiveCards() public view returns (Card[] memory) {
        uint256 activeCount = 0;
        
        // First count active cards
        for (uint256 i = 0; i < cardIds.length; i++) {
            if (cards[cardIds[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active cards
        Card[] memory activeCards = new Card[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < cardIds.length; i++) {
            if (cards[cardIds[i]].isActive) {
                activeCards[currentIndex] = cards[cardIds[i]];
                currentIndex++;
            }
        }
        
        return activeCards;
    }
} 