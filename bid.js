/**
 * @payload
  {
    "playerId": "A1", // own player id
    "playerIds": ["A1", "B1", "A2", "B2"], // player ids in order
    "timeRemaining": 1200,
    "cards": ["JS", "TS", "KH", "9C"], // own cards
    "bidHistory": [["A1", 16], ["B1",17], ["A1", 17], ["B1", 0], ["A2", 0], ["B2", 0]], // bidding history in chronological order
    "bidState": {
      "defenderId": "A1",
      "challengerId": "B1",
      "defenderBid": 16,
      "challengerBid": 17
    },
  }
 */

const { max } = require('lodash');
const _ = require('lodash');
const { getTotalValue } = require('./shared');

const MIN_BID = 16;

function bid(payload) {
  var bidState = payload.bidState;
  var challengerBid = bidState.challengerBid;
  var defenderBid = bidState.defenderBid;
  var bidHistory = payload.bidHistory;
  var playerIds = payload.playerIds;
  const cards = payload.cards;
  var myId = payload.playerId;
  var defenderId = bidState.defenderId;
  var challengerId = bidState.challengerId;
  var friendId = playerIds[(playerIds.indexOf(myId) + 2) % 4];
  var no_j = 0;
  var no_9 = 0;
  var no_1 = 0;
  var no_t = 0;
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
    if (card[0] === '9') {
      no_9 += 1;
    }
    if (card[0] === '1') {
      no_1 += 1;
    }
    if (card[0] === 'T') {
      no_t += 1;
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
  var suit_with_max_count = Object.keys(suitCount).reduce((a, b) => (suitCount[a] > suitCount[b] ? a : b));
  const count_of_suit = suitCount[suit_with_max_count];
  var max_to_go_bid = 0;
  if (count_of_suit === 1) {
    let totalValue = getTotalValue(cards);
    if (no_j > 0) {
      max_to_go_bid = 15.73 + totalValue / 11;
      if (max_to_go_bid > 16.5) {
        max_to_go_bid = 17;
      } else if (max_to_go_bid >= 16 && max_to_go_bid <= 16.5) {
        max_to_go_bid = 16;
      }
    }
  } else if (count_of_suit === 2) {
    if (suitWithSameCount.length === 2) {
      var j_in_suit = 0;
      var nine_in_suit = 0;
      var A_in_suit = 0;
      var T_in_suit = 0;
      let suit1 = suitWithSameCount[0];
      let max1 = 0;
      for (let card of cards) {
        if (card[1] === suit1) {
          if (card[0] === 'J') {
            j_in_suit += 1;
          }
          if (card[0] === '9') {
            nine_in_suit += 1;
          }
          if (card[0] === '1') {
            A_in_suit += 1;
          }
          if (card[0] === 'T') {
            T_in_suit += 1;
          }
        }
      }
      if (j_in_suit > 0) {
        max1 = 16 + j_in_suit + nine_in_suit;
      }
      j_in_suit = 0;
      nine_in_suit = 0;
      A_in_suit = 0;
      T_in_suit = 0;
      let max2 = 0;
      let suit2 = suitWithSameCount[1];
      for (let card of cards) {
        if (card[1] === suit2) {
          if (card[0] === 'J') {
            j_in_suit += 1;
          }
          if (card[0] === '9') {
            nine_in_suit += 1;
          }
          if (card[0] === '1') {
            A_in_suit += 1;
          }
          if (card[0] === 'T') {
            T_in_suit += 1;
          }
        }
      }
      if (j_in_suit > 0) {
        max2 = 16 + j_in_suit + nine_in_suit;
      }
      max_to_go_bid = Math.max(max1, max2);
    } else if (suitWithSameCount.length === 1) {
      let j_in_suit = 0;
      let nine_in_suit = 0;
      let A_in_suit = 0;
      let T_in_suit = 0;
      let suit1 = suitWithSameCount[0];
      for (let card of cards) {
        if (card[1] === suit1) {
          if (card[0] === 'J') {
            j_in_suit += 1;
          }
          if (card[0] === '9') {
            nine_in_suit += 1;
          }
          if (card[0] === '1') {
            A_in_suit += 1;
          }
          if (card[0] === 'T') {
            T_in_suit += 1;
          }
        }
      }
      if (j_in_suit > 0) {
        max_to_go_bid = 16 + j_in_suit + nine_in_suit;
      }
    }
  } else if (count_of_suit === 3) {
    var j_in_suit = 0;
    var nine_in_suit = 0;
    var A_in_suit = 0;
    var T_in_suit = 0;
    for (let card of cards) {
      if (card[1] === suit_with_max_count) {
        if (card[0] === 'J') {
          j_in_suit += 1;
        }
        if (card[0] === '9') {
          nine_in_suit += 1;
        }
        if (card[0] === '1') {
          A_in_suit += 1;
        }
        if (card[0] === 'T') {
          T_in_suit += 1;
        }
      }
    }
    if (j_in_suit > 0) {
      max_to_go_bid = 20;
    } else {
      if (getTotalValue(cards) >= 1) {
        max_to_go_bid = 18;
      } else {
        max_to_go_bid = 16;
      }
    }
  } else if (count_of_suit === 4) {
    var j_in_suit = 0;
    var nine_in_suit = 0;
    var A_in_suit = 0;
    var T_in_suit = 0;
    for (let card of cards) {
      if (card[1] === suit_with_max_count) {
        if (card[0] === 'J') {
          j_in_suit += 1;
        }
        if (card[0] === '9') {
          nine_in_suit += 1;
        }
        if (card[0] === '1') {
          A_in_suit += 1;
        }
        if (card[0] === 'T') {
          T_in_suit += 1;
        }
      }
    }
    if (j_in_suit > 0) {
      max_to_go_bid = 20;
    } else {
      if (getTotalValue(cards) <= 1) {
        max_to_go_bid = 17;
      } else if (getTotalValue(cards) >= 2) {
        max_to_go_bid = 19;
      }
    }
  }

  if (max_to_go_bid >= 16) {
    if (myId === defenderId && challengerBid <= max_to_go_bid) {
      if (bidHistory.length === 3 && challengerBid === 0) {
        return { bid: MIN_BID };
      }

      if (challengerBid === 0) {
        return { bid: MIN_BID };
      } else {
        return {
          bid: challengerBid,
        };
      }
    } else if (myId === challengerId && defenderBid < max_to_go_bid) {
      if (bidHistory.length === 3 && defenderBid === 0) {
        return { bid: MIN_BID };
      }
      if (defenderBid === 0) {
        return { bid: MIN_BID };
      } else {
        return {
          bid: defenderBid + 1,
        };
      }
    }
  }
  return { bid: 0 };
}
module.exports = bid;
