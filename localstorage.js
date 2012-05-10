(function(jQuery) {

   var supported = true;
   if (typeof localStorage == 'undefined' || typeof JSON == 'undefined')
      supported = false;
   else
      var ls = localStorage;

   this.setItem = function(key, value, lifetime) {
      if (!supported)
         return false;

      ls.setItem(key, JSON.stringify(value));
      var time = new Date();
      ls.setItem('meta_ct_'+key, time.getTime());
      ls.setItem('meta_lt_'+key, lifetime);
   };

   this.getItem = function(key) {
      var time = new Date();
      if (!supported || time.getTime() - ls.getItem('meta_ct_'+key) > ls.getItem('meta_lt_'+key))
         return false;
      return JSON.parse(ls.getItem(key));
   };

   this.removeItem = function(key) {
      return supported && ls.removeItem(key);
   };

   jQuery.localStorage = this;

})(jQuery);

if (!$.localStorage.getItem('test')) {
   $.localStorage.setItem('test', ['stoimen'], 600000);
   alert('dynamic');
} else {
   alert('from cache');
}