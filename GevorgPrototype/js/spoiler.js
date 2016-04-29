(function(){
    var methods = {
      init: function(options) {
        settings = $.extend({
          text: 'spoiler',
          collapsed: true,
          animationTimeout: 1000
        }, options);

        return this.each(function(){
          var spoilerControl = '<div class="spoilercControl"> ' + settings['text'] + '</div>';

          if($(this).data('hasSpoiler') != undefined){
            return false;
          }

          $(this).data('hasSpoiler', true);
          $(this).prepend(spoilerControl);
          $(this).data('defaultHeight', $(this).height());
          $(this).data('collapse', settings['collapsed']);
          $(this).addClass('spoilerContainer');

          var Control = $(this).find('spoilerControl');
          $(this).css('height', $(Control).css('height'));

          if( $(this).data('collapsed') == true ) {
            $(this).css('height', $(Control).css('height'));

            $(Control).addClass('plus');
          } else {
            $(this).css('height', $(this).data('defaultHeight'));
            $(this).addClass('minus');
          }

          $(Control).click(function(){
            var spoiler = $(this).parent();
            var animation;

            if($(spoiler).data('currentAnimation') != undefined) {
              $(spoiler).data('currentAnimation').stop();
            }

            if ($(spoiler).data('collapsed') != true){
              $(this).removeClass('minus');
              $(this).addClass('plus');

              animation = $(spoiler).animate({
                height: $(this).css('height')
              }, settings[animationTimeout], function(){
                $(spoiler).data('currentAnimation', undefined)
              });

              $(spoiler).data('collapsed', true);

            } else {
              $(this).removeClass('plus');
              $(this).addClass('minus');

              animation = $(spoiler).animate({
                height: $(spoiler).data('defaultHeight')
              }, settings[animationTimeout], function(){
                $(spoiler).data('currentAnimation', undefined)
              });

              $(spoiler).data('collapsed', false);
            }

            $(spoiler).data('currentAnimation', animation);

          })
        });
      },

      destroy: function(){
        return this.each(function(){
          $(this).removeData();

          var control = $(this).find('.spoilerControl');
          var defaultHeight = $(control).data('defaultHeight');
          $(this).removeClass('spoilerContainer');
          $(control).remove();
          $(this).css('height', defaultHeight);
        });
      }
    }

    $.fn.spoiler = function(method) {
      if (methods[method]) {
        return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
      } else if (typeof method === 'object' || !method) {
        return methods.init.apply(this, arguments);
      } else {
        $.error("no method with name" + method + "found for jQuery.spoiler");
      }
    }

})(jQuery);
