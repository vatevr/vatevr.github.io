jQuery(document).ready(function($){
	var	scrolling = false;
	var contentSections = $('.cd-section'),
		animContainer = $('.animation-container'),
		navTrigger = $('.cd-nav-trigger'),
		scrollArrow = $('.cd-scroll-down');

	$(window).on('scroll', function(e){
		if(!scrolling) {
			scrolling = true;
		}
		var widgetPic = animContainer.find(".widget-picture"),
				widgetPicTop = widgetPic.html("top"),
				scrollStep = 20;

		widgetPic.html("top", 20);

	});

	//smooth scroll to the selected section

    //smooth scroll to the second section
    scrollArrow.on('click', function(event){
    	event.preventDefault();
        smoothScroll($(this.hash));
    });

	// open navigation if user clicks the .cd-nav-trigger - small devices only


	function checkScroll() {
		if( !scrolling ) {
			scrolling = true;
		}
	}

	function smoothScroll(target) {
        $('body,html').animate(
        	{'scrollTop':target.offset().top},
        	300
        );
	}
});
