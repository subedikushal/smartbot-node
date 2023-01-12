function last(items) {
  return items[items.length - 1];
}
let getHighestCardInPlayedCards = payload => {
  var trumpRevealed = payload.trumpRevealed;
  var trumpSuit = payload.trumpSuit;
  const playedCards = payload.played;

  copyPlayedCards = JSON.parse(JSON.stringify(playedCards));

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
  };
  return card_priority[cardRank];
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
  const handsHistory = payload.handsHistory;
  const tillPlayedCards = [];
  for (let hand of handsHistory) {
    tillPlayedCards.concat(hand[1]);
  }
  return tillPlayedCards;
};

function randomChoice(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

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
      let cardPlayer = players[(players.indexOf(starterPlayer) + 1) % 4];
      if (cardPlayer !== playerId) {
        cardsLost[cardPlayer].add(starterCardSuit);
      }
    }
    forthCard = eachHand[1][1];
    if (forthCard[1] !== starterCardSuit) {
      let cardPlayer = players[(players.indexOf(starterPlayer) + 1) % 4];
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
};
