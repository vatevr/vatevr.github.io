describe('Game module', function(){
  describe('GameManager', function(){
    //Game module injection to test
    beforeEach(module('Game'));

    //our tests

    var gameManager;
    beforeEach(inject(function(GameManager))){
      gameManager = GameManager;
    }

    var _gridService;
    beforeEach(module(function($provide){
      _gridService = {
        anyCellsAvailable: angular.noop,
        tileMatchesAvailable: angular.noop
      };

      $provide.value('Grid Service', _gridService);

      describe(".movesAvailable", function(){
        it('should report true if there are cells available', function(){
          spyOn(_gridService, 'anyCellsAvailable').andReturn(true);
          expect(gameManager.movesAvailable()).toBeTruthy();
        });
        it("should return true, if available cells and tiles", function(){
          spyOn(_gridService, 'anyCellsAvailable').andReturn(false);
          spyOn(_gridService, 'tileMatchesAvailable').andReturn(true);
          expect(gameManager.movesAvailable()).toBeFalsy();
        });
        it("should return false, if no available cells and tiles", function(){
          spyOn(_gridService, 'anyCellsAvailable').andReturn(false);
          spyOn(_gridService, 'tileMatchesAvailable').andReturn(false);
          expect(gameManager.moviesAvailable()).toBeFalsy();
        })
      });
    }))
  });
});
