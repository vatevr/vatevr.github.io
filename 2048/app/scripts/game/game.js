angular.module("Game", [])
.service("GameManager", function(){

  this.newGame = function();

  this.move = function();

  this.updateScore = function();

  this.movesAvailable = function(){
    //if tiles can be merged or free Cell to move, return true
    return GridService.anyCellsAvailable() || GridService.tileMatchesAvailable();
  };

})
