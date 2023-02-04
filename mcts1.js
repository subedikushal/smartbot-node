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
  getSirOfSuit,
} = require('./shared');

class cardNode {
  constructor(father) {
    this.father = father;
    this.children = {};
    this.visits = 0;
    this.score = 0;
    this.availability = 0;
    this.available = true;
  }

  showData() {
    console.log('visits =', this.visits);
    console.log('score =', this.score);
    console.log('childrens =', Object.keys(this.children));
    console.log('CHILDRENS');
    for (let child of Object.entries(this.children)) {
      console.log('move:', child[0], child[1].score, child[1].availability, child[1].visits);
    }
    console.log('--------');
  }
}

class GameState {
  static CARDS_DICT = {
    J: 3,
    9: 2,
    1: 1.1,
    T: 1,
    K: 0.4,
    Q: 0.3,
    8: 0.2,
    7: 0.1,
    O: 10,
  };

  static MAX_1 = '  ';
  static MAX_2 = ' ';
  static MIN_1 = ' ';
  static MIN_2 = ' ';
  static TRUMPER = ' ';
  static TRUMPER_CARDS = [];

  static MAX_VALUE = 1;
  static MIN_VALUE = -1;

  static MAX_BID_VALUE = 28;

  //yes bro
  constructor(payload) {
    this.MAX_1 = payload['playerId'];
    this.MAX_2 = payload['playerIds'][(payload['playerIds'].indexOf(payload['playerId']) + 2) % 4];
    this.MIN_1 = payload['playerIds'][(payload['playerIds'].indexOf(payload['playerId']) + 1) % 4];
    this.MIN_2 = payload['playerIds'][(payload['playerIds'].indexOf(payload['playerId']) + 3) % 4];

    let give_upers = new Set();
    for (let each_bid of payload.bidHistory) {
      if (each_bid[1] === 0) {
        give_upers.add(each_bid[0]);
      }
    }
    for (let each_player of payload.playerIds) {
      if (!give_upers.has(each_player)) {
        GameState.TRUMPER = each_player;
        break;
      }
    }
    this.payload = payload;
    this.payload[this.payload['playerId']] = this.payload['cards'];

    //if you are not the trumper then see the cards played by the actual trumper
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
      if (bidders['won'] >= bidders['bid']) {
        if (bidders['players'].includes(this.MAX_1) || bidders['players'].includes(this.MAX_2)) {
          toReturn = bidders['won'] / bidders['bid'];
        } else {
          toReturn = 0;
        }
      } else if (nonBidders['won'] > GameState.MAX_BID_VALUE - bidValue) {
        if (nonBidders['players'].includes(this.MAX_1) || nonBidders['players'].includes(this.MAX_2)) {
          toReturn = nonBidders['won'] / (GameState.MAX_BID_VALUE + 1 - bidValue);
        } else {
          toReturn = 0;
        }
      }
      if (!trumpRevealed) {
        return 0;
      }
      return toReturn;
    }
    return null;
  }
  //verified
  terminalValue() {
    if (this.payload.handsHistory.length < 8) {
      return null;
    }
    //console.log(this.payload.handsHistory)
    //console.log(this.payload.teams)
    let bids = [];
    for (let team_info of this.payload['teams']) {
      bids.push(team_info['bid']);
    }
    let bid1 = bids[0];
    let bid2 = bids[1];
    let bidvalue = Math.max(bid1, bid2);
    var to_return;
    for (let team_info of this.payload['teams']) {
      if (team_info['bid'] !== 0) {
        //bidder team won
        if (team_info['won'] >= bidvalue) {
          let members = team_info['players'];
          if (members.includes(GameState.MAX_1) || members.includes(GameState.MAX_2)) to_return = 1;
          else to_return = 0;
        }
      } else {
        //non bidder team won
        if (team_info['won'] > 28 - bidvalue) {
          let members = team_info['players'];
          if (members.includes(GameState.MAX_1) || members.includes(GameState.MAX_2)) to_return = 1;
          else to_return = 0;
        }
      }
    }
    //console.log("value is", to_return)
    //console.log("-----------")
    return to_return;
  }

  //ADDED SOME HEURESTIC
  getLegalMoves() {
    var playerId = this.payload['playerId'];
    var myCards = this.payload[playerId];
    var trumpRevealed = this.payload['trumpRevealed'];
    var trumpSuit = this.payload['trumpSuit'];
    var playedCards = this.payload['played'];
    var handsHistory = this.payload['handsHistory'];

    //1. I am the first one to play ====== all cards are legal
    if (playedCards.length === 0) {
      return myCards;
    }

    //2. I am not the first one to play
    var currentSuit = playedCards[0][1];
    var suitCards = [];
    for (let card of myCards) {
      if (card[1] === currentSuit) {
        suitCards.push(card);
      }
    }

    //2.1 I have same suit card in the ground ====== same suit cards
    if (suitCards.length > 0) {
      return suitCards;
    }

    //2.2 I dont have same suit as the round

    //2.2.1. If trump is not revealed ======= any-card + OT goes
    if (!trumpRevealed) {
      var legalMoves = JSON.parse(JSON.stringify(myCards));
      //var legalMoves = [];
      legalMoves.push('OT');
      return legalMoves;
    }

    //2.2.2. Trump is revelead
    let myTrumpCards = [];
    for (let card of myCards) {
      if (card[1] === trumpSuit) {
        myTrumpCards.push(card);
      }
    }

    //2.2.2.1: I didnot reveal trump in this round ==== all the cards are legal
    let didIRevealTheTrumpInThisHand =
      trumpRevealed.playerId === playerId && trumpRevealed.hand === handsHistory.length + 1;
    if (!didIRevealTheTrumpInThisHand) {
      return myCards;
    }

    //2.2.2.2: I revealed trump in this very round

    //2.2.2.2.1: I dont have trump card ===== all the cards are legals
    if (myTrumpCards.length === 0) {
      return myCards;
    }

    //2.2.2.2.2: I have some trump cards

    //2.2.2.2.2.1: There is no trump in the game ===== all trump cards
    let does_not_contain = true;
    for (let played_cards of playedCards) {
      if (played_cards[1] === trumpSuit) {
        does_not_contain = false;
        break;
      }
    }
    if (does_not_contain) {
      return myTrumpCards;
    }

    //2.2.2.2.2.2: There is some trumps
    var highest_trump_on_ground = -1000000000;
    var highest_trump_card = '';
    for (let played_card of playedCards) {
      if (played_card[1] === trumpSuit) {
        highest_trump_on_ground = Math.max(highest_trump_on_ground, GameState.CARDS_DICT[played_card[0]]);
        highest_trump_card = played_card;
      }
    }

    //2.2.2.2.2.2.1: The highest trump is of friend ===== any trump is good
    var index_of_highest_trump = playedCards.indexOf(highest_trump_on_ground);
    if (playedCards.length === 2 && index_of_highest_trump === 0) {
      return myTrumpCards;
    } else if (playedCards.length === 3 && index_of_highest_trump === 1) {
      return myTrumpCards;
    }

    //2.2.2.2.2.2.2: The highest card is not of the friend
    let winningTrumps = [];
    for (let card of myTrumpCards) {
      if (GameState.CARDS_DICT[card[0]] > highest_trump_on_ground) {
        winningTrumps.push(card);
      }
    }

    //2.2.2.2.2.2.2.1: I have some winning trumps ==== the winning trumps are legal
    //2.2.2.2.2.2.2.2: I dont have winning trumps ==== any trump is legal
    if (winningTrumps.length > 0) {
      return winningTrumps;
    } else {
      return myTrumpCards;
    }
  }

  //   getLegalMoves()
  //   {
  // 	  /*
  // 	  var validMoves = this.getValidMoves()
  // 	  if (validMoves[validMoves.length - 1] === 'OT')
  // 	  {
  // 		  var totalValue = 0
  // 		  for (let card of this.payload['played'])
  // 		  {
  // 			  if (card[0] === 'J')
  // 				  totalValue += 3
  // 			  else if (card[0] === '9')
  // 				  totalValue += 2
  // 			  else if (card[0] === 'T' || card[0] === '1')
  // 				  totalValue += 1
  // 			  else
  // 				  totalValue += 0
  // 		  }
  // 		  if (totalValue > 0)
  // 		  {
  // 			  var OTonly = ['OT']
  // 			  return OTonly
  // 		  }
  // 		  else
  // 		  {
  // 			  validMoves.pop()
  // 			  return validMoves;
  // 		  }
  // 	  }
  // 	  */
  // 	  return validMoves;
  //   }

  //yes bro (the payload must be in intact form as it was created)
  randomlyDistribute() {
    const players = this.payload['playerIds'];
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

    var cardsLost = {};
    cardsLost[player2] = new Set();
    cardsLost[player3] = new Set();
    cardsLost[player4] = new Set();

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
          console.log('DONt BE HERE');
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
    let noOfCardsToDistribute = remainingCards.length;

    var gets_count = {};
    gets_count[player2] = Math.floor(noOfCardsToDistribute / 3) + (noOfCardsToDistribute % 3 >= 1);
    gets_count[player3] = Math.floor(noOfCardsToDistribute / 3) + (noOfCardsToDistribute % 3 >= 2);
    gets_count[player4] = Math.floor(noOfCardsToDistribute / 3);

    this.payload[player2] = [];
    this.payload[player3] = [];
    this.payload[player4] = [];

    var cards_get_pair = Object.keys(gets_count).map(key => {
      return [key, gets_count[key]];
    });
    for (let each_player of cards_get_pair) {
      let player_id = each_player[0];
      let this_player_gets = each_player[1];
      while (this_player_gets > 0) {
        let card = _.sample(remainingCards);
        this.payload[player_id].push(card);
        removeElement(remainingCards, card);
        this_player_gets -= 1;
        gets_count[player_id] -= 1;
      }
    }

    if (this.payload['trumpSuit']) {
      this.payload['guessTrumpSuit'] = this.payload['trumpSuit'];
    } else {
      this.payload['guessTrumpSuit'] = _.sample(['C', 'D', 'H', 'S']);
    }
  }

  //something or the other
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

  //maybe works
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

  //verified
  randomPlay() {
    let suits = ['C', 'S', 'D', 'H'];
    while (this.payload.handsHistory.length < 8) {
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
      this.makeAMove(_.sample(legalMoves));
    }
    // return this.terminalValue();
    return this.dynamicTerminalValue();
  }

  // verified
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

      var maxUcb = -100000000000000;
      for (let item of Object.entries(visitsScore)) {
        let visits = item[1][0];
        let score = item[1][1];
        var newUcb;
        if (visits === 0) {
          newUcb = 10000000000000;
        } else {
          newUcb = score / visits + 1.41 * Math.sqrt(Math.log(iterations) / visits);
        }
        if (newUcb > maxUcb) {
          maxUcb = newUcb;
          bestMove = item[0];
        }
      }
      var tempState = _.cloneDeep(this);
      tempState.bipartite_distribute();
      tempState.makeAMove(bestMove);
      var result = tempState.randomPlay();
      visitsScore[bestMove][0] += 1;
      if (result === 1) {
        visitsScore[bestMove][1] += 1;
      }
      iterations += 1;
      if (iterations >= legalMoves.length * 650) {
        break;
      }
    }
    return visitsScore;
  }

  // determinized uct
  realmcts(givenTime) {
    var score_dict = {};
    for (let move of this.getLegalMoves()) {
      score_dict[move] = [0, 0];
    }
    let outerIterations = 10;
    var timeForInnerIterations = givenTime / outerIterations;
    while (outerIterations--) {
      var outerTime = Date.now();
      this.bipartite_distribute();
      var root_node = new cardNode(null);
      while (true) {
        var innerTime = Date.now();
        if (innerTime - outerTime + 5 > timeForInnerIterations) {
          break;
        }
        var play_top = _.cloneDeep(this);
        var current_node = root_node;
        //go to the node from which we gotta do random simulation; if we reached to terminal node we have the tree
        while (play_top.terminalValue() === null) {
          var legal_moves_of_play_top = play_top.getLegalMoves();
          //if all the children are explored once
          if (legal_moves_of_play_top.length === Object.keys(current_node.children).length) {
            var best_value = -100000000;
            for (let child of Object.entries(current_node.children)) {
              let child_move = child[0];
              let child_node = child[1];
              let child_score = child_node.score;
              let child_visits = child_node.visits;
              let parent_visits = current_node.visits;
              if (
                play_top.payload['playerId'] === GameState.MAX_1 ||
                play_top.payload['playerId'] === GameState.MAX_2
              ) {
                let exploitation = child_score / child_visits;
                let exploration = 1.41 * Math.sqrt(Math.log(parent_visits) / child_visits);
                var new_ucb = exploitation + exploration;
              } else {
                let exploitation = -child_score / child_visits;
                let exploration = 1.41 * Math.sqrt(Math.log(parent_visits) / child_visits);
                var new_ucb = exploitation + exploration;
              }
              if (new_ucb > best_value) {
                best_value = new_ucb;
                var best_child = child_node;
                var best_move = child_move;
              }
            }
            current_node = best_child;
            play_top.makeAMove(best_move);
          }

          //if some children are not yet explored
          else {
            var move;
            while (1) {
              move = _.sample(legal_moves_of_play_top);
              if (current_node.children.hasOwnProperty(move)) {
                continue;
              } else {
                break;
              }
            }
            let new_child = new cardNode(current_node);
            current_node.children[move] = new_child;
            current_node = current_node.children[move];
            play_top.makeAMove(move);
            break;
          }
        }
        //here play_top is the point of simulation

        //simulation
        var result = play_top.randomPlay();

        //back propagation
        while (current_node !== null) {
          current_node.visits += 1;
          current_node.score += result;
          current_node = current_node.father;
        }
      }
      //inner iterations finished here so update the score dict
      for (let move of Object.entries(root_node.children)) {
        let card = move[0];
        let score = move[1].score;
        let visits = move[1].visits;
        score_dict[card][0] += score;
        score_dict[card][1] += visits;
      }
    }
    //console.log(score_dict);
    return score_dict;
  }

  //information set
  ismcts(givenTime) {
    var enterTime = Date.now();
    var score_dict = {};
    var some_legals = this.getLegalMoves();
    for (let move of some_legals) {
      score_dict[move] = [0, 0];
    }
    var size_of_cards = some_legals.length;
    let tree_owner = this.payload['playerId'];
    var ITERATIONS = 0;

    var root_node = new cardNode(null);
    while (true) {
      ITERATIONS += 1;
      if (ITERATIONS > 650 * size_of_cards) {
        break;
      }
      var nowTime = Date.now();
      let elapsedTime = nowTime - enterTime;
      if (elapsedTime > givenTime) break;

      //choose a determination d at random
      var current_node = root_node;
      var play_top = _.cloneDeep(this);
      //play_top.randomlyDistribute();
      play_top.bipartite_distribute();
      //selection
      while (true) {
        var legal_moves_of_play_top = play_top.getLegalMoves();
        for (let each_child of Object.entries(current_node.children)) {
          if (legal_moves_of_play_top.includes(each_child[0])) each_child[1].available = true;
          else each_child[1].available = false;
        }
        //if all the children are explored once
        let not_expanded = false;
        for (let each of legal_moves_of_play_top) {
          if (!current_node.children.hasOwnProperty(each)) {
            not_expanded = true;
            break;
          }
        }
        if (not_expanded) break;

        var best_value = -100000000;
        for (let child_move of legal_moves_of_play_top) {
          let child_node = current_node.children[child_move];
          let child_score = child_node.score;
          let child_visits = child_node.visits;
          let child_availability = child_node.availability;
          let exploitation = child_score / child_visits;
          //0.8:
          //0.7:
          //0.9: 161,
          //root2: 105
          //2: 115
          let exploration = Math.sqrt((2 * Math.log(child_availability)) / child_visits);
          var new_ucb = exploitation + exploration;
          if (new_ucb > best_value) {
            best_value = new_ucb;
            var best_child = child_node;
            var best_move = child_move;
          }
        }
        current_node = best_child;
        play_top.makeAMove(best_move);

        while (play_top.payload['playerId'] !== tree_owner) {
          if (play_top.dynamicTerminalValue() !== null) {
            break;
          }
          let current_legal_moves = play_top.getLegalMoves();
          let my_choice = _.sample(current_legal_moves);
          play_top.makeAMove(my_choice);
        }
        if (play_top.dynamicTerminalValue() !== null) {
          break;
        }
      }

      //expansion:
      if (play_top.dynamicTerminalValue() === null) {
        let legals = play_top.getLegalMoves();
        var what_to_expand = _.sample(legals);
        while (current_node.children.hasOwnProperty(what_to_expand)) {
          what_to_expand = _.sample(legals);
          continue;
        }
        let new_child_born = new cardNode(current_node);
        current_node.children[what_to_expand] = new_child_born;

        for (let child of Object.entries(current_node.children)) {
          if (legals.includes(child[0])) {
            child[1].available = true;
          } else {
            child[1].available = false;
          }
        }
        play_top.makeAMove(what_to_expand);
        current_node = current_node.children[what_to_expand];
      }
      //simulation:
      var result = play_top.randomPlay();

      //backpropagation:
      while (current_node !== null) {
        current_node.visits += 1;
        current_node.score += result;
        for (let child of Object.entries(current_node.children)) {
          if (child[1].available) {
            child[1].availability += 1;
          }
        }
        current_node = current_node.father;
      }
    }

    for (let child of Object.entries(root_node.children)) {
      score_dict[child[0]][0] += child[1].visits;
      score_dict[child[0]][1] += child[1].score;
    }
    return score_dict;
  }

  //multi observable
  momcts(givenTime) {
    var enterTime = Date.now();
    var score_dict = {};
    var some_legals = this.getLegalMoves();
    for (let move of some_legals) {
      score_dict[move] = [0, 0];
    }
    var size_of_cards = some_legals.length;
    var ITERATIONS = 0;
    var root_nodes = {};

    //current player is player1
    var player1 = this.payload['playerId'];
    let index_of_player1 = this.payload['playerIds'].indexOf(player1);
    var player2 = this.payload['playerIds'][(index_of_player1 + 1) % 4];
    var player3 = this.payload['playerIds'][(index_of_player1 + 2) % 4];
    var player4 = this.payload['playerIds'][(index_of_player1 + 3) % 4];
    root_nodes[player1] = new cardNode(null);
    root_nodes[player2] = new cardNode(null);
    root_nodes[player3] = new cardNode(null);
    root_nodes[player4] = new cardNode(null);

    while (true) {
      ITERATIONS += 1;
      if (ITERATIONS > 400 * size_of_cards) {
        break;
      }
      var nowTime = Date.now();
      let elapsedTime = nowTime - enterTime;
      if (elapsedTime > givenTime) break;

      var current_nodes = {};
      current_nodes[player1] = root_nodes[player1];
      current_nodes[player2] = root_nodes[player2];
      current_nodes[player3] = root_nodes[player3];
      current_nodes[player4] = root_nodes[player4];

      var play_top = _.cloneDeep(this);
      play_top.bipartite_distribute();
      //play_top.randomlyDistribute();
      //selection time
      while (true) {
        var legal_moves_of_play_top = play_top.getLegalMoves();
        for (let each_child of Object.entries(current_nodes[play_top.payload['playerId']].children)) {
          if (legal_moves_of_play_top.includes(each_child[0])) each_child[1].available = true;
          else each_child[1].available = false;
        }
        //if all the children are explored once
        let not_expanded = false;
        for (let each of legal_moves_of_play_top) {
          if (!current_nodes[play_top.payload['playerId']].children.hasOwnProperty(each)) {
            not_expanded = true;
            break;
          }
        }
        if (not_expanded) break;

        var best_value = -100000000;
        for (let child_move of legal_moves_of_play_top) {
          let child_node = current_nodes[play_top.payload['playerId']].children[child_move];
          let child_score = child_node.score;
          let child_visits = child_node.visits;
          let child_availability = child_node.availability;
          var exploitation;
          if (play_top.payload['playerId'] === GameState.MAX_1 || play_top.payload['playerId'] === GameState.MAX_2)
            exploitation = child_score / child_visits;
          else if (play_top.payload['playerId'] === GameState.MIN_1 || play_top.payload['playerId'] === GameState.MIN_2)
            exploitation = (child_visits - child_score) / child_visits;
          else console.log('why you here');
          let exploration = Math.sqrt((2 * Math.log(child_availability)) / child_visits);
          var new_ucb = exploitation + exploration;
          if (new_ucb > best_value) {
            best_value = new_ucb;
            var best_child = child_node;
            var best_move = child_move;
          }
          //if (legal_moves_of_play_top.includes('9C')) {console.log("best move is", best_move)}
        }
        current_nodes[play_top.payload['playerId']] = best_child;
        play_top.makeAMove(best_move);
        if (play_top.terminalValue() !== null) {
          break;
        }
      }

      //expansion here: we are at the node which is not completely expanded or is terminal
      if (play_top.terminalValue() === null) {
        let legals = play_top.getLegalMoves();
        var what_to_expand = _.sample(legals);
        while (current_nodes[play_top.payload['playerId']].children.hasOwnProperty(what_to_expand)) {
          what_to_expand = _.sample(legals);
          continue;
        }
        let new_child_born = new cardNode(current_nodes[play_top.payload['playerId']]);
        current_nodes[play_top.payload['playerId']].children[what_to_expand] = new_child_born;
        for (let child of Object.entries(current_nodes[play_top.payload['playerId']].children)) {
          if (legals.includes(child[0])) child[1].available = true;
          else child[1].available = false;
        }
        current_nodes[play_top.payload['playerId']] =
          current_nodes[play_top.payload['playerId']].children[what_to_expand];
        play_top.makeAMove(what_to_expand);
      }

      //simulation part (done)
      var result = play_top.randomPlay();

      //back propagation:
      for (let each_player of this.payload['playerIds']) {
        while (current_nodes[each_player] !== null) {
          current_nodes[each_player].visits += 1;
          current_nodes[each_player].score += result;
          for (let child of Object.entries(current_nodes[each_player].children)) {
            if (child[1].available) {
              child[1].availability += 1;
            }
          }
          current_nodes[each_player] = current_nodes[each_player].father;
        }
      }
    }
    //root_nodes[player1].showData()
    //root_nodes[player2].showData()
    //root_nodes[player3].showData()
    //root_nodes[player4].showData()

    for (let child of Object.entries(root_nodes[player1].children)) {
      score_dict[child[0]][0] += child[1].visits;
      score_dict[child[0]][1] += child[1].score;
    }
    return score_dict;
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
      adjusted_time = time_for_simulation / turns_to_play + 190;
    } else if (this.payload['handsHistory'].length == 1) {
      adjusted_time = time_for_simulation / turns_to_play + 90;
    } else if (this.payload['handsHistory'].length === 2) {
      adjusted_time = time_for_simulation / turns_to_play + 70;
    } else if (this.payload['handsHistory'].length === 3) {
      adjusted_time = time_for_simulation / turns_to_play + 50;
    } else if (this.payload['handsHistory'].length === 4) {
      adjusted_time = time_for_simulation / turns_to_play + 30;
    } else if (this.payload['handsHistory'].length === 5) {
      adjusted_time = time_for_simulation / turns_to_play + 20;
    } else if (this.payload['handsHistory'].length === 6) {
      adjusted_time = time_for_simulation / turns_to_play - 20;
    } else if (this.payload['handsHistory'].length === 7) {
      adjusted_time = time_for_simulation - 30;
    }

    // let play_data = this.momcts(adjusted_time);
    let play_data = this.ismcts(adjusted_time);
    //let play_data = this.realmcts(adjusted_time);
    //let play_data = this.mcts(adjusted_time);

    let besters = Object.entries(play_data);
    let sortedBesters = besters.sort((a, b) => b[1][0] - a[1][0]);
    // console.log(sortedBesters);
    //console.log(adjusted_time, sortedBesters);
    var toMove = sortedBesters[0][0];
    //console.log(toMove);
    return toMove;
  }
}

module.exports = GameState;
