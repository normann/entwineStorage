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
		$.EntwinedStorage.set(key, val);
		if(ttl>0){
		    $.EntwinedStorage.setTTL(key, ttl);
		}
		$('#key').val("");
		$('#val').val("");
		$('#ttl').val("");
		this.reDraw();
	},
	get_value: function(){
		var value = $.EntwinedStorage.get($("#key2").val());
		alert(value);
		$('#key2').val("");
	},
	flush_values: function(){
		$.EntwinedStorage.flush();
		this.reDraw();
	},
	reDraw: function(){
		var row, del, indx=$.EntwinedStorage.index(), valuetd;
		$("tr.rida").remove();
		for(var i=0; i<indx.length; i++){
			row = $("<tr>").attr("class", "rida");
			row.append($("<td>").html(indx[i]));
			valuetd = $("<td>").html($.EntwinedStorage.get(indx[i]));
			valuetd.attr("colspan",2);
			valuetd.colspan = 2;
			row.append(valuetd);
			del = $("<a>").attr("href", "javascript:void(0)").html("DEL");
			row.append($("<td>").append(del));
			$("#tulemused").append(row);
			del.click(function(e){
				var keyofthis = $(this).parents('tr').children('td').first().html();
				$.EntwinedStorage.deleteKey(keyofthis);
				JSOTRAGE_TEST.reDraw();
			});
		}
	}
};