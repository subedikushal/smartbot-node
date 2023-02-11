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
const { getTotalValue, getSuitCards } = require('./shared');

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
  var oppTeam = [];
  var myTeam = [myId, friendId];
  for (let player of playerIds) {
    if (!myTeam.includes(player)) {
      oppTeam.push(player);
    }
  }
  var passingPlayers = [];
  for (let history of bidHistory) {
    if (history[1] === 0) {
      passingPlayers.push(history[0]);
    }
  }
  let hasAllOppPassed = true;
  for (let opp of oppTeam) {
    if (!passingPlayers.includes(opp)) {
      hasAllOppPassed = false;
      break;
    }
  }
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
    if (no_j > 0 && totalValue >= 6) {
      max_to_go_bid = 16;
    }
  } else if (count_of_suit === 2) {
    if (suitWithSameCount.length === 2) {
      let suit1 = suitWithSameCount[0];
      let max1 = 0;
      let v = getTotalValue(getSuitCards(cards, suit1));
      let ov = getTotalValue(cards) - v;
      max1 = Math.floor(15 + 0.5 * v + 0.34 * ov);

      ///////////////////////////////////////
      let max2 = 0;
      let suit2 = suitWithSameCount[1];

      v = getTotalValue(getSuitCards(cards, suit2));
      ov = getTotalValue(cards) - v;
      max2 = Math.floor(15 + 0.5 * v + 0.34 * ov);
      max_to_go_bid = Math.max(max1, max2);
    } else if (suitWithSameCount.length === 1) {
      let suit1 = suitWithSameCount[0];
      let v = getTotalValue(getSuitCards(cards, suit1));
      let ov = getTotalValue(cards) - v;
      max_to_go_bid = Math.floor(15 + 0.5 * v + 0.34 * ov);
    }
  } else if (count_of_suit === 3) {
    let v = getTotalValue(getSuitCards(cards, suit_with_max_count));
    let ov = getTotalValue(cards) - v;
    max_to_go_bid = Math.round(16 + 0.5 * v + 0.25 * ov);
  } else if (count_of_suit === 4) {
    let v = getTotalValue(getSuitCards(cards, suit_with_max_count));
    max_to_go_bid = Math.round(17 + 0.5 * v);
  }
  // console.log(payload.cards);
  // console.log('Max:', max_to_go_bid);

  if (max_to_go_bid >= 16) {
    if (myId === defenderId && challengerBid <= max_to_go_bid) {
      if (bidHistory.length === 3) {
        if (challengerBid === 0) {
          return { bid: MIN_BID };
        }
        if (challengerId === friendId && count_of_suit === 2) {
          return { bid: 0 };
        }
        if (challengerId === friendId && count_of_suit >= 3 && (max_to_go_bid <= 17 || challengerBid > 17)) {
          return { bid: 0 };
        }
      }
      if (challengerId === friendId && count_of_suit === 2) {
        return { bid: 0 };
      }
      if (challengerId === friendId && count_of_suit >= 3 && challengerBid >= 17) {
        return { bid: 0 };
      }

      if (challengerBid === 0) {
        return { bid: MIN_BID };
      } else {
        return {
          bid: challengerBid,
        };
      }
    } else if (myId === challengerId && defenderBid < max_to_go_bid) {
      if (bidHistory.length === 3) {
        if (defenderBid === 0) {
          return { bid: MIN_BID };
        }
        if (defenderId === friendId && count_of_suit === 2) {
          return { bid: 0 };
        }
        if (defenderId === friendId && count_of_suit >= 3 && (max_to_go_bid <= 17 || defenderBid > 17)) {
          return { bid: 0 };
        }
      }
      if (defenderId === friendId && count_of_suit === 2) {
        return { bid: 0 };
      }
      if (defenderId === friendId && count_of_suit >= 3 && defenderBid >= 17) {
        return { bid: 0 };
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
