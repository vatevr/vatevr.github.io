'use strict';

/**
 * @ngdoc overview
 * @name twentyfortyeightApp
 * @description
 * # twentyfortyeightApp
 *
 * Main module of the application.
 */
angular
  .module("twentyfortyeightApp", ['Game'])
  .controller("GameController", function(GameManager){
    this.game = GameManager;
  });
