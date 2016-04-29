var W; W = W || {};

W.AddPhrase = function(id){
    this.$ = $("#" + id);
    this._input = this.$.find('input'); //cache
    this.$.submit($.proxy(this, '_onsubmit'));
}

W.AddPhrase.prototype._onsubmit = function(){
  notice('add phrase',  { phrase: this._input.val() });
  this._input.val('');
  return false;
}
