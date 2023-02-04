const _ = require('lodash');
const {
  getSuitCards,
  cardPriority,
  getHighestCardInPlayedCards,
  getLostSuitByOther,
  getTillPlayedCards,
  getSuit,
  removeElement,
  isFriendWinning,
} = require('./shared');

class GameState {
  static ITERATIONS = 8;

  // static MAX_1 = '.';
  // static MAX_2 = '.';
  // static MIN_1 = '.';
  // static MIN_2 = '.';
  static TRUMPER = '';

  static MAX_VALUE = 1;
  static MIN_VALUE = -1;

  static MAX_BID_VALUE = 28;

  constructor(payload) {
    this.payload = payload;
  }
  oneTimeCall() {
    this.MAX_1 = this.payload['playerId'];
    this.MAX_2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 2) % 4];
    this.MIN_1 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 1) % 4];
    this.MIN_2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 3) % 4];
    this.payload[this.payload['playerId']] = this.payload['cards'];
  }

  dynamicTerminalValue() {
    if (this.payload.handsHistory.length === 8) {
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
      // console.log(bidders);
      // console.log(nonBidders);
      if (bidders['won'] >= bidders['bid']) {
        if (bidders['players'].includes(this.MAX_1) || bidders['players'].includes(this.MAX_2)) {
          toReturn = bidders['won'] / 28;
        } else {
          toReturn = 0;
        }
      } else if (nonBidders['won'] > GameState.MAX_BID_VALUE - bidValue) {
        if (nonBidders['players'].includes(this.MAX_1) || nonBidders['players'].includes(this.MAX_2)) {
          // toReturn = nonBidders['won'] / (GameState.MAX_BID_VALUE + 1 - bidValue);
          toReturn = nonBidders['won'] / 28;
        } else {
          toReturn = 0;
        }
      }
      if (!trumpRevealed) {
        return 0;
      }
      return toReturn;
    }
    console.log('FUCK YOU!!!!!!!!!!!!!!!!!!!');
  }
  terminalValue() {
    if (this.payload.handsHistory.length === 8) {
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
        if (bidders['players'].includes(this.MAX_1) || bidders['players'].includes(this.MAX_2)) {
          toReturn = 1;
        } else if (bidders['players'].includes(this.MIN_1) || bidders['players'].includes(this.MIN_2)) {
          toReturn = -1;
        }
      } else if (nonBidders['won'] > GameState.MAX_BID_VALUE - bidValue) {
        if (nonBidders['players'].includes(this.MAX_1) || nonBidders['players'].includes(this.MAX_2)) {
          toReturn = 1;
        } else if (nonBidders['players'].includes(this.MIN_1) || nonBidders['players'].includes(this.MIN_2)) {
          toReturn = -1;
        }
      }
      if (!this.payload.trumpRevealed) {
        return 0;
      }
      return toReturn;
    }
    return false;
  }
  isTerminal() {
    if (this.terminalValue() === 1 || this.terminalValue() === -1 || this.terminalValue() === 0) {
      return true;
    }
    return false;
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
    // console.log(playedCards.length);

    // console.log(playedCards);
    var currentSuit = playedCards[0][1];
    var suitCards = getSuitCards(myCards, currentSuit);

    if (suitCards.length > 0) {
      return suitCards;
    }

    if (!trumpRevealed) {
      let legalMoves = _.cloneDeep(myCards);
      legalMoves.push('OT');
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
    }
    return myCards;
  }
  bipartite_distribute() {
    const suits = ['C', 'D', 'H', 'S'];
    const ranks = ['J', '9', '1', 'T', 'K', 'Q', '8', '7'];
    const allPossibilities = [];
    for (let suit of suits) {
      for (let rank of ranks) {
        allPossibilities.push(rank + suit);
      }
    }
    let player2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 1) % 4];
    let player3 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 2) % 4];
    let player4 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 3) % 4];
    var cardsLost = getLostSuitByOther(this.payload);
    var doneCards = getTillPlayedCards(this.payload);
    var played = this.payload.played;
    var ownCards = this.payload[this.payload['playerId']];
    doneCards = doneCards.concat(played, ownCards);
    var remainingCards = [];
    for (let card of allPossibilities) {
      if (!doneCards.includes(card)) {
        remainingCards.push(card);
      }
    }
    remainingCards = _.shuffle(remainingCards);

    var noOfCardsToDistribute = remainingCards.length;
    var gets_count = {};
    gets_count[player2] = Math.floor(noOfCardsToDistribute / 3) + (noOfCardsToDistribute % 3 >= 1);
    gets_count[player3] = Math.floor(noOfCardsToDistribute / 3) + (noOfCardsToDistribute % 3 >= 2);
    gets_count[player4] = Math.floor(noOfCardsToDistribute / 3);

    var cardsLost = {};
    cardsLost[player2] = new Set();
    cardsLost[player3] = new Set();
    cardsLost[player4] = new Set();
    var players = this.payload['playerIds'];

    for (let each_hand of this.payload.handsHistory) {
      let starterPlayer = each_hand[0];
      let handCards = each_hand[1];
      let startSuit = handCards[0][1];

      let secondCard = handCards[1];
      if (secondCard[1] !== startSuit) {
        let cardPlayer = players[(players.indexOf(starterPlayer) + 1) % 4];
        if (cardPlayer !== this.payload['playerId']) cardsLost[cardPlayer].add(startSuit);
      }

      let thirdCard = handCards[2];
      if (thirdCard[1] !== startSuit) {
        let cardPlayer = players[(players.indexOf(starterPlayer) + 2) % 4];
        if (cardPlayer !== this.payload['playerId']) cardsLost[cardPlayer].add(startSuit);
      }

      let forthCard = handCards[3];
      if (forthCard[1] !== startSuit) {
        let cardPlayer = players[(players.indexOf(starterPlayer) + 3) % 4];
        if (cardPlayer !== this.payload['playerId']) cardsLost[cardPlayer].add(startSuit);
      }
    }
    if (this.payload['played'].length >= 2) {
      var firstCardPlayer;
      if (this.payload.handsHistory.length === 0) {
        if (this.payload['played'].length === 2) {
          firstCardPlayer = players[(players.indexOf(this.payload.playerId) - 2 + 4) % 4];
        } else if (this.payload['played'].length === 3) {
          firstCardPlayer = players[(players.indexOf(this.payload.playerId) - 3 + 4) % 4];
        } else {
          console.log('DONY BE HERE');
        }
      } else {
        let lastHand = this.payload.handsHistory[this.payload.handsHistory.length - 1];
        firstCardPlayer = lastHand[2];
      }
      let firstCard = this.payload['played'][0];
      let secondCard = this.payload['played'][1];
      let secondCardPlayer = players[(players.indexOf(firstCardPlayer) + 1) % 4];
      if (secondCard[1] !== firstCard[1]) cardsLost[secondCardPlayer].add(firstCard[1]);

      if (this.payload['played'].length === 3) {
        let thirdCard = this.payload['played'][2];
        let thirdCardPlayer = players[(players.indexOf(firstCardPlayer) + 2) % 4];
        if (thirdCard[1] !== firstCard[1]) cardsLost[thirdCardPlayer].add(firstCard[1]);
      }
    }
    this.payload[player2] = [];
    this.payload[player3] = [];
    this.payload[player4] = [];

    var not_cut = {};
    not_cut[player2] = new Set();
    not_cut[player3] = new Set();
    not_cut[player4] = new Set();
    for (let each of ['C', 'D', 'H', 'S']) {
      if (!cardsLost[player2].has(each)) not_cut[player2].add(each);
      if (!cardsLost[player3].has(each)) not_cut[player3].add(each);
      if (!cardsLost[player4].has(each)) not_cut[player4].add(each);
    }

    var vertices = remainingCards.length + 5;
    var adj = Array.from({ length: vertices }, () => Array(vertices).fill(0));

    adj[0][1] = gets_count[player2];
    adj[0][2] = gets_count[player3];
    adj[0][3] = gets_count[player4];

    if (false) {
    } else {
      var offset = 4;
      for (let [idx, card] of remainingCards.entries()) {
        if (not_cut[player2].has(card[1])) adj[1][idx + offset] += 1;
        if (not_cut[player3].has(card[1])) adj[2][idx + offset] += 1;
        if (not_cut[player4].has(card[1])) adj[3][idx + offset] += 1;
      }

      var card_node = 4;
      for (var card_node = 4; card_node < vertices - 1; ++card_node) adj[card_node][vertices - 1] += 1;

      var visited = Array(vertices).fill(false);
      var path = [];
      var pathfound = false;

      function dfs(current) {
        if (pathfound) return true;

        path.push(current);
        if (current === vertices - 1) pathfound = true;

        visited[current] = true;
        for (let i = 0; i < adj[current].length; i++) {
          if (adj[current][i] > 0 && !visited[i]) {
            dfs(i);
          }
        }
        if (pathfound) {
          return true;
        }
        path.pop();
      }

      let max_flow = 0;
      while (true) {
        visited = Array(vertices).fill(false);
        path = [];
        pathfound = false;
        let path_exists = dfs(0);
        if (!path_exists) {
          break;
        }
        let path_bottleneck = Infinity;
        for (let idx = 0; idx < path.length - 1; idx++) {
          path_bottleneck = Math.min(path_bottleneck, adj[path[idx]][path[idx + 1]]);
        }
        max_flow += path_bottleneck;

        for (let idx = 0; idx < path.length - 1; idx++) {
          adj[path[idx]][path[idx + 1]] -= path_bottleneck;
          adj[path[idx + 1]][path[idx]] += path_bottleneck;
        }

        for (let idx = 1; idx < path.length - 2; idx++) {
          let x = path[idx],
            y = path[idx + 1];
          if (x < 4) {
            let card_in_here = remainingCards[y - offset];
            if (x === 1) {
              this.payload[player2].push(card_in_here);
            } else if (x === 2) {
              this.payload[player3].push(card_in_here);
            } else if (x === 3) {
              this.payload[player4].push(card_in_here);
            }
          } else if (y < 4) {
            let card_in_here = remainingCards[x - offset];
            if (y === 1) {
              this.payload[player2].splice(this.payload[player2].indexOf(card_in_here), 1);
            } else if (y === 2) {
              this.payload[player3].splice(this.payload[player3].indexOf(card_in_here), 1);
            } else if (y === 3) {
              this.payload[player4].splice(this.payload[player4].indexOf(card_in_here), 1);
            }
          }
        }
      }
    }

    if (this.payload.trumpSuit) {
      this.payload.originalTrumpSuit = this.payload.trumpSuit;
      this.payload.guessTrumpSuit = '-1';
    } else {
      let suits = ['C', 'S', 'H', 'D'];
      this.payload.guessTrumpSuit = _.sample(suits);
      this.payload.originalTrumpSuit = '-1';
    }
  }
  randomlyDistributeWithoutLostSuit() {
    let suits = ['C', 'D', 'H', 'S'];
    suits = _.shuffle(suits);
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
    // let suitCards = getSuitCardObj(remainingCards);
    remainingCards = _.shuffle(remainingCards);
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
    }
    if (this.payload.trumpSuit) {
      this.payload.originalTrumpSuit = this.payload.trumpSuit;
      this.payload.guessTrumpSuit = '-1';
    } else {
      let suits = ['C', 'S', 'H', 'D'];
      this.payload.guessTrumpSuit = _.sample(suits);
      this.payload.originalTrumpSuit = '-1';
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
    }

    if (this.payload.trumpSuit) {
      this.payload.originalTrumpSuit = this.payload.trumpSuit;
      this.payload.guessTrumpSuit = '-1';
    } else {
      let suits = ['C', 'S', 'H', 'D'];
      this.payload.guessTrumpSuit = _.sample(suits);
      this.payload.originalTrumpSuit = '-1';
    }
  }

  makeAMove(move) {
    var playerId = this.payload['playerId'];
    // if (!this.payload.trumpRevealed) {
    //   console.log(this.payload.trumpSuit, this.payload.originalTrumpSuit, this.payload.guessTrumpSuit);
    // }
    if (move === 'OT') {
      if (!this.payload.trumpSuit) {
        if (this.payload.originalTrumpSuit === '-1') {
          this.payload.trumpSuit = this.payload.guessTrumpSuit;
        } else if (this.payload.guessTrumpSuit === '-1') {
          this.payload.trumpSuit = this.payload.originalTrumpSuit;
        }
      }
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
      // console.log(this.payload.trumpRevealed, this.payload.originalTrumpSuit, this.payload.guessTrumpSuit);
      if (!this.payload['trumpRevealed']) {
        let bidHistory = this.payload.bidHistory;
        let passingPlayers = [];

        for (let playerBid of bidHistory) {
          if (playerBid[1] === 0) {
            passingPlayers.push(playerBid[0]);
          }
        }
        var bidWinner;
        for (let player of this.payload.playerIds) {
          if (!passingPlayers.includes(player)) {
            bidWinner = player;
            break;
          }
        }
        // console.log(this.payload.originalTrumpSuit, this.payload.guessTrumpSuit);
        if (this.payload.playerId === bidWinner) {
          if (this.payload.originalTrumpSuit !== '-1') {
            this.payload.trumpSuit = this.payload.originalTrumpSuit;
          } else if (this.payload.guessTrumpSuit !== '-1') {
            this.payload.trumpSuit = this.payload.guessTrumpSuit;
          }
        } else if (this.payload.playerId !== bidWinner) {
          this.payload.trumpSuit = false;
        }
      }
      if (this.payload.trumpRevealed && !this.payload.trumpSuit) {
        if (this.payload.originalTrumpSuit !== '-1') {
          this.payload.trumpSuit = this.payload.originalTrumpSuit;
        } else if (this.payload.guessTrumpSuit !== '-1') {
          this.payload.trumpSuit = this.payload.guessTrumpSuit;
        }
      }

      var legalMoves = this.getLegalMoves();
      // console.log('inside random play');
      let toMove = _.sample(legalMoves);
      // console.log(legalMoves, toMove);
      // if (legalMoves.length === 0) {
      //   console.log(this.payload);
      // }
      this.makeAMove(toMove);
    }
    return this.terminalValue();
    // return this.dynamicTerminalValue();
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
    let i = 0;
    while (given_time > 0) {
      i += 1;
      var start = new Date().getTime();
      this.randomlyDistributeWithoutLostSuit();
      // this.bipartite_distribute();
      // this.randomlyDistribute();
      for (let card of legalMoves) {
        var tempState = _.cloneDeep(this);
        tempState.makeAMove(card);
        var result = tempState.randomPlay(i);
        scores[card] += result;
      }
      let end = new Date().getTime();
      given_time -= end - start;
    }
    // console.log('For:', legalMoves.length);
    // console.log('Total Iterations:', i);
    return scores;
  }
  show() {
    let legalMoves = this.getLegalMoves();
    if (legalMoves.length === 1) {
      return legalMoves[0];
    }
    let time_for_simulation = this.payload['timeRemaining'];
    let turns_to_play = 8 - this.payload['handsHistory'].length;
    var adjusted_time;
    let time = {
      8: 6 / 29,
      7: 6 / 29,
      6: 5 / 29,
      5: 4 / 29,
      4: 3 / 29,
      3: 5 / 58,
      2: 3 / 58,
      1: 0.8,
    };
    adjusted_time = (0.28 - 0.01 * turns_to_play) * time_for_simulation;
    console.log(adjusted_time);

    // if (this.payload['handsHistory'].length === 0) {
    //   adjusted_time = time_for_simulation / (turns_to_play - 1) + 120;
    // } else if (this.payload['handsHistory'].length == 1) {
    //   adjusted_time = time_for_simulation / (turns_to_play - 1) + 90;
    // } else if (this.payload['handsHistory'].length === 2) {
    //   adjusted_time = time_for_simulation / (turns_to_play - 1) + 90;
    // } else if (this.payload['handsHistory'].length === 3) {
    //   adjusted_time = time_for_simulation / (turns_to_play - 1) + 90;
    // } else if (this.payload['handsHistory'].length === 4) {
    //   adjusted_time = time_for_simulation / (turns_to_play - 1) + 40;
    // } else if (this.payload['handsHistory'].length === 5) {
    //   adjusted_time = time_for_simulation / (turns_to_play - 1) + 40;
    // } else if (this.payload['handsHistory'].length === 6) {
    //   adjusted_time = (time_for_simulation + 60) / turns_to_play;
    // } else if (this.payload['handsHistory'].length === 7) {
    //   adjusted_time = time_for_simulation - 10;
    // }
    var playData = this.scoreRandomPlay(adjusted_time);
    let besters = Object.entries(playData);
    let copyBesters = _.cloneDeep(besters);
    let sortedBesters = copyBesters.sort((a, b) => b[1] - a[1]);
    let toMove;
    let trumpSuit = this.payload.trumpSuit;
    let highestScore = sortedBesters[0][1];
    var collection = [];
    toMove = sortedBesters[0][0];
    // console.log(sortedBesters);
    return toMove;
  }
}
module.exports = GameState;
