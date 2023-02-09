const _ = require('lodash');
class TreeNode {
  constructor(playerId, parent = null) {
    this.playerId = playerId;
    this.availability = 0;
    this.visits = 0;
    this.maxWins = 0;
    this.minWins = 0;
    this.score = 0;
    this.childrens = {};
    this.parent = parent;
  }
}

class MCTS {
  static maxIterations = 600;
  static gameState = null;
  constructor(gameState) {
    this.rootNode = new TreeNode(gameState.payload.playerId);
    this.rootGameState = gameState;
    this.rootPlayer = gameState.payload.playerId;
  }
  changeGameState(gameState) {
    MCTS.gameState = _.cloneDeep(gameState);
  }
  getUCB(node, c) {
    let exploitation;
    if (node.parent.playerId === MCTS.gameState.MAX_1 || node.parent.playerId === MCTS.gameState.MAX_2) {
      exploitation = node.maxWins / node.visits;
    } else if (node.parent.playerId === MCTS.gameState.MIN_1 || node.parent.playerId === MCTS.gameState.MIN_2) {
      exploitation = node.minWins / node.visits;
    }
    // console.log(currPlayer, node.playerId, node.parent.playerId);
    // let exploration = c * Math.sqrt(Math.log(this.rootNode.visits) / node.visits);
    let exploration = c * Math.sqrt(Math.log(node.availability) / node.visits);
    let ucb = exploitation + exploration;
    return ucb;
  }
  search(givenTime) {
    this.changeGameState(this.rootGameState);
    let lm = MCTS.gameState.getLegalMoves();
    if (lm.length === 1) {
      return lm[0];
    }
    // Four stage of ISMCTS
    let i = 0;
    while (givenTime > 0) {
      i++;
      var start = Date.now();
      this.rootGameState.bipartite_distribute();
      this.changeGameState(this.rootGameState);
      let node = this.select(this.rootNode);
      let s = MCTS.gameState.randomPlay();
      this.backpropagate(node, s);
      givenTime -= Date.now() - start;
    }
    // console.log('Total iterations:', i);

    let data = [];
    for (let move of Object.keys(this.rootNode.childrens)) {
      let cN = this.rootNode.childrens[move];
      data.push([move, cN.maxWins / cN.visits]);
    }
    data.sort((a, b) => b[1] - a[1]);
    // console.log(data);
    return data[0][0];
  }

  select(node) {
    while (!MCTS.gameState.isTerminal()) {
      let legalMoves = MCTS.gameState.getLegalMoves();
      let childrens = Object.keys(node.childrens);
      let fullyExpanded = true;

      for (let m of legalMoves) {
        if (!childrens.includes(m)) {
          fullyExpanded = false;
          break;
        }
      }

      if (fullyExpanded) {
        for (let move of childrens) {
          if (legalMoves.includes(move)) {
            node.childrens[move].availability += 1;
          }
        }
        // node = this.getBestUCBNode(node, 0.5 * Math.sqrt(2));
        node = this.getBestUCBNode(node, Math.sqrt(2));
      } else {
        return this.expand(node);
      }
    }
    return node;
  }

  getBestUCBNode(node, c) {
    let bestUCB = -Infinity;
    let bestMoves = [];
    let nodeChildrens = Object.keys(node.childrens);
    let legalMoves = MCTS.gameState.getLegalMoves();
    for (let move of nodeChildrens) {
      if (legalMoves.includes(move)) {
        let child = node.childrens[move];
        let ucb = this.getUCB(child, c);
        if (ucb > bestUCB) {
          bestUCB = ucb;
          bestMoves = [move];
        } else if (ucb === bestUCB) {
          bestMoves.push(move);
        }
      }
    }
    // console.log('bestMoves:', bestMoves);
    let m = _.sample(bestMoves);
    MCTS.gameState.makeAMove(m);
    // console.log(MCTS.gameState.payload.playerId);
    return node.childrens[m];
  }

  expand(node) {
    let legalMoves = MCTS.gameState.getLegalMoves();
    for (let move of legalMoves) {
      if (!Object.keys(node.childrens).includes(move)) {
        MCTS.gameState.makeAMove(move);
        let newNode = new TreeNode(MCTS.gameState.payload.playerId, node);
        newNode.availability = 1;
        node.childrens[move] = newNode;
        return newNode;
      }
    }
    console.log('should not get here!');
  }

  // rollout(node) {
  //   return MCTS.gameState.randomPlay();
  // }

  backpropagate(node, score) {
    // console.log('backprop');
    while (node != null) {
      node.visits += 1;
      if (score === 1) {
        node.maxWins += 1;
      } else if (score === -1) {
        node.minWins += 1;
      }
      node.score += score;
      node = node.parent;
    }
    // console.log('***************');
  }
}

module.exports = MCTS;
