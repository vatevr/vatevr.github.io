(function(){
  $ = function(selector){};

  $.extend = function(target, object) {
    for(var prop in object){
      if( object.hasOwnProperty(prop) ){
        target[prop] = object[prop];
      }
    }
    return target;
  };

  var isArrayLike = function(obj) {
    if(typeof obj.length === "number"){
        if(obj.length === 0) { return true; }
          else if(obj.length > 0){
            return(obj.length - 1) in obj;
          }
    } else {
      return false;
    }
  }

  $.extend($, {
    isArray = function(obj) {
      return Object.prototype.toString.call(obj) == "[object Array]";
    },
    each = function(collection, cb){
      if(isArrayLike(collection)) {
        for (var i = 0; i < collection.length; i++){
          var value = collection[i];
          cb(value, i, value);
        }
      } else {
        for(var prop in collection) {
          if(collection.hasOwnProperty(prop)){
            var value = collection[prop];
            cb.call(value, prop, value);
          }
        }
      }
    },



  });

})();
