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
	
  static CARDS_DICT = 
  {
	  'J': 3,
	  '9': 2,
	  'A': 1.1,
	  'T': 1,
	  'K': 0.4,
	  'Q': 0.3,
	  '8': 0.2,
	  '7': 0.1
  };

  static MAX_1 = '.';
  static MAX_2 = '.';
  static MIN_1 = '.';
  static MIN_2 = '.';
  static TRUMPER = '';

  static MAX_BID_VALUE = 28;

  static PLAYER = '';
	
	//checked
  constructor(payload) {
    this.payload = payload;
  }
  
	//verified
  oneTimeCall() {
    GameState.MAX_1 = this.payload['playerId'];
    GameState.MAX_2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 2) % 4];
    GameState.MIN_1 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 1) % 4];
    GameState.MIN_2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 3) % 4];
    this.payload[this.payload['playerId']] = this.payload['cards'];
  }

	//verified
  terminalValue() {
	//console.log(this.payload['teams'])
	if (!this.payload['trumpRevealed']) {return 0;}
	
    var to_return = null;
    if (this.payload.handsHistory.length === 8) {
	  //console.log(this.payload['teams'])
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
	  
	  //bidders won
      if (bidders['won'] >= bidders['bid']) {
        if (bidders['players'].includes(GameState.MAX_1) || bidders['players'].includes(GameState.MAX_2)) {
          return 1;
        } else {
          return 0;
        }
       
	  //non bidderrs bid winner
      } else if (nonBidders['won'] > (GameState.MAX_BID_VALUE - bidValue)) {
        if (nonBidders['players'].includes(GameState.MAX_1) || nonBidders['players'].includes(GameState.MAX_2)) {
          return 1;
        } else {
          return 0;
        }
      }
	  console.log("SHOULD NOT BE HERE")
    }
  }
  
	//verified
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
    var suitCards = []
	for (let card of myCards)
	{
		if (card[1] === currentSuit) {suitCards.push(card);}
	}

	//2.1 I have same suit card in the ground ====== same suit cards
    if (suitCards.length > 0) {
      return suitCards;
    }

	//2.2 I dont have same suit as the round
	
	//2.2.1. If trump is not revealed ======= any-card + OT goes 
    if (!trumpRevealed) {
      var legalMoves = JSON.parse(JSON.stringify(myCards));
      legalMoves.push('OT');
      return legalMoves;
    }

	//2.2.2. Trump is revelead	
	let myTrumpCards = [];
	for (let card of myCards)
	{
		if (card[1] === trumpSuit) {myTrumpCards.push(card);}
	}
	
	//2.2.2.1: I didnot reveal trump in this round ==== all the cards are legal
    let didIRevealTheTrumpInThisHand =
        (trumpRevealed.playerId === playerId) && (trumpRevealed.hand === (handsHistory.length + 1));
    if (!didIRevealTheTrumpInThisHand) {
		return myCards;
	}
	
	//2.2.2.2: I revealed trump in this very round
	
	//2.2.2.2.1: I dont have trump card ===== all the cards are legals
    if (myTrumpCards.length === 0) {
        return myCards;
    }

	//2.2.2.2.2: I have some trump cards
		
	//2.2.2.2.2.1: There is no trump in the game ===== all turmp cards
	let does_not_contain = true;
    for (let played_cards of playedCards)
	{
		if (played_cards[1] === trumpSuit)
		{
            does_not_contain = false;
            break;
		}
	}
    if (does_not_contain) {return myTrumpCards;}    
	
	//2.2.2.2.2.2: There is some trumps
    var highest_trump_on_ground = -1000000000
	var highest_trump_card = ''
	for (let played_card of playedCards)
	{
		//console.log(played_card)
		if (played_card[1] === trumpSuit)
		{
			highest_trump_on_ground = Math.max(highest_trump_on_ground, GameState.CARDS_DICT[played_card[0]])
			highest_trump_card = played_card
		}
	}
	
	//2.2.2.2.2.2.1: The highest trump is of friend ===== any trump is good
    var index_of_highest_trump = playedCards.indexOf(highest_trump_on_ground)
	if ((playedCards.length === 2) && (index_of_highest_trump === 0)) {
		return myTrumpCards
	}
    else if ((playedCards.length === 3) && (index_of_highest_trump === 1)) {
		return myTrumpCards
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
    } 
	else {
        return myTrumpCards;
    }

  }

	//verified
  randomlyDistribute() {
    const suits = ['C', 'D', 'H', 'S'];
    const ranks = ['J', '9', '1', 'T', 'K', 'Q', '8', '7'];
    const allPossibilities = [];
    for (let suit of suits) {
      for (let rank of ranks) {
        allPossibilities.push(rank + suit);
      }
    }
    //this.payload[this.payload['playerId']] = this.payload['cards'];
    let player2 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 1) % 4];
    let player3 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 2) % 4];
    let player4 = this.payload['playerIds'][(this.payload['playerIds'].indexOf(this.payload['playerId']) + 3) % 4];
    var cardsLost = getLostSuitByOther(this.payload);
    var doneCards = getTillPlayedCards(this.payload);
    var played = this.payload.played;
    var ownCards = this.payload.cards;;

    doneCards = doneCards.concat(played, ownCards);

    var remainingCards = [];
    for (let card of allPossibilities) {
      if (!doneCards.includes(card)) {
        remainingCards.push(card);
      }
    }
    let noOfCardsToDistribute = remainingCards.length;

	var gets_count = {}
	gets_count[player2] = Math.floor(noOfCardsToDistribute/3) + (noOfCardsToDistribute%3 >= 1);
	gets_count[player3] = Math.floor(noOfCardsToDistribute/3) + (noOfCardsToDistribute%3 >= 2);
	gets_count[player4] = Math.floor(noOfCardsToDistribute/3);

    this.payload[player2] = [];
    this.payload[player3] = [];
    this.payload[player4] = [];
	
	//var cardsLost = getLostSuitByOther(this.payload);
	cardsLost = {}
	cardsLost[player2] = []
	cardsLost[player3] = []
	cardsLost[player4] = []
	
	let besters = Object.entries(cardsLost);
	let sortedCardsLost = besters.sort((a, b) => b[1].length - a[1].length);
	
	for (let each_player of sortedCardsLost)
	{
		let player_id = each_player[0]
        let this_player_gets = gets_count[player_id]
        let this_player_lost = each_player[1]
		//console.log(this_player_lost)
		while (this_player_gets > 0)
		{
			//console.log("in")
			let card = randomChoice(remainingCards)
			if (this_player_lost.includes(card[1])) {continue;}
			this.payload[player_id].push(card)
			removeElement(remainingCards, card)
			this_player_gets -= 1
		}
	}
	if (this.payload['trumpSuit']) 
	{
		this.payload['guessTrumpSuit'] = this.payload['trumpSuit'];
		this.payload['realness'] = true;
	} 
	else 
	{
		this.payload['guessTrumpSuit'] = randomChoice(['C', 'D', 'H', 'S']);
		this.payload['realness'] = false;
	}
  }

	//maybe works
  makeAMove(move) {
    var playerId = this.payload['playerId'];
	
    if (move === 'OT') {
      this.payload['trumpSuit'] = this.payload['guessTrumpSuit'];
      this.payload['trumpRevealed'] = {
        hand: this.payload['handsHistory'].length + 1,
        playerId: this.payload.playerId,
      };
	  
    } 
	
	
	  else if (this.payload['played'].length < 3) {
      removeElement(this.payload[playerId], move);
      this.payload['playerId'] = this.payload['playerIds'][(this.payload['playerIds'].indexOf(playerId) + 1) % 4];
      this.payload['played'].push(move);
    } 
	
	  
	  else {
      this.payload['played'].push(move);
      let highestCardInPlayedCards = getHighestCardInPlayedCards(this.payload);
      const players = this.payload['playerIds'];
      let starterPlayer = this.payload['playerIds'][(this.payload['playerIds'].indexOf(playerId) + 1) % 4];
      const idxOfWinner = this.payload['played'].indexOf(highestCardInPlayedCards);
      var winner = players[(players.indexOf(playerId)+idxOfWinner+1)%4];
	  //console.log(winner)
      var totalValue = 0;
      for (let eachPlayed of this.payload['played']) {
        let rank = eachPlayed[0];
        if (rank === 'J') totalValue += 3;
        if (rank === '9') totalValue += 2;
        if (rank === 'T' || rank === '1') totalValue += 1;
      }
	  
      removeElement(this.payload[playerId], move);
      for (var teamInfo of this.payload['teams']) {
        if (teamInfo['players'].includes(winner)) {
          teamInfo['won'] += totalValue;
        }
      }

      var newPlayed = JSON.parse(JSON.stringify(this.payload['played']));
      this.payload['handsHistory'].push([starterPlayer, newPlayed, winner]);
      this.payload['playerId'] = winner;
      this.payload['played'] = [];
    }
  }

	//verified
  randomPlay() {
    while (this.payload['handsHistory'].length < 8) {
      var legalMoves = this.getLegalMoves();
      this.makeAMove(randomChoice(legalMoves));
    }
    return this.terminalValue();
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
		if (visits === 0)
		{
			newUcb = 10000000000000
		}
        else 
		{
          newUcb = score / visits + Math.sqrt(2 * Math.log(iterations)/visits);
        }
        if (newUcb > maxUcb) {
          maxUcb = newUcb;
          bestMove = item[0];
        }
      }
      var tempState = _.cloneDeep(this);
	  tempState.randomlyDistribute();
      tempState.makeAMove(bestMove);
      var result = tempState.randomPlay();

      visitsScore[bestMove][0] += 1;
      if (result === 1) {
        visitsScore[bestMove][1] += 1;
      }
      iterations += 1;
    }
    return visitsScore;
  }

	// verified
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
    let sortedBesters = besters.sort((a, b) => b[1][0] - a[1][0]);
	console.log(sortedBesters)
	//console.log(sortedBesters[0][0])
    //console.log(this.payload.playerId, sortedBesters);
    return sortedBesters[0][0];
  }
}

module.exports = GameState;
