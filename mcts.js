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
  getTotalValue,
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
    this.cardsLost = getLostSuitByOther(payload);
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
          toReturn = -nonBidders['won'] / 28;
        }
      } else if (nonBidders['won'] > GameState.MAX_BID_VALUE - bidValue) {
        if (nonBidders['players'].includes(this.MAX_1) || nonBidders['players'].includes(this.MAX_2)) {
          // toReturn = nonBidders['won'] / (GameState.MAX_BID_VALUE + 1 - bidValue);
          toReturn = nonBidders['won'] / 28;
        } else {
          toReturn = -bidders['won'] / 28;
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
  // isTerminal() {
  //   if (this.terminalValue() === 1 || this.terminalValue() === -1 || this.terminalValue() === 0) {
  //     return true;
  //   }
  //   return false;
  // }
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
    if (playedCards[0] == null) {
      console.log(this.payload);
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
  getWinningMoves() {
    let legalMoves = this.getLegalMoves();
    let currentlyPlayedCards = this.payload.played;
    if (currentlyPlayedCards.length > 0) {
      if (legalMoves.length === 1) {
        return legalMoves;
      }
      let winningCards = [];
      let highedCardPlayed = getHighestCardInPlayedCards(this.payload);
      if (legalMoves.includes('OT')) {
        if (isFriendWinning(this.payload)) {
          removeElement(legalMoves, 'OT');
          return legalMoves;
        }
        if (getTotalValue(currentlyPlayedCards) > 0) {
          winningCards.push('OT');
          return winningCards;
        } else {
          return legalMoves;
        }
      }

      for (let move of legalMoves) {
        if (move[1] === highedCardPlayed[1] && cardPriority(move) > cardPriority(highedCardPlayed)) {
          winningCards.push(move);
        }
      }
      if (winningCards.length > 0) {
        return winningCards;
      }
      for (let move of legalMoves) {
        if (move[1] === this.payload.trumpSuit && highedCardPlayed[1] !== this.payload.trumpSuit) {
          winningCards.push(move);
        }
      }
      if (winningCards.length > 0) {
        return winningCards;
      }

      return legalMoves;
    }
    return legalMoves;
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
    // var cardsLost = getLostSuitByOther(this.payload);
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

    var cardsLost = this.cardsLost;

    this.payload[player2] = [];
    this.payload[player3] = [];
    this.payload[player4] = [];

    var vertices = remainingCards.length + 5;
    var adj = Array.from({ length: vertices }, () => Array(vertices).fill(0));

    adj[0][1] = gets_count[player2];
    adj[0][2] = gets_count[player3];
    adj[0][3] = gets_count[player4];

    if (this.payload.handsHistory.length === 0) {
      this.randomlyDistribute();
    } else {
      var offset = 4;
      for (let [idx, card] of remainingCards.entries()) {
        if (!cardsLost[player2].has(card[1])) adj[1][idx + offset] += 1;
        if (!cardsLost[player3].has(card[1])) adj[2][idx + offset] += 1;
        if (!cardsLost[player4].has(card[1])) adj[3][idx + offset] += 1;
      }

      var card_node = 4;
      for (var card_node = 4; card_node < vertices - 1; ++card_node) adj[card_node][vertices - 1] += 1;

      function bfs(resGraph, s, t, parent) {
        let n = t + 1;
        let visited = new Array(n);
        for (let i = 0; i < n; ++i) {
          visited[i] = false;
        }

        let q = [];
        //pushing source to the queue and marking it as visited
        q.push(s);
        visited[s] = true;
        parent[s] = -1;

        while (q.length != 0) {
          let u = q.shift();
          for (let v = 0; v < n; ++v) {
            if (visited[v] === false && resGraph[u][v] > 0) {
              //if a path is found to the sink ; return true
              if (v === t) {
                parent[v] = u;
                return true;
              }
              q.push(v);
              parent[v] = u;
              visited[v] = true;
            }
          }
        }
        //no augmenting path was found to the sink ; return false
        return false;
      }

      let max_flow = 0;
      var parent = [];
      var s = 0;
      var t = vertices - 1;
      while (bfs(adj, s, t, parent)) {
        let bottle_neck = Number.MAX_VALUE;
        for (let v = t; v != s; v = parent[v]) {
          let u = parent[v];
          bottle_neck = Math.min(bottle_neck, adj[u][v]);
        }
        for (let v = t; v != s; v = parent[v]) {
          let u = parent[v];
          adj[u][v] -= bottle_neck;
          adj[v][u] += bottle_neck;
        }
        max_flow += bottle_neck;
      }

      for (let i = 4; i < vertices - 1; ++i) {
        if (adj[i][1] === 1) {
          this.payload[player2].push(remainingCards[i - 4]);
        } else if (adj[i][2] === 1) {
          this.payload[player3].push(remainingCards[i - 4]);
        } else if (adj[i][3] === 1) {
          this.payload[player4].push(remainingCards[i - 4]);
        } else {
          console.log('UNREACHABLE, CONTACT MANOJ');
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
    var cardsLost = this.cardsLost;
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

      let legalMoves = this.getWinningMoves();
      // let legalMoves = this.getLegalMoves();
      let toMove = _.sample(legalMoves);
      this.makeAMove(toMove);
    }
    return this.terminalValue();
    // return this.dynamicTerminalValue();
  }
}
module.exports = GameState;
