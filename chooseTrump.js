const { last, getSuit, cardPriority } = require('./shared');

/**
 * @payload
  {
    "playerId": "A1", // own player id
    "playerIds": ["A1", "B1", "A2", "B2"], // player ids in order
    "timeRemaining": 1200,
    "cards": ["JS", "TS", "KH", "9C"], // own cards
    "bidHistory": [["A1", 16], ["B1",17], ["A1", 17], ["B1", 0], ["A2", 0], ["B2", 0]], // bidding history in chronological order
  }
 */

function chooseTrump(payload) {
  const cards = payload.cards;
  let copyCards = JSON.parse(JSON.stringify(cards));
  var no_j = 0;
  var suitCount = {
    S: 0,
    D: 0,
    H: 0,
    C: 0,
  };
  for (let card of cards) {
    if (card[0] === 'J') {
      no_j += 1;
    }
    suitCount[card[1]] += 1;
  }

  // return suit with max count
  const suit_with_max_count = Object.keys(suitCount).reduce((a, b) => (suitCount[a] > suitCount[b] ? a : b));
  const count_of_suit = suitCount[suit_with_max_count];
  var sortedCards = copyCards.sort((a, b) => cardPriority(b) - cardPriority(a));

  if (count_of_suit === 1) {
    return { suit: sortedCards[0][1] };
  } else {
    for (let card of cards) {
      if (card[1] === suit_with_max_count && card[0] === 'J') {
        return { suit: card[1] };
      }
    }
    return { suit: suit_with_max_count };
  }
}

module.exports = chooseTrump;