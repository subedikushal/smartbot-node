const { orderBy } = require('lodash');
const _ = require('lodash');

function last(items) {
  return items[items.length - 1];
}
let getPlayCard = payload => {
  function play(payload) {
    console.log('play', JSON.stringify(payload));

    const ownCards = payload.cards;
    const firstCard = payload.played[0];
    const trumpSuit = payload.trumpSuit;
    const trumpRevealed = payload.trumpRevealed;
    const handsHistory = payload.handsHistory;
    const ownId = payload.playerId;
    const played = payload.played;
    const playerIds = payload.playerIds;
    const myIdx = playerIds.findIndex(id => id === ownId);
    const myPartnerIdx = getPartnerIdx(myIdx);
    const firstTurn = (myIdx + 4 - played.length) % 4;
    const isBidder = trumpSuit && !trumpRevealed;

    /** we are the one to throw the first card in the hands */
    if (!firstCard) {
      return {
        card: last(ownCards),
      };
    }

    const firstCardSuit = getSuit(firstCard);
    const ownSuitCards = getSuitCards(ownCards, firstCardSuit);

    /** if we have the suit with respect to the first card, we throw it */
    if (ownSuitCards.length > 0) {
      return {
        card: last(ownSuitCards),
      };
    }

    /**
     * we don't have cards that follow the suit
     * @example
     *  the first player played "7H" (7 of hearts)
     *  we don't have any cards of suit "hearts"
     *
     * We could either
     *
     * 1. throw any card
     * 2. reveal the trump
     */

    /**
     * trump has not been revealed yet, and we don't know what the trump is
     * let's reveal the trump
     */
    if (!trumpSuit && !trumpRevealed) {
      return {
        revealTrump: true,
      };
    }

    /**  we don't have any trump suit cards, throw random */
    const ownTrumpSuitCards = getSuitCards(ownCards, trumpSuit);
    if (ownTrumpSuitCards.length === 0) {
      return {
        card: last(ownCards),
      };
    }

    const didIRevealTheTrumpInThisHand =
      trumpRevealed && trumpRevealed.playerId === ownId && trumpRevealed.hand === handsHistory.length + 1;

    /**
     * trump was revealed by me in this hand
     * or
     * I'm going to reveal the trump, since I'm the bidder
     */
    if (isBidder || didIRevealTheTrumpInThisHand) {
      const response = {};
      if (isBidder) response.revealTrump = true;

      /** if there are no trumps in the played */
      if (getSuitCards(played, trumpSuit).length === 0) {
        response.card = last(ownTrumpSuitCards);
        return response;
      }

      const winningTrumpCardIdx = pickWinningCardIdx(played, trumpSuit);
      const winningCardPlayerIdx = (firstTurn + winningTrumpCardIdx) % 4;

      /**
       * if we revealed the trump in this round and the winning card is trump, there are two cases
       * 1. If the opponent is winning the hand, then you must throw the winning card of the trump suit against your opponent's card.
       * 2. If your partner is winning the hand, then you could throw any card of trump suit since your team is only winning the hand.
       */
      if (winningCardPlayerIdx === myPartnerIdx) {
        response.card = last(ownTrumpSuitCards);
        return response;
      }

      const winningTrumpCard = played[winningTrumpCardIdx];
      const winningCard = ownTrumpSuitCards.find(card => isHigh(card, winningTrumpCard)) || last(ownTrumpSuitCards);

      /** player who revealed the trump should throw the trump suit card */
      return {
        card: winningCard,
      };
    }

    return {
      card: last(ownCards),
    };
  }
};
let getSirOfSuit = (payload, suit) => {
  var tillPlayedCards = getTillPlayedCards(payload);
  var suitObj = { D: [], H: [], S: [], C: [] };
  for (let card of tillPlayedCards) {
    suitObj[card[1]].push(card);
  }
  var orderedRanks = ['J', '9', '1', 'T', 'K', 'Q', '8', '7'];
  var suitCards = suitObj[suit];
  if (suitCards.length > 0) {
    for (let card of suitCards) {
      var rank = card[0];
      removeElement(orderedRanks, rank);
    }
  }
  if (orderedRanks.length > 0) {
    return orderedRanks[0] + suit;
  }
  return null;
};

