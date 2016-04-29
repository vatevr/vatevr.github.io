var W; W = W || {};


W.Phrase = function(tmpl, phrase){
	  this.$ = $( POWER.render( tmpls , { 'phrase': phrase }) );
		this._phrase = phrase;
		this._w = [];
		this._h = this.$.find('.handlers'); //cache
		this.$.click($.proxy(this, '_onclick'));
};

W.Phrase.prototype.add_handler = function(w_handler){
		this._w.push( w_handler );
		this._h.append( w_handler.$ );
};

W.Phrase.prototype._onclick = function() {
		notice('select phrase', { phrase: this._phrase } );
};
