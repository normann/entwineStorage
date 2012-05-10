JSOTRAGE_TEST = {
	insert_value: function(){
		var row = $("<tr>"),
			key = $('#key').val(),
			val = $('#val').val(),
			ttl = Number($('#ttl').val()) || 0;
		if(!key){
			alert("KEY NEEDS TO BE SET!");
			$('#key').focus();
			return;
		}
		$.jStorage.set(key, val);
		if(ttl>0){
		    $.jStorage.setTTL(key, ttl);
		}
		$('#key').val("");
		$('#val').val("");
		$('#ttl').val("");
		this.reDraw();
	},
	get_value: function(){
		var value = $.jStorage.get($("#key2").val());
		alert(value);
		$('#key2').val("");
	},
	flush_values: function(){
		$.jStorage.flush();
		this.reDraw();
	},
	reDraw: function(){
		var row, del, indx=$.jStorage.index(), valuetd;
		$("tr.rida").remove();
		for(var i=0; i<indx.length; i++){
			row = $("<tr>").attr("class", "rida");
			row.append($("<td>").html(indx[i]));
			valuetd = $("<td>").html($.jStorage.get(indx[i]));
			valuetd.attr("colspan",2);
			valuetd.colspan = 2;
			row.append(valuetd);
			del = $("<a>").attr("href", "javascript:void(0)").html("DEL");
			row.append($("<td>").append(del));
			$("#tulemused").append(row);
			del.click(function(e){
				var keyofthis = $(this).parents('tr').children('td').first().html();
				$.jStorage.deleteKey(keyofthis);
				JSOTRAGE_TEST.reDraw();
			});
		}
	}
};