let getTotalValue = cards => {
  let total = 0;
  for (let card of cards) {
    total += cardValue(card);
  }
  return total;
};
let isFriendWinning = body => {
  var played_cards = body['played'];
  var playerId = body['playerId'];
  var trump_suit = body['trumpSuit'];
  var players = body['playerIds'];
  var own_cards = body['cards'];
  var till_played_cards = getTillPlayedCards(body);
  let player2 = players[(players.indexOf(playerId) + 1) % 4];

  var count_of_dropped_cards = { S: 0, D: 0, H: 0, C: 0 };
  var count_of_own_cards = { S: 0, D: 0, H: 0, C: 0 };
  for (let card of till_played_cards) {
    let key = card[1];
    count_of_dropped_cards[key] += 1;
  }
  for (let card of own_cards) {
    let key = card[1];
    count_of_own_cards[key] += 1;
  }
  var len_pc = played_cards.length;

  if (len_pc <= 1) return false;

  if (len_pc === 2) {
    var friendCard = played_cards[0];
    var friendCardSuit = friendCard[1];
    let highestCard = getHighestCardInPlayedCards(body);
    var cardsLost = getLostSuitByOther(body);
    var sirOfFriendSuit = getSirOfSuit(body, friendCardSuit);
    if (friendCard !== highestCard) {
      return false;
    }
    if (friendCard === highestCard) {
      if (count_of_dropped_cards[friendCardSuit] === 0) {
        return true;
      }
      if (
        (trump_suit && count_of_dropped_cards[trump_suit] + count_of_own_cards[trump_suit] === 8) ||
        cardsLost[player2].has(trump_suit)
      ) {
        if (cardPriority(friendCard) >= cardPriority(sirOfFriendSuit)) {
          return true;
        }
        if (cardsLost[player2].has(played_cards[0][1])) {
          return true;
        }
        if (count_of_dropped_cards[played_cards[0][1]] + count_of_own_cards[played_cards[0][1]] >= 7) {
          return true;
        }
        if (played_cards[0][1] === played_cards[1][1] && count_of_dropped_cards[played_cards[0][1]] >= 6) {
          return true;
        }
        if (
          played_cards[0][1] === played_cards[1][1] &&
          count_of_dropped_cards[played_cards[0][1]] + count_of_own_cards[played_cards[0][1]] >= 6
        ) {
          return true;
        }
      }
    }
    return false;
  }
  if (len_pc === 3) {
    var friendCard = played_cards[1];
    let highestCard = getHighestCardInPlayedCards(body);
    if (highestCard === friendCard) {
      return true;
    }
  }
  return false;
};

let getSuitCardObj = cards => {
  suitCardObj = {
    D: [],
    H: [],
    C: [],
    S: [],
  };
  for (let card of cards) {
    suit = card[1];
    suitCardObj[suit].push(card);
    suitCardObj[suit].sort((a, b) => cardPriority(b) - cardPriority(a));
  }
  return suitCardObj;
};
let getHighestCardInPlayedCards = payload => {
  var trumpRevealed = payload['trumpRevealed'];
  var trumpSuit = payload['trumpSuit'];
  const playedCards = payload['played'];

  copyPlayedCards = _.cloneDeep(playedCards);

  const sortedPlayedCards = copyPlayedCards.sort((a, b) => cardPriority(b) - cardPriority(a));

  var firstCardSuitCards = [];
  var trumpCards = [];
  var highestCard = '';
  var currentSuit = playedCards[0][1];

  for (let card of sortedPlayedCards) {
    suit = card[1];
    if (suit === currentSuit) {
      firstCardSuitCards.push(card);
    } else if (trumpSuit && trumpRevealed && suit === trumpSuit) {
      trumpCards.push(card);
    }
  }
  if (trumpCards.length > 0) {
    highestCard = trumpCards[0];
  } else {
    highestCard = firstCardSuitCards[0];
  }
  return highestCard;
};

let cardPriority = card => {
  const cardRank = card[0];
  card_priority = {
    J: 3,
    9: 2,
    1: 1.1,
    T: 1,
    K: 0.3,
    Q: 0.2,
    8: 0.1,
    7: 0,
    O: 3.1,
  };
  return card_priority[cardRank];
};

let cardValue = card => {
  const cardRank = card[0];
  card_value = {
    J: 3,
    9: 2,
    1: 1,
    T: 1,
    K: 0,
    Q: 0,
    8: 0,
    7: 0,
  };
  return card_value[cardRank];
};
function getSuit(card) {
  return card[1];
}

function getRank(card) {
  return card[0];
}

function getSuitCards(cards, cardSuit) {
  return cards.filter(card => getSuit(card) === cardSuit);
}

const cardsDict = {
  J: { points: 3, order: 8 },
  9: { points: 2, order: 7 },
  1: { points: 1, order: 6 },
  T: { points: 1, order: 5 },
  K: { points: 0, order: 4 },
  Q: { points: 0, order: 3 },
  8: { points: 0, order: 2 },
  7: { points: 0, order: 1 },
};

function getCardInfo(card) {
  return cardsDict[getRank(card)];
}

