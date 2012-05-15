(function($){
	$(window).unload(function(){
		$('form').save();
	});

	$(document).ready(function(){
		$.EntwinedStorage.init();
		$('form').restore();
		$('form').flush();
	
	});
}(jQuery));