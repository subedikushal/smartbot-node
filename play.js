const { getTotalValue, getSuitCards, isFriendWinning } = require('./shared');
GameState = require('./mcts.js');
MCTS = require('./newmcts.js');
/**
 * @payload
  {
    "playerId": "A2", // own player id
    "playerIds": ["A1", "B1", "A2", "B2"], // player ids in order
    "timeRemaining": 1500,
    "teams": [
      { "players": ["A1", "A2"], "bid": 17, "won": 0 }, // first team information
      { "players": ["B1", "B2"], "bid": 0, "won": 4 }, // second team information
    ],
    "cards": ["JS", "TS", "KH", "9C", "JD", "7D", "8D"], // own cards
    "bidHistory": [["A1", 16], ["B1",17], ["A1", 17], ["B1", 0], ["A2", 0], ["B2", 0]], // bidding history in chronological order
    "played": ["9S", "1S", "8S"],
    "handsHistory": [
        [
          "A1", // player who threw the first card ("7H") 
          ["7H", "1H", "8H", "JH"], // cards that thrown in the first hand
          "B2" // winner of this hand
        ]
    ],
    // represents the suit if available, the trumpSuit is only present for the player who reveals the trump
    // after the trump is revealed, the trumpSuit is present for all the players
    "trumpSuit": false | "H",

    // only after the trump is revealed by the player the information is revealed
    "trumpRevealed": false | {
      hand: 2, // represents the hand at which the trump was revealed
      playerId: "A2", // the player who revealed the trump
    },
  }
 */
function play(payload) {
  // console.log(payload.playerId, payload.timeRemaining);
  // console.log(payload.cards.length);
  // console.log(payload.played);
  // console.log(payload.playerId, isFriendWinning(payload));
  // if (payload.played.length > 0) {
  //   let suitCards = getSuitCards(payload.cards, payload.played[0][1]);
  //   if (suitCards.length === 0) {
  //     if (!payload.trumpRevealed && getTotalValue(payload.played) > 0) {
  //       return {
  //         revealTrump: true,
  //       };
  //     }
  //   }
  // }
  let time_for_simulation = payload['timeRemaining'] - 50;
  let turns_to_play = 8 - payload['handsHistory'].length;
  let adjusted_time;
  if (payload['handsHistory'].length === 0) {
    adjusted_time = time_for_simulation / (turns_to_play - 1) + 140;
  } else if (payload['handsHistory'].length == 1) {
    adjusted_time = time_for_simulation / (turns_to_play - 1) + 90;
  } else if (payload['handsHistory'].length === 2) {
    adjusted_time = time_for_simulation / (turns_to_play - 1) + 80;
  } else if (payload['handsHistory'].length === 3) {
    adjusted_time = time_for_simulation / (turns_to_play - 1) + 70;
  } else if (payload['handsHistory'].length === 4) {
    adjusted_time = time_for_simulation / (turns_to_play - 1) + 50;
  } else if (payload['handsHistory'].length === 5) {
    adjusted_time = time_for_simulation / (turns_to_play - 1) + 40;
  } else if (payload['handsHistory'].length === 6) {
    adjusted_time = (time_for_simulation + 30) / turns_to_play;
  } else if (payload['handsHistory'].length === 7) {
    adjusted_time = time_for_simulation - 10;
  }
  var currentState = new GameState(payload);
  currentState.oneTimeCall();
  let mcts = new MCTS(currentState);
  let move = mcts.search(adjusted_time);
  // let move = currentState.show();
  if (move === 'OT') {
    return { revealTrump: true };
  } else {
    return { card: move };
  }
}

module.exports = play;
