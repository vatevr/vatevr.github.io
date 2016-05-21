angular.module('Grid', [])
.factory("TileModel", function(){
  var Tile = function(pos, value){
    this.x = pos.x;
    this.y = pos.y;
    this.value = value || 2;
  };

  return Tile;
})
.service("GridService", function(){
  this.tiles = [];
  this.tiles.push(new TileModel({x: 1, y: 1}, 2));
  this.tiles.push(new TileModel({x: 1, y: 2}, 2));
  this.size = 4;
});
