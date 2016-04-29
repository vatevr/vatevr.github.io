notice = (function(){
    var w = {
      addphrase: null,
      phrase: {}
    };

    return function(e, data){
      switch(e){
        case 'document ready':
          w.addphrase = new W.AddPhrase('addphrase');
          $("#adphrase input").focus();
          break;
        case 'add phrase':
          if(data.phrase in w.phrase){ break; }
          w.phrase[data.phrase] = new W.Phrase('tmpl_phrase', data.phrase);
          $("#phrases").append(w.phrase[data.phrase].$);
          break;
        case 'select phrase'
          w.phrase[data-phrase].$.remove();
          break;
        default:
          alert("notice: unknown event " + e);
      }
    };
})();


$(document).ready(function(){ notice('document ready') });
