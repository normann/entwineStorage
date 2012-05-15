(function($){
	
    if(!$ || !($.toJSON || Object.toJSON || window.JSON) || !$.entwine){
       	alert("jQuery, jQueryJson2 plugin and jQuery.entwine plugin needs to be loaded before EntwineStorage!");
		return;
    }else{
		
		var	
		/* function to encode objects to JSON strings */
       	json_encode = $.toJSON || Object.toJSON || (window.JSON && (JSON.encode || JSON.stringify)),

        /* function to decode objects from JSON strings */
        json_decode = $.evalJSON || (window.JSON && (JSON.decode || JSON.parse)),

        _storage = {},
        _storage_service = {EntwineStorage:"{}"},
        _storage_elm = null,
        _storage_size = 0,
		_backend = false,
        _ttl_timeout,

        _XMLService = {
            isXML: function(elm){
                var documentElement = (elm ? elm.ownerDocument || elm : 0).documentElement;
                return documentElement ? documentElement.nodeName !== "HTML" : false;
            },
            encode: function(xmlNode) {
                if(!this.isXML(xmlNode)){
                    return false;
                }
                try{ // Mozilla, Webkit, Opera
                    return new XMLSerializer().serializeToString(xmlNode);
                }catch(E1) {
                    try {  // IE
                        return xmlNode.xml;
                    }catch(E2){}
                }
                return false;
            },
            decode: function(xmlString){
                var dom_parser = ("DOMParser" in window && (new DOMParser()).parseFromString) ||
                        (window.ActiveXObject && function(_xmlString) {
                    var xml_doc = new ActiveXObject('Microsoft.XMLDOM');
                    xml_doc.async = 'false';
                    xml_doc.loadXML(_xmlString);
                    return xml_doc;
                }),
                resultXML;
                if(!dom_parser){
                    return false;
                }
                resultXML = dom_parser.call("DOMParser" in window && (new DOMParser()) || window, xmlString, 'text/xml');
                return this.isXML(resultXML)?resultXML:false;
            }
        };
		
	    function _init(){
	        var localStorageReallyWorks = false;
	        if("localStorage" in window){
	            try {
	                window.localStorage.setItem('_tmptest', 'tmpval');
	                localStorageReallyWorks = true;
	                window.localStorage.removeItem('_tmptest');
	            } catch(BogusQuotaExceededErrorOnIos5) {
	                // Thanks be to iOS5 Private Browsing mode which throws
	                // QUOTA_EXCEEDED_ERRROR DOM Exception 22.
	            }
	        }
	        if(localStorageReallyWorks){
	            try {
	                if(window.localStorage) {
	                    _storage_service = window.localStorage;
	                    _backend = "localStorage";
	                }
	            } catch(E3) {/* Firefox fails when touching localStorage and cookies are disabled */}
	        }
	        /* Check if browser supports globalStorage */
	        else if("globalStorage" in window){
	            try {
	                if(window.globalStorage) {
	                    _storage_service = window.globalStorage[window.location.hostname];
	                    _backend = "globalStorage";
	                }
	            } catch(E4) {/* Firefox fails when touching localStorage and cookies are disabled */}
	        }
	        /* Check if browser supports userData behavior */
	        else {
	            _storage_elm = document.createElement('link');
	            if(_storage_elm.addBehavior){

	                /* Use a DOM element to act as userData storage */
	                _storage_elm.style.behavior = 'url(#default#userData)';

	                /* userData element needs to be inserted into the DOM! */
	                document.getElementsByTagName('head')[0].appendChild(_storage_elm);
               
	                var data = "{}";
	                try{
						 _storage_elm.load("EntwineStorage");
	                    data = _storage_elm.getAttribute("EntwineStorage");
	                }catch(E5){/*alert("E5: "+e.description);*/}
	                _storage_service.EntwineStorage = data;
	                _backend = "userDataBehavior";
	            }else{
	                _storage_elm = null;
	                return;
	            }
	        }

	        _load_storage();

	        // remove dead keys
	        _handleTTL();
	    }

	    function _load_storage(){
	        /* if EntwineStorage string is retrieved, then decode it */
	        if(_storage_service.EntwineStorage){
	            try{
	                _storage = json_decode(String(_storage_service.EntwineStorage));
	            }catch(E6){_storage_service.EntwineStorage = "{}";}
	        }else{
	            _storage_service.EntwineStorage = "{}";
	        }
	        _storage_size = _storage_service.EntwineStorage?String(_storage_service.EntwineStorage).length:0;
	    }

	    function _save(){
	        try{
	            _storage_service.EntwineStorage = json_encode(_storage);
	            // If userData is used as the storage engine, additional
	            if(_storage_elm) {
	                _storage_elm.setAttribute("EntwineStorage",_storage_service.EntwineStorage);
	                _storage_elm.save("EntwineStorage");
	            }
	            _storage_size = _storage_service.EntwineStorage?String(_storage_service.EntwineStorage).length:0;
	        }catch(E7){/*alert('E7: '+E7.description);/* probably cache is full, nothing is saved this way*/}
	    }

	    function _checkKey(key){
	        if(!key || (typeof key != "string" && typeof key != "number")){
	            throw new TypeError('Key name must be string or numeric');
	        }
	        if(key == "__entstorage_meta"){
	            throw new TypeError('Reserved key name');
	        }
	        return true;
	    }

	    function _handleTTL(){
	        var curtime, i, TTL, nextExpire = Infinity, changed = false;

	        clearTimeout(_ttl_timeout);

	        if(!_storage.__entstorage_meta || typeof _storage.__entstorage_meta.TTL != "object"){
	            // nothing to do here
	            return;
	        }

	        curtime = +new Date();
	        TTL = _storage.__entstorage_meta.TTL;
	        for(i in TTL){
	            if(TTL.hasOwnProperty(i)){
	                if(TTL[i] <= curtime){
	                    delete TTL[i];
	                    delete _storage[i];
	                    changed = true;
	                }else if(TTL[i] < nextExpire){
	                    nextExpire = TTL[i];
	                }
	            }
	        }

	        // set next check
	        if(nextExpire != Infinity){
	            _ttl_timeout = setTimeout(_handleTTL, nextExpire - curtime);
	        }

	        // save changes
	        if(changed){
	            _save();
	        }
	    }

	    ////////////////////////// PUBLIC INTERFACE /////////////////////////

	    $.EntwinedStorage = {
	        /* Version number */
	        version: "0.1.6.1",

	        set: function(key, value){
	            _checkKey(key);
	            if(_XMLService.isXML(value)){
	                value = {_is_xml:true,xml:_XMLService.encode(value)};
	            }else if(typeof value == "function"){
	                value = null; // functions can't be saved!
	            }else if(value && typeof value == "object"){
	                // clone the object before saving to _storage tree
	                value = json_decode(json_encode(value));
	            }
	            _storage[key] = value;
	            _save();
	            return value;
	        },
	        get: function(key, def){
	            _checkKey(key);
	            if(key in _storage){
	                if(_storage[key] && typeof _storage[key] == "object" &&
	                        _storage[key]._is_xml &&
	                            _storage[key]._is_xml){
	                    return _XMLService.decode(_storage[key].xml);
	                }else{
	                    return _storage[key];
	                }
	            }
	            return typeof(def) == 'undefined' ? null : def;
	        },
	        deleteKey: function(key){
	            _checkKey(key);
	            if(key in _storage){
	                delete _storage[key];
	                // remove from TTL list
	                if(_storage.__entstorage_meta &&
	                  typeof _storage.__entstorage_meta.TTL == "object" &&
	                  key in _storage.__entstorage_meta.TTL){
	                    delete _storage.__entstorage_meta.TTL[key];
	                }
	                _save();
	                return true;
	            }
	            return false;
	        },
	        setTTL: function(key, ttl){
	            var curtime = +new Date();
	            _checkKey(key);
	            ttl = Number(ttl) || 0;
	            if(key in _storage){

	                if(!_storage.__entstorage_meta){
	                    _storage.__entstorage_meta = {};
	                }
	                if(!_storage.__entstorage_meta.TTL){
	                    _storage.__entstorage_meta.TTL = {};
	                }

	                // Set TTL value for the key
	                if(ttl>0){
	                    _storage.__entstorage_meta.TTL[key] = curtime + ttl;
	                }else{
	                    delete _storage.__entstorage_meta.TTL[key];
	                }

	                _save();

	                _handleTTL();
	                return true;
	            }
	            return false;
	        },
	        flush: function(){
	            _storage = {};
	            _save();
	            return true;
	        },
	        storageObj: function(){
	            function F() {}
	            F.prototype = _storage;
	            return new F();
	        },
	        index: function(){
	            var index = [], i;
	            for(i in _storage){
	                if(_storage.hasOwnProperty(i) && i != "__entstorage_meta"){
	                    index.push(i);
	                }
	            }
	            return index;
	        },
	        storageSize: function(){
	            return _storage_size;
	        },
	        currentBackend: function(){
	            return _backend;
	        },
	        storageAvailable: function(){
	            return !!_backend;
	        },
	        reInit: function(){
	            var new_storage_elm, data;
	            if(_storage_elm && _storage_elm.addBehavior){
	                new_storage_elm = document.createElement('link');

	                _storage_elm.parentNode.replaceChild(new_storage_elm, _storage_elm);
	                _storage_elm = new_storage_elm;

	                /* Use a DOM element to act as userData storage */
	                _storage_elm.style.behavior = 'url(#default#userData)';

	                /* userData element needs to be inserted into the DOM! */
	                document.getElementsByTagName('head')[0].appendChild(_storage_elm);

	                data = "{}";
	                try{
						_storage_elm.load("EntwineStorage");
	                    data = _storage_elm.getAttribute("EntwineStorage");
	                }catch(E5){/*alert('E5: '+E5.description);*/}
	                _storage_service.EntwineStorage = data;
	                _backend = "userDataBehavior";
	            }

	            _load_storage();
	        },
			init:function(){
				
			    // Initialize EntwineStorage
				_init();
			}
	    };
	}
	
	$.entwine.ALREADY_SAVED = false; // only used when the page contain multiple forms which need to save, but there is no form id specified 
	$.entwine.ALREADY_RESTORED = false;
	$.entwine.StorageTTL = null;
	$('form').entwine({
		setStorageTTL: function(ttl){
			$.entwine.StorageTTL = Number(ttl);
		},
		stringify: function(){
			return json_encode($(this).serializeArray());
		},
		
		parse: function(serializedStr){
			return json_decode(serializedStr);
		},
		
		getParentWithID: function(){
			var parent = $(this).parent();
			while(parent && parent.length) {
				if(parent.attr('id')) return parent;
				else parent = parent.parent();
			}
			return null;
		},
		
		makeUniqueKey: function(){
			var form_id = $(this).attr('id')?$(this).attr('id'):null;
			if(!form_id){
				form_id = $(this).attr('action');
			}
			if(!form_id){
				var parentWithID = $(this).getParentWithID();
				if(parentWithID) form_id = parentWithID.attr('id');
			}
			if(!form_id){
				form_id = "jQuqeryEntwineStorageGlobal";
			}
			return form_id;
		},
		
		save: function(){
			var form_id = $(this).makeUniqueKey();
			if(form_id == 'jQuqeryEntwineStorageGlobal'){
				if(!$.entwine.ALREADY_SAVED ){
					var serialized = $('form').serializeArray();
					$.EntwinedStorage.set(form_id, json_encode(serialized));
					if($.entwine.StorageTTL){
						alert($.entwine.StorageTTL);
						$.EntwinedStorage.setTTL(form_id, $.entwine.StorageTTL);
					}
					$.entwine.ALREADY_SAVED = true;
				}
			}else{
				$.EntwinedStorage.set(form_id, $(this).stringify());
				if($.entwine.StorageTTL){
					alert('here');
					$.EntwinedStorage.setTTL(form_id, $.entwine.StorageTTL);
				}
			}
		},
		
		restore: function(){
			if(!$.entwine.ALREADY_RESTORED){
				var fields = $(this).getFields();
				var keys = [];
				var key_values = {};
				if(fields){
					for(var i=0; i< fields.length; i++){
						var fieldname = fields[i].name;
						var fieldvalue = fields[i].value;
						if(!key_values[fieldname]){
							key_values[fieldname] = [];
							keys.push(fieldname);
						}
						key_values[fieldname].push(fieldvalue);
					}
					for(var i=0; i<keys.length; i++){
						var key = keys[i];
						$('form').find("[name='"+key+"']").val(key_values[key]);
						console.log($('form').find("[name='"+key+"']"));
						console.log(key_values[key]);
					}
					var form_id = $(this).makeUniqueKey();
					if(form_id == 'jQuqeryEntwineStorageGlobal'){
						$.entwine.ALREADY_RESTORED = true;
					}
				}
			}
		},
		
		getFields: function(){
			var form_id = $(this).makeUniqueKey();
			if(form_id == 'jQuqeryEntwineStorageGlobal'){
				return $(this).parse($.EntwinedStorage.get(form_id));
			}else{
				return $(this).parse($.EntwinedStorage.get(form_id));
			}
		},
		
		flushAll: function(){
			$.EntwinedStorage.flush();
		},
		
		flush: function(){
			var form_id = $(this).makeUniqueKey();
			$.EntwinedStorage.deleteKey(form_id);
		}
	});
}(jQuery));