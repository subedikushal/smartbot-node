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

const MIN_BID = 16;
const PASS_BID = 0;

function bid(payload) {
  var bidState = payload.bidState;
  var challengerBid = bidState.challengerBid;
  var defenderBid = bidState.defenderBid;
  var bidHistory = payload.bidHistory;
  const cards = payload.cards;
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
  var max_to_go_bid = 0;

  if (count_of_suit === 1) {
    max_to_go_bid = Math.min(16, 15 + no_j);
  } else if (count_of_suit === 2) {
    max_to_go_bid = Math.min(17, 15 + no_j);
  } else if (count_of_suit == 3) {
    max_to_go_bid = Math.min(18, 16 + no_j);
  } else {
    max_to_go_bid = 20;
  }

  if (max_to_go_bid < MIN_BID) {
    return { bid: 0 };
  }

  var myId = payload.playerId;
  var defenderId = bidState.defendeId;
  var challengerId = bidState.challengerId;
  if (myId === defenderId && challengerBid <= max_to_go_bid) {
    if (bidHistory.length == 3 && challengerBid === 0) {
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
    if (bidHistory.length == 3 && defenderBid === 0) {
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
  return { bid: 0 };
}

module.exports = bid;
