const { max } = require('lodash');
const _ = require('lodash');
const {
  getSuitCards,
  cardPriority,
  getHighestCardInPlayedCards,
  getLostSuitByOther,
  getTillPlayedCards,
  getSuit,
  randomChoice,
  removeElement,
  isFriendWinning,
  getSirOfSuit,
  getTotalValue,
  getPlayCard,
} = require('./shared');

class GameState {
  static ITERATIONS = 8;

  static MAX_1 = '.';
  static MAX_2 = '.';
  static MIN_1 = '.';
  static MIN_2 = '.';
  static TRUMPER = '';

  static MAX_VALUE = 1;
  static MIN_VALUE = -1;

  static MAX_BID_VALUE = 28;

  static PLAYER = '';
  constructor(payload) {
    this.payload = payload;
  }
  oneTimeCall() {
    GameState.MAX_1 = this.payload['playerId'];
    GameState.MAX_2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 2) % 4];
    GameState.MIN_1 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 1) % 4];
    GameState.MIN_2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 3) % 4];
    this.payload[this.payload['playerId']] = this.payload['cards'];
  }

  dynamicTerminalValue() {
    if (this.payload.handsHistory.length === 8) {
      // console.log(this.payload.teams);
      let trumpRevealed = this.payload['trumpRevealed'];
      var bidders = {};
      var nonBidders = {};
      for (let team_info of this.payload['teams']) {
        if (team_info['bid'] === 0) {
          nonBidders['players'] = team_info['players'];
          nonBidders['bid'] = 0;
          nonBidders['won'] = team_info['won'];
        } else {
          bidders['players'] = team_info['players'];
          bidders['bid'] = team_info['bid'];
          bidders['won'] = team_info['won'];
        }
      }

      var bidValue = bidders['bid'];
      var toReturn;
      if (bidders['won'] >= bidders['bid']) {
        if (bidders['players'].includes(GameState.MAX_1) || bidders['players'].includes(GameState.MAX_2)) {
          toReturn = bidders['won'] / bidders['bid'];
        } else {
          toReturn = nonBidders['won'] / (GameState.MAX_BID_VALUE + 1 - bidValue);
        }
      } else if (nonBidders['won'] > GameState.MAX_BID_VALUE - bidValue) {
        if (nonBidders['players'].includes(GameState.MAX_1) || nonBidders['players'].includes(GameState.MAX_2)) {
          toReturn = nonBidders['won'] / (GameState.MAX_BID_VALUE + 1 - bidValue);
        } else {
          toReturn = bidders['won'] / bidders['bid'];
        }
      }
      return toReturn;
    }
  }
  terminalValue() {
    if (this.payload.handsHistory.length === 8) {
      // console.log(this.payload.teams);
      let trumpRevealed = this.payload['trumpRevealed'];
      var bidders = {};
      var nonBidders = {};
      for (let team_info of this.payload['teams']) {
        if (team_info['bid'] === 0) {
          nonBidders['players'] = team_info['players'];
          nonBidders['bid'] = 0;
          nonBidders['won'] = team_info['won'];
        } else {
          bidders['players'] = team_info['players'];
          bidders['bid'] = team_info['bid'];
          bidders['won'] = team_info['won'];
        }
      }

      var bidValue = bidders['bid'];
      var toReturn;
      if (bidders['won'] >= bidders['bid']) {
        if (bidders['players'].includes(GameState.MAX_1) || bidders['players'].includes(GameState.MAX_2)) {
          toReturn = 1;
        } else {
          toReturn = 0;
        }
      } else if (nonBidders['won'] > GameState.MAX_BID_VALUE - bidValue) {
        if (nonBidders['players'].includes(GameState.MAX_1) || nonBidders['players'].includes(GameState.MAX_2)) {
          toReturn = 1;
        } else {
          toReturn = 0;
        }
      }
      return toReturn;
    }
  }

  getLegalMoves() {
    var playerId = this.payload['playerId'];
    var myCards = this.payload[playerId];
    var trumpRevealed = this.payload['trumpRevealed'];
    var trumpSuit = this.payload['trumpSuit'];
    var playedCards = this.payload['played'];
    var handsHistory = this.payload['handsHistory'];

    if (playedCards.length === 0) {
      return myCards;
    }

    var currentSuit = playedCards[0][1];
    var suitCards = getSuitCards(myCards, currentSuit);

    if (suitCards.length > 0) {
      return suitCards;
    }

    if (!trumpRevealed) {
      let legalMoves = _.cloneDeep(myCards);
      legalMoves.push('OT');
      // console.log(legalMoves);
      return legalMoves;
    }

    if (trumpSuit) {
      const myTrumpCards = getSuitCards(myCards, trumpSuit);
      const didIRevealTheTrumpInThisHand =
        trumpRevealed.playerId === playerId && trumpRevealed.hand === handsHistory.length + 1;

      if (didIRevealTheTrumpInThisHand) {
        if (myTrumpCards.length === 0) {
          return myCards;
        }

        if (isFriendWinning(this.payload)) {
          return myTrumpCards;
        }

        // get highest card in the played cards
        var highestCard = getHighestCardInPlayedCards(this.payload);
        if (highestCard[1] !== trumpSuit) {
          return myTrumpCards;
        }
        const winningTrumps = [];
        for (let card of myTrumpCards) {
          if (cardPriority(card) > cardPriority(highestCard)) {
            winningTrumps.push(card);
          }
        }

        if (winningTrumps.length > 0) {
          return winningTrumps;
        } else {
          return myTrumpCards;
        }
      }

      return myCards;
    }
    return myCards;
  }

  randomlyDistributeWithoutLostSuit() {
    const suits = ['C', 'D', 'H', 'S'];
    const ranks = ['J', '9', '1', 'T', 'K', 'Q', '8', '7'];
    const allPossibilities = [];
    for (let suit of suits) {
      for (let rank of ranks) {
        allPossibilities.push(rank + suit);
      }
    }
    this.payload[this.payload['playerId']] = this.payload['cards'];
    let player2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 1) % 4];
    let player3 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 2) % 4];
    let player4 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 3) % 4];

    // lost suit by others
    var cardsLost = getLostSuitByOther(this.payload);
    var doneCards = getTillPlayedCards(this.payload);
    var played = this.payload.played;
    var ownCards = this.payload.cards;

    doneCards = doneCards.concat(played, ownCards);

    var remainingCards = [];
    for (let card of allPossibilities) {
      if (!doneCards.includes(card)) {
        remainingCards.push(card);
      }
    }

    let noOfCardsToDistribute = remainingCards.length;
    let p2CanGet = 0;
    let p3CanGet = 0;
    let p4CanGet = 0;

    while (true) {
      p2CanGet += 1;
      noOfCardsToDistribute -= 1;
      if (noOfCardsToDistribute <= 0) {
        break;
      }

      p3CanGet += 1;
      noOfCardsToDistribute -= 1;
      if (noOfCardsToDistribute <= 0) {
        break;
      }
      p4CanGet += 1;
      noOfCardsToDistribute -= 1;
      if (noOfCardsToDistribute <= 0) {
        break;
      }
    }

    this.payload[player2] = [];
    this.payload[player3] = [];
    this.payload[player4] = [];
    while (remainingCards.length > 0) {
      let randomCard = _.sample(remainingCards);
      if (p2CanGet > 0) {
        this.payload[player2].push(randomCard);
        removeElement(remainingCards, randomCard);
        p2CanGet -= 1;
      } else if (p3CanGet > 0) {
        this.payload[player3].push(randomCard);
        removeElement(remainingCards, randomCard);
        p3CanGet -= 1;
      } else if (p4CanGet > 0) {
        this.payload[player4].push(randomCard);
        removeElement(remainingCards, randomCard);
        p4CanGet -= 1;
      }
      if (this.payload['trumpSuit']) {
        this.payload['guessTrumpSuit'] = this.payload['trumpSuit'];
        this.payload['realness'] = true;
      } else {
        let suits = ['C', 'D', 'H', 'S'];
        this.payload['guessTrumpSuit'] = _.sample(suits);
        this.payload['realness'] = false;
      }
    }
  }

  randomlyDistribute() {
    const suits = ['C', 'D', 'H', 'S'];
    const ranks = ['J', '9', '1', 'T', 'K', 'Q', '8', '7'];
    const allPossibilities = [];
    for (let suit of suits) {
      for (let rank of ranks) {
        allPossibilities.push(rank + suit);
      }
    }
    this.payload[this.payload['playerId']] = this.payload['cards'];
    let player2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 1) % 4];
    let player3 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 2) % 4];
    let player4 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 3) % 4];

    // lost suit by others
    var cardsLost = getLostSuitByOther(this.payload);
    var doneCards = getTillPlayedCards(this.payload);
    var played = this.payload.played;
    var ownCards = this.payload.cards;

    doneCards = doneCards.concat(played, ownCards);

    var remainingCards = [];
    for (let card of allPossibilities) {
      if (!doneCards.includes(card)) {
        remainingCards.push(card);
      }
    }

    let noOfCardsToDistribute = remainingCards.length;
    let p2CanGet = 0;
    let p3CanGet = 0;
    let p4CanGet = 0;

    while (true) {
      p2CanGet += 1;
      noOfCardsToDistribute -= 1;
      if (noOfCardsToDistribute <= 0) {
        break;
      }

      p3CanGet += 1;
      noOfCardsToDistribute -= 1;
      if (noOfCardsToDistribute <= 0) {
        break;
      }
      p4CanGet += 1;
      noOfCardsToDistribute -= 1;
      if (noOfCardsToDistribute <= 0) {
        break;
      }
    }

    this.payload[player2] = [];
    this.payload[player3] = [];
    this.payload[player4] = [];
    while (remainingCards.length > 0) {
      let randomCard = _.sample(remainingCards);
      let randomCardSuit = getSuit(randomCard);
      if (!cardsLost[player2].has(randomCardSuit) && p2CanGet > 0) {
        this.payload[player2].push(randomCard);
        removeElement(remainingCards, randomCard);
        p2CanGet -= 1;
      } else if (!cardsLost[player3].has(randomCardSuit) && p3CanGet > 0) {
        this.payload[player3].push(randomCard);
        removeElement(remainingCards, randomCard);
        p3CanGet -= 1;
      } else if (!cardsLost[player4].has(randomCardSuit) && p4CanGet > 0) {
        this.payload[player4].push(randomCard);
        removeElement(remainingCards, randomCard);
        p4CanGet -= 1;
      } else if (p2CanGet < p3CanGet && p2CanGet < p4CanGet && p2CanGet > 0) {
        this.payload[player2].push(randomCard);
        removeElement(remainingCards, randomCard);
        p2CanGet -= 1;
      } else if (p3CanGet < p2CanGet && p3CanGet < p4CanGet && p3CanGet > 0) {
        this.payload[player3].push(randomCard);
        removeElement(remainingCards, randomCard);
        p3CanGet -= 1;
      } else if (p4CanGet < p2CanGet && p4CanGet < p3CanGet && p4CanGet > 0) {
        this.payload[player4].push(randomCard);
        removeElement(remainingCards, randomCard);
        p4CanGet -= 1;
      } else if (p2CanGet > 0) {
        this.payload[player2].push(randomCard);
        removeElement(remainingCards, randomCard);
        p2CanGet -= 1;
      } else if (p3CanGet > 0) {
        this.payload[player3].push(randomCard);
        removeElement(remainingCards, randomCard);
        p3CanGet -= 1;
      } else if (p4CanGet > 0) {
        this.payload[player4].push(randomCard);
        removeElement(remainingCards, randomCard);
        p4CanGet -= 1;
      }
      if (this.payload['trumpSuit']) {
        this.payload['guessTrumpSuit'] = this.payload['trumpSuit'];
        this.payload['realness'] = true;
      } else {
        let suits = ['C', 'D', 'H', 'S'];
        this.payload['guessTrumpSuit'] = _.sample(suits);
        this.payload['realness'] = false;
      }
    }
  }

  makeAMove(move) {
    var playerId = this.payload['playerId'];

    if (move === 'OT') {
      this.payload['trumpSuit'] = this.payload['guessTrumpSuit'];
      this.payload['trumpRevealed'] = {
        hand: this.payload['handsHistory'].length + 1,
        playerId: this.payload.playerId,
      };
    } else if (this.payload.played.length < 3) {
      removeElement(this.payload[playerId], move);
      this.payload['playerId'] = this.payload['playerIds'][(this.payload['playerIds'].indexOf(playerId) + 1) % 4];
      this.payload['played'].push(move);
    } else if (this.payload.played.length === 3) {
      this.payload['played'].push(move);
      let highestCardInPlayedCards = getHighestCardInPlayedCards(this.payload);
      const players = this.payload['playerIds'];
      let starterPlayer = this.payload['playerIds'][(this.payload['playerIds'].indexOf(playerId) + 1) % 4];

      const idxOfWinner = this.payload['played'].indexOf(highestCardInPlayedCards);
      // 0 1 2 *

      var winner = players[(players.indexOf(playerId) + idxOfWinner + 1) % 4];
      var totalValue = 0;
      for (let eachPlayed of this.payload['played']) {
        let rank = eachPlayed[0];
        if (rank === 'J') totalValue += 3;
        if (rank === '9') totalValue += 2;
        if (rank === 'T' || rank === '1') totalValue += 1;
      }
      removeElement(this.payload[playerId], move);
      for (var teamInfo of this.payload['teams']) {
        if (teamInfo.players.includes(winner)) {
          teamInfo.won += totalValue;
        }
      }
      //deep copy
      var newPlayed = _.cloneDeep(this.payload['played']);
      this.payload['handsHistory'].push([starterPlayer, newPlayed, winner]);
      this.payload['playerId'] = winner;
      this.payload['played'] = [];
    }
  }

  randomPlay() {
    while (this.payload.handsHistory.length < 8) {
      var legalMoves = this.getLegalMoves();
      legalMoves = _.shuffle(legalMoves);
      this.makeAMove(_.sample(legalMoves));
    }
    return this.terminalValue();
  }
  ucbRandomPlay(given_time) {
    var start = new Date().getTime();
    var cardPlayedCount = {};
    var scoreDict = {};
    var legalMoves = this.getLegalMoves();
    if (legalMoves.includes('OT')) {
      removeElement(legalMoves, 'OT');
    }
    var ucbDict = {};
    for (let move of legalMoves) {
      scoreDict[move] = 0;
      cardPlayedCount[move] = 0;
      ucbDict[move] = Infinity;
    }
    var total_parent_visit = 0;
    var end = new Date().getTime();
    given_time -= end - start;
    while (given_time > 0) {
      var start = new Date().getTime();
      this.randomlyDistribute();
      var maxUcbMove = Object.keys(ucbDict).reduce((a, b) => (ucbDict[a] > ucbDict[b] ? a : b));
      var tempState = _.cloneDeep(this);
      tempState.makeAMove(maxUcbMove);
      var result = tempState.randomPlay();
      scoreDict[maxUcbMove] += result;
      cardPlayedCount[maxUcbMove] += 1;
      total_parent_visit += 1;
      for (var card of legalMoves) {
        if (cardPlayedCount[card] > 0) {
          let c = 0.7;
          let exploitation = scoreDict[card] / cardPlayedCount[card];
          let exploration = c * Math.sqrt(Math.log(total_parent_visit) / cardPlayedCount[card]);
          ucbDict[card] = exploitation + exploration;
        }
      }
      var end = new Date().getTime();
      given_time -= end - start;
    }
    for (var card of legalMoves) {
      ucbDict[card] = scoreDict[card] / cardPlayedCount[card];
    }

    return ucbDict;
  }
  scoreRandomPlay(given_time) {
    var scores = {};
    var legalMoves = this.getLegalMoves();
    for (let move of legalMoves) {
      scores[move] = 0;
    }
    while (given_time > 0) {
      var start = new Date().getTime();
      this.randomlyDistribute();
      for (let card of legalMoves) {
        var tempState = _.cloneDeep(this);
        tempState.makeAMove(card);
        var result = tempState.randomPlay();
        scores[card] += result;
      }
      let end = new Date().getTime();
      given_time -= end - start;
    }
    return scores;
  }
  show() {
    let legalMoves = this.getLegalMoves();
    if (legalMoves.length === 1) {
      return legalMoves[0];
    }
    let time_for_simulation = this.payload['timeRemaining'];

    let adjusted_time = 0.27 * time_for_simulation;

    var playData = this.ucbRandomPlay(adjusted_time);
    let besters = Object.entries(playData);
    let copyBesters = _.cloneDeep(besters);
    let sortedBesters = copyBesters.sort((a, b) => b[1] - a[1]);
    let toMove;
    let trumpSuit = this.payload.trumpSuit;
    let highestScore = sortedBesters[0][1];
    var collection = [];
    toMove = sortedBesters[0][0];
    // console.log(toMove);

    if (toMove[0] === '9' && this.payload.played.length === 0) {
      var count_of_dropped_cards = { S: 0, D: 0, H: 0, C: 0 };
      var till_played_cards = getTillPlayedCards(this.payload);
      for (let card of till_played_cards) {
        let key = card[1];
        count_of_dropped_cards[key] += 1;
      }
      var count_of_own_cards = { S: 0, D: 0, H: 0, C: 0 };
      for (let card of this.payload.cards) {
        let key = card[1];
        count_of_own_cards[key] += 1;
      }
      if (trumpSuit) {
        let sir = getSirOfSuit(this.payload, toMove[1]);
        if (sir === toMove && toMove[1] === trumpSuit) {
          return toMove;
        }
        if (sir === toMove && count_of_dropped_cards[trumpSuit] + count_of_own_cards[trumpSuit] === 8) {
          return toMove;
        }
      }
      if (count_of_dropped_cards[toMove[1]] >= 0) {
        for (let b of sortedBesters) {
          if (b[0][0] !== '9') {
            return b[0];
          }
        }
      }
    }

    // if (toMove[0] === '9' && this.payload.played.length === 1 && sortedBesters.length > 1) {
    //   if (this.payload.played[0][0] === 'J' && this.payload.played[0][1] === toMove[1]) {
    //     return sortedBesters[1][0];
    //   }
    // }

    // if (toMove[0] === '9' && this.payload.played.length === 2 && sortedBesters.length > 1) {
    //   if (
    //     this.payload.played[1][0] === 'J' &&
    //     this.payload.played[1][1] === toMove[1] &&
    //     !isFriendWinning(this.payload)
    //   ) {
    //     return sortedBesters[1][0];
    //   }
    // }

    // for (let b of sortedBesters) {
    //   if (b[1] === highestScore) {
    //     collection.push(b);
    //   }
    // }

    // if (collection.length > 1) {
    //   collection.sort((a, b) => cardPriority(b[0]) - cardPriority(a[0]));
    //   if (collection[0][0] === 'OT' && collection[0][1] !== 0) {
    //     return collection[0][0];
    //   }
    //   if (isFriendWinning(this.payload)) {
    //     return sortedBesters[0][0];
    //   }
    //   toMove = _.last(collection)[0];
    // } else {
    //   toMove = sortedBesters[0][0];
    // }
    return toMove;
  }
}
module.exports = GameState;
