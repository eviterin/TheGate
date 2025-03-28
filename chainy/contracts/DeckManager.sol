// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./CardLibrary.sol";

library DeckManager {
    function drawCard(
        uint8[] storage hand,
        uint8[] storage draw,
        uint8[] storage discard
    ) internal {
        if (draw.length == 0) {
            if (discard.length == 0) return;
            moveDiscardIntoDrawpile(draw, discard);
            shuffleDrawPile(draw);
        }
        hand.push(draw[draw.length - 1]);
        draw.pop();
    }

    function drawNewHand(
        uint8[] storage hand,
        uint8[] storage draw,
        uint8[] storage discard,
        bool extraCardDrawEnabled
    ) internal {
        uint8 cardsToDraw = extraCardDrawEnabled ? 4 : 3;
        for (uint8 i = 0; i < cardsToDraw; i++) {
            drawCard(hand, draw, discard);
        }
    }

    function discardCard(
        uint8[] storage hand,
        uint8[] storage discard,
        uint cardIndex
    ) internal {
        uint8 cardID = hand[cardIndex];
        if (cardID != CardLibrary.CARD_ID_NONE) {
            discard.push(cardID);
            for (uint i = cardIndex; i < hand.length - 1; i++) {
                hand[i] = hand[i + 1];
            }
            hand.pop();
        }
    }

    function removeCardFromGame(
        uint8[] storage hand,
        uint8[] storage deck,
        uint cardIndex
    ) internal {
        uint8 cardID = hand[cardIndex];
        if (cardID != CardLibrary.CARD_ID_NONE) {
            // Remove from hand
            for (uint i = cardIndex; i < hand.length - 1; i++) {
                hand[i] = hand[i + 1];
            }
            hand.pop();

            // Remove all instances from deck
            uint i = 0;
            while (i < deck.length) {
                if (deck[i] == cardID) {
                    // Move last card to current position and pop
                    deck[i] = deck[deck.length - 1];
                    deck.pop();
                } else {
                    i++;
                }
            }
        }
    }

    function removeCardCompletelyFromGame(
        uint8[] storage hand,
        uint8[] storage deck,
        uint8[] storage draw,
        uint8[] storage discard,
        uint cardIndex
    ) internal {
        uint8 cardID = hand[cardIndex];
        if (cardID != CardLibrary.CARD_ID_NONE) {
            // Remove from hand
            for (uint i = cardIndex; i < hand.length - 1; i++) {
                hand[i] = hand[i + 1];
            }
            hand.pop();

            // Remove all instances from deck
            uint i = 0;
            while (i < deck.length) {
                if (deck[i] == cardID) {
                    deck[i] = deck[deck.length - 1];
                    deck.pop();
                } else {
                    i++;
                }
            }

            // Remove all instances from draw pile
            i = 0;
            while (i < draw.length) {
                if (draw[i] == cardID) {
                    draw[i] = draw[draw.length - 1];
                    draw.pop();
                } else {
                    i++;
                }
            }

            // Remove all instances from discard pile
            i = 0;
            while (i < discard.length) {
                if (discard[i] == cardID) {
                    discard[i] = discard[discard.length - 1];
                    discard.pop();
                } else {
                    i++;
                }
            }
        }
    }

    function copyDeckIntoDrawpile(
        uint8[] storage draw,
        uint8[] storage deck
    ) internal {
        while(draw.length > 0) {
            draw.pop();
        }
        for (uint i = 0; i < deck.length; i++) {
            draw.push(deck[i]);
        }
    }

    function moveDiscardIntoDrawpile(
        uint8[] storage draw,
        uint8[] storage discard
    ) internal {
        while(draw.length > 0) {
            draw.pop();
        }
        for (uint i = 0; i < discard.length; i++) {
            draw.push(discard[i]);
        }
        while(discard.length > 0) {
            discard.pop();
        }
    }

    function shuffleDrawPile(uint8[] storage draw) internal {
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        uint256 len = draw.length;
        for (uint256 i = len - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(seed, i))) % (i + 1);
            (draw[i], draw[j]) = (draw[j], draw[i]);
        }
    }
} 