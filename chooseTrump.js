const { last, getSuit, cardPriority, getSuitCards } = require('./shared');

const _ = require('lodash');
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
  let suitWithSameCount = new Set();
  for (let card of cards) {
    if (suitCount[card[1]] === 2) {
      suitWithSameCount.add(card[1]);
    }
  }
  suitWithSameCount = Array.from(suitWithSameCount);

  // return suit with max count
  const suit_with_max_count = Object.keys(suitCount).reduce((a, b) => (suitCount[a] > suitCount[b] ? a : b));
  const count_of_suit = suitCount[suit_with_max_count];
  var sortedCards = copyCards.sort((a, b) => cardPriority(b) - cardPriority(a));

  if (count_of_suit === 1) {
    return { suit: sortedCards[0][1] };
  } else if (count_of_suit === 2) {
    var toGoSuit = suitWithSameCount[0];
    if (suitWithSameCount.length === 2) {
      var suit1 = suitWithSameCount[0];
      var total1 = 0;
      for (let card of cards) {
        if (card[1] === suit1) {
          total1 += cardPriority(card);
        }
      }

      var total2 = 0;
      var suit2 = suitWithSameCount[1];
      for (let card of cards) {
        if (card[1] === suit2) {
          total2 += cardPriority(card);
        }
      }

      if (total2 > total1) {
        toGoSuit = suit2;
      } else {
        toGoSuit = suit1;
      }
    }
    // let haveJ = false;
    // for (let card of cards) {
    //   if (card[1] === toGoSuit && card[0] === 'J') {
    //     haveJ = true;
    //   }
    // }
    // if (!haveJ) {
    //   for (let card of cards) {
    //     if (card[0] === 'J') {
    //       return { suit: card[1] };
    //     }
    //   }
    // }
    return { suit: toGoSuit };
  } else {
    return { suit: suit_with_max_count };
  }
}

module.exports = chooseTrump;
