(function($){
	
    if(!$ || !($.toJSON || Object.toJSON || window.JSON) || !$.entwine){
       	alert("jQuery, jQueryJson2 plugin and jQuery.entwine plugin needs to be loaded before jStorage!");
		return;
    }else{
		
		var	
		/* function to encode objects to JSON strings */
       	json_encode = $.toJSON || Object.toJSON || (window.JSON && (JSON.encode || JSON.stringify)),

        /* function to decode objects from JSON strings */
        json_decode = $.evalJSON || (window.JSON && (JSON.decode || JSON.parse)),
        _storage = {},
        _storage_service = {jStorage:"{}"},
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
						 _storage_elm.load("jStorage");
	                    data = _storage_elm.getAttribute("jStorage");
	                }catch(E5){/*alert("E5: "+e.description);*/}
	                _storage_service.jStorage = data;
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
	        /* if jStorage string is retrieved, then decode it */
	        if(_storage_service.jStorage){
	            try{
	                _storage = json_decode(String(_storage_service.jStorage));
	            }catch(E6){_storage_service.jStorage = "{}";}
	        }else{
	            _storage_service.jStorage = "{}";
	        }
	        _storage_size = _storage_service.jStorage?String(_storage_service.jStorage).length:0;
	    }

	    function _save(){
	        try{
	            _storage_service.jStorage = json_encode(_storage);
	            // If userData is used as the storage engine, additional
	            if(_storage_elm) {
	                _storage_elm.setAttribute("jStorage",_storage_service.jStorage);
	                _storage_elm.save("jStorage");
	            }
	            _storage_size = _storage_service.jStorage?String(_storage_service.jStorage).length:0;
	        }catch(E7){/*alert('E7: '+E7.description);/* probably cache is full, nothing is saved this way*/}
	    }

	    function _checkKey(key){
	        if(!key || (typeof key != "string" && typeof key != "number")){
	            throw new TypeError('Key name must be string or numeric');
	        }
	        if(key == "__jstorage_meta"){
	            throw new TypeError('Reserved key name');
	        }
	        return true;
	    }

	    function _handleTTL(){
	        var curtime, i, TTL, nextExpire = Infinity, changed = false;

	        clearTimeout(_ttl_timeout);

	        if(!_storage.__jstorage_meta || typeof _storage.__jstorage_meta.TTL != "object"){
	            // nothing to do here
	            return;
	        }

	        curtime = +new Date();
	        TTL = _storage.__jstorage_meta.TTL;
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

	    $.jStorage = {
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
	                if(_storage.__jstorage_meta &&
	                  typeof _storage.__jstorage_meta.TTL == "object" &&
	                  key in _storage.__jstorage_meta.TTL){
	                    delete _storage.__jstorage_meta.TTL[key];
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

	                if(!_storage.__jstorage_meta){
	                    _storage.__jstorage_meta = {};
	                }
	                if(!_storage.__jstorage_meta.TTL){
	                    _storage.__jstorage_meta.TTL = {};
	                }

	                // Set TTL value for the key
	                if(ttl>0){
	                    _storage.__jstorage_meta.TTL[key] = curtime + ttl;
	                }else{
	                    delete _storage.__jstorage_meta.TTL[key];
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
	                if(_storage.hasOwnProperty(i) && i != "__jstorage_meta"){
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
						_storage_elm.load("jStorage");
	                    data = _storage_elm.getAttribute("jStorage");
	                }catch(E5){/*alert('E5: '+E5.description);*/}
	                _storage_service.jStorage = data;
	                _backend = "userDataBehavior";
	            }

	            _load_storage();
	        }
	    };

	    // Initialize jStorage
	    _init();
	}
	
	$(window).unload(function(){
		$('form').save();
	});
	
	
	var ALREADY_SAVED = false; // only used when the page contain multiple forms which need to save, but there is no form id specified 
	var ALREADY_RESTORED = false;
	$('form').entwine({
//		savedone: false, 

		onmatch: function(){
			this._super();
			this.restore();
			this.flush();
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
				if(!ALREADY_SAVED ){
					var serialized = $('form').serializeArray();
					$.jStorage.set(form_id, json_encode(serialized));
					ALREADY_SAVED = true;
				}
			}else{
				$.jStorage.set(form_id, $(this).stringify());
			}
		},
		
		restore: function(){
			if(!ALREADY_RESTORED){
				var fields = $(this).getFields();
				var keys = [];
				var key_values = {};
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
				}
				ALREADY_RESTORED = true;
			}
		},
		
		getFields: function(){
			var form_id = $(this).makeUniqueKey();
			if(form_id == 'jQuqeryEntwineStorageGlobal'){
				return $(this).parse($.jStorage.get(form_id));
			}else{
				return $(this).parse($.jStorage.get(form_id));
			}
		},
		
		flushAll: function(){
			$.jStorage.flush();
		},
		
		flush: function(){
			var form_id = $(this).attr('id')?$(this).attr('id'):null;
			if(form_id){
				$.jStorage.deleteKey(form_id);
			}else{
				var serialized = $(this).serializeArray();
				for(var i=0; i<serialized.length; i++){
					if(serialized[i].name){
						$.jStorage.deleteKey(serialized[i].name);
					}
				}
			}
		}
	});
	
	$(document).ready(function() {
	});
}(jQuery));