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
    GameState.PLAYER = this.payload['playerId'];
  }

  terminalValue() {
    var to_return = null;
    if (this.payload['handsHistory'].length === 8) {
      let bidders = {};
      let nonBidders = {};
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
      if (bidders['won'] >= bidders['bid']) {
        if (bidders['players'].includes(GameState.MAX_1) || bidders['players'].includes(GameState.MAX_2)) {
          to_return = 1;
        } else {
          to_return = 0;
        }
        // if we are the bid winner
      } else if (nonBidders['won'] > GameState.MAX_BID_VALUE - bidValue) {
        if (nonBidders['players'].includes(GameState.MAX_1) || nonBidders['players'].includes(GameState.MAX_2)) {
          to_return = 1;
        } else {
          to_return = 0;
        }
      }
      var trumpRevealed = this.payload['trumpRevealed'];
      if (!to_return) {
        if (trumpRevealed) {
          return 0;
        } else {
          return 1;
        }
      }
    }
    return to_return;
  }
  getLegalMoves() {
    var playerId = this.payload['playerId'];
    var myCards = this.payload[playerId];
    var trumpRevealed = this.payload['trumpRevealed'];
    var trumpSuit = this.payload['trumpSuit'];
    var playedCards = this.payload['played'];
    var sortedPlayedCards = playedCards.sort((a, b) => cardPriority(b) - cardPriority(a));
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
      let legalMoves = JSON.parse(JSON.stringify(myCards));
      legalMoves.push('OT');
      return legalMoves;
    }

    if (trumpSuit) {
      const myTrumpCards = getSuitCards(myCards, trumpSuit);
      const didIRevealTheTrumpInThisHand =
        trumpRevealed && trumpRevealed.playerId === playerId && trumpRevealed.hand === handsHistory.length + 1;

      if (didIRevealTheTrumpInThisHand) {
        if (myTrumpCards.length === 0) {
          return myCards;
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
    var doneCards = getTillPlayedCards(this.payload).concat(this.payload['played'], this.payload['cards']);

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
      let randomCard = randomChoice(remainingCards);
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
        this.payload['guessTrumpSuit'] = randomChoice(['C', 'D', 'H', 'S']);
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
    } else if (this.payload.length < 3) {
      removeElement(this.payload[playerId], move);
      playerId = this.payload['playerIds'][(this.payload['playerIds'].indexOf(playerId) + 1) % 4];
      this.payload['played'].push(move);
    } else {
      this.payload['played'].push(move);
      let highestCardInPlayedCards = getHighestCardInPlayedCards(this.payload);
      const players = this.payload['playerIds'];
      let starterPlayer = this.payload['playerIds'][(this.payload['playerIds'].indexOf(playerId) + 1) % 4];

      const idxOfWinner = playerId.indexOf(highestCardInPlayedCards);

      let winner = players[(players.indexOf(playerId) + idxOfWinner) % 4];

      let totalValue = 0;
      for (let eachPlayed of this.payload['played']) {
        let rank = eachPlayed[0];
        if (rank === 'J') totalValue += 3;
        if (rank === '9') totalValue += 2;
        if (rank === 'T' || rank === '1') totalValue += 1;
      }

      removeElement(playerId, move);
      for (let teamInfo of this.payload['teams']) {
        if (teamInfo['players'].includes(winner)) {
          teamInfo['won'] += totalValue;
        }
      }

      //deep copy
      let newPlayed = JSON.parse(JSON.stringify(this.payload['played']));
      this.payload['handsHistory'].push([starterPlayer, newPlayed, winner]);
      playerId = winner;
      this.payload['played'] = [];
    }
  }

  randomPlay() {
    while (this.payload['handsHistory'].length < 8) {
      var legalMoves = this.getLegalMoves();

      this.makeAMove(randomChoice(legalMoves));
    }
    return this.terminalValue();
  }

  mcts(givenTime) {
    var bestMove;
    var start = new Date().getTime();
    let visitsScore = {};
    let legalMoves = this.getLegalMoves();
    for (let move of legalMoves) {
      visitsScore[move] = [0, 0];
    }
    var iterations = 0;
    while (true) {
      let elapsedTime = new Date().getTime() - start;
      if (elapsedTime > givenTime) {
        break;
      }
      var maxUcb = -Infinity;
      for (let item of Object.entries(visitsScore)) {
        let visits = item[1][0];
        let score = item[1][1];
        var newUcb = Infinity;
        if (visits !== 0) {
          newUcb = score / visits + Math.sqrt((2 * Math.log(iterations)) / visits);
        }
        if (newUcb > maxUcb) {
          maxUcb = newUcb;
          bestMove = item[0];
        }
      }

      // let newPayload = JSON.parse(JSON.stringify(this.payload));
      // var tempState = new GameState(newPayload);
      var tempState = _.cloneDeep(this);
      tempState.randomlyDistribute();
      tempState.makeAMove(bestMove);
      var result = tempState.randomPlay();
      // console.log('result:', result);

      visitsScore[bestMove][0] += 1;
      if (result === 1) {
        visitsScore[bestMove][1] += result;
      }
      iterations += 1;
    }
    return visitsScore;
  }

  show() {
    let legalMoves = this.getLegalMoves();
    if (legalMoves.length === 1) {
      return legalMoves[0];
    }
    let time_for_simulation = this.payload['timeRemaining'];
    let turns_to_play = 8 - this.payload['handsHistory'].length;
    var adjusted_time;

    if (this.payload['handsHistory'].length === 0) {
      adjusted_time = time_for_simulation / turns_to_play + 120;
    } else if (this.payload['handsHistory'].length == 1) {
      adjusted_time = time_for_simulation / turns_to_play + 90;
    } else if (this.payload['handsHistory'].length === 2) {
      adjusted_time = time_for_simulation / turns_to_play + 80;
    } else if (this.payload['handsHistory'].length === 3) {
      adjusted_time = time_for_simulation / turns_to_play + 65;
    } else if (this.payload['handsHistory'].length === 4) {
      adjusted_time = time_for_simulation / turns_to_play + 40;
    } else if (this.payload['handsHistory'].length === 5) {
      adjusted_time = time_for_simulation / turns_to_play + 30;
    } else if (this.payload['handsHistory'].length === 6) {
      adjusted_time = time_for_simulation / turns_to_play + 10;
    } else if (this.payload['handsHistory'].length === 7) {
      adjusted_time = time_for_simulation - 10;
    }

    let play_data = this.mcts(adjusted_time);
    let besters = Object.entries(play_data);
    let sortedBesters = besters.sort((a, b) => a[1][0] - b[1][0]);
    console.log(this.payload.playerId, sortedBesters);
    return sortedBesters[0][0];
  }
}

module.exports = GameState;
