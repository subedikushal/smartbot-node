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

const { getSuitCards } = require('./shared');

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

  if (count_of_suit === 2) {
    let suitCards = getSuitCards(cards, suit_with_max_count);
    let totalVal = 0;
    for (let c of suitCards) {
      if (c[0] === 'J' || c[0] === '9') {
        max_to_go_bid = Math.min(17, 16 + no_j);
      }
      if (c[0] === 'J') {
        totalVal += 3;
      }
      if (c[0] === '9') {
        totalVal += 2;
      }
      if (c[0] === '1' || c[0] === 'T') {
        totalVal += 1;
      }
    }
    if (max_to_go_bid === 0 && no_j >= 1) {
      max_to_go_bid = 16;
    }
    if (totalVal >= 2) {
      max_to_go_bid = 16;
    }
  } else if (count_of_suit === 3) {
    let suitCards = getSuitCards(cards, suit_with_max_count);
    let totalVal = 0;
    for (let c of suitCards) {
      if (c[0] === 'J' || c[0] === '9') {
        max_to_go_bid = 19;
      }
      if (c[0] === 'J') {
        totalVal += 3;
      }
      if (c[0] === '9') {
        totalVal += 2;
      }
      if (c[0] === '1' || c[0] === 'T') {
        totalVal += 1;
      }
      if (totalVal === 0) {
        max_to_go_bid = 0;
      } else if (totalVal >= 3) {
        max_to_go_bid = 18;
      }
    }
    max_to_go_bid = Math.min(18, 16 + no_j);
  } else if (count_of_suit === 4) {
    let suitCards = getSuitCards(cards, suit_with_max_count);
    let totalVal = 0;
    for (let c of suitCards) {
      if (c[0] === 'J') {
        totalVal += 3;
      }
      if (c[0] === '9') {
        totalVal += 2;
      }
      if (c[0] === '1' || c[0] === 'T') {
        totalVal += 1;
      }
    }
    if (totalVal >= 5) {
      max_to_go_bid = 20;
    } else if (totalVal === 4) {
      max_to_go_bid = 19;
    } else {
      max_to_go_bid = 18;
    }
  }

  if (max_to_go_bid < 16) {
    return { bid: 0 };
  }

  if (myId === defenderId && challengerBid <= max_to_go_bid) {
    if (challengerId === friendId && challengerBid >= 17) {
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
    if (defenderId === friendId && defenderBid >= 17) {
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
