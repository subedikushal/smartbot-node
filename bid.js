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

const { getSuitCards, cardValue } = require('./shared');

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

  let suitWithSameCount = [];
  for (let card of cards) {
    if (suitCount[card[1]] === 2) {
      suitWithSameCount.push(card[1]);
    }
  }
  // return suit with max count
  var suit_with_max_count = Object.keys(suitCount).reduce((a, b) => (suitCount[a] > suitCount[b] ? a : b));
  const count_of_suit = suitCount[suit_with_max_count];
  var max_to_go_bid = 0;

  if (count_of_suit === 2) {
    max_to_go_bid = 15 + no_j + no_9 * 0.5 + (no_1 + no_t) * 0.5;
  } else if (count_of_suit === 3) {
    max_to_go_bid = 16 + no_j + no_9 * 0.5 + (no_1 + no_t) * 0.5;
  } else if (count_of_suit === 4) {
    max_to_go_bid = 17 + no_j + no_9 * 0.5 + (no_1 + no_t) * 0.5;
  }
  if (max_to_go_bid < 16) {
    return { bid: 0 };
  }

  if (myId === defenderId && challengerBid <= max_to_go_bid) {
    if (challengerId === friendId && challengerBid >= 17 && count_of_suit === 2) {
      return { bid: 0 };
    }
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
    if (defenderId === friendId && defenderBid >= 17 && count_of_suit === 2) {
      console.log(friendId);
      return { bid: 0 };
    }
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
  return { bid: 0 };
}

module.exports = bid;