function isHigh(highestCard, compareCard, trumpSuit) {
  const isHighestCardTrump = getSuit(highestCard) === trumpSuit;
  const isCompareCardTrump = getSuit(compareCard) === trumpSuit;

  if (trumpSuit && isHighestCardTrump && !isCompareCardTrump) return true;
  if (trumpSuit && !isHighestCardTrump && isCompareCardTrump) return false;

  /** if both have similar suit, we could just check the points with order */
  if (getSuit(highestCard) === getSuit(compareCard)) {
    const high = getCardInfo(highestCard);
    const compare = getCardInfo(compareCard);

    return high.points >= compare.points && high.order > compare.order;
  }

  /** if both are of different suit, and the high card should win */
  return true;
}

function pickWinningCardIdx(cards, trumpSuit) {
  let winner = 0;
  const firstCard = cards[0];

  for (let i = winner; i < cards.length; i++) {
    const winningCard = cards[winner];
    const compareCard = cards[i];

    if (!trumpSuit && getSuit(firstCard) !== getSuit(compareCard)) continue;
    if (!isHigh(winningCard, compareCard, trumpSuit)) winner = i;
  }

  return winner;
}

function isPartner(myIdx, maybePartnerIdx) {
  return myIdx % 2 === maybePartnerIdx % 2;
}
function removeElement(arr, el) {
  const index = arr.indexOf(el);
  if (index > -1) {
    arr.splice(index, 1);
  }
}
function getPartnerIdx(myIdx) {
  return (myIdx + 2) % 4;
}
let getTillPlayedCards = payload => {
  var handsHistory = payload.handsHistory;
  var tillPlayedCards = [];
  for (let hand of handsHistory) {
    tillPlayedCards = tillPlayedCards.concat(hand[1]);
  }
  return tillPlayedCards;
};

function randomChoice(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}
let nextPlayerMap = (players, playerId) => {
  map = {};
  let myIdx = players.indexOf(playerId);
  let player2 = players[(myIdx + 1) % 4];
  let player3 = players[(myIdx + 2) % 4];
  let player4 = players[(myIdx + 3) % 4];
  map[playerId] = player2;
  map[player2] = player3;
  map[player3] = player4;
  map[player4] = playerId;
  return map;
};
let getLostSuitByOther = payload => {
  let playerId = payload.playerId;
  let players = payload.playerIds;
  let handsHistory = payload.handsHistory;
  let player2 = players[(players.indexOf(playerId) + 1) % 4];
  let player3 = players[(players.indexOf(playerId) + 2) % 4];
  let player4 = players[(players.indexOf(playerId) + 3) % 4];

  cardsLost = {};
  cardsLost[player2] = new Set();
  cardsLost[player3] = new Set();
  cardsLost[player4] = new Set();

  for (let eachHand of handsHistory) {
    let starterPlayer = eachHand[0];
    let starterCardSuit = eachHand[1][0][1];

    let secondCard = eachHand[1][1];
    if (secondCard[1] !== starterCardSuit) {
      let cardPlayer = players[(players.indexOf(starterPlayer) + 1) % 4];
      if (cardPlayer !== playerId) {
        cardsLost[cardPlayer].add(starterCardSuit);
      }
    }
    thirdCard = eachHand[1][1];
    if (thirdCard[1] !== starterCardSuit) {
      let cardPlayer = players[(players.indexOf(starterPlayer) + 2) % 4];
      if (cardPlayer !== playerId) {
        cardsLost[cardPlayer].add(starterCardSuit);
      }
    }
    forthCard = eachHand[1][1];
    if (forthCard[1] !== starterCardSuit) {
      let cardPlayer = players[(players.indexOf(starterPlayer) + 3) % 4];
      if (cardPlayer !== playerId) {
        cardsLost[cardPlayer].add(starterCardSuit);
      }
    }

    const tillPlayedCards = getTillPlayedCards(payload);
    var suits = ['D', 'H', 'S', 'C'];

    var count_of_dropped_suit = {
      D: 0,
      S: 0,
      H: 0,
      C: 0,
    };
    for (let card of tillPlayedCards) {
      count_of_dropped_suit[card[-1]] += 1;
    }

    for (let suit of suits) {
      if (count_of_dropped_suit[suit] === 8) {
        cardsLost[player2].add(suit);
        cardsLost[player3].add(suit);
        cardsLost[player4].add(suit);
      }
    }
  }
  return cardsLost;
};
module.exports = {
  last,
  getSuit,
  getSuitCards,
  pickWinningCardIdx,
  isPartner,
  getPartnerIdx,
  isHigh,
  cardPriority,
  getHighestCardInPlayedCards,
  getLostSuitByOther,
  getTillPlayedCards,
  removeElement,
  randomChoice,
  isFriendWinning,
  getSuitCardObj,
  cardValue,
  getSirOfSuit,
  getTotalValue,
  getPlayCard,
  nextPlayerMap,
};
