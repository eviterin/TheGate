// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract VictoryTracker {
    mapping(address => bool) public victoriousPlayers;
    address[] public winners;

    event GameCompleted(address indexed player);

    function recordVictory(address player) external {
        require(!victoriousPlayers[player], "Player already recorded as victor");
        victoriousPlayers[player] = true;
        winners.push(player);
        emit GameCompleted(player);
    }

    function hasPlayerWon(address player) public view returns (bool) {
        return victoriousPlayers[player];
    }

    function getAllWinners() public view returns (address[] memory) {
        return winners;
    }
} 