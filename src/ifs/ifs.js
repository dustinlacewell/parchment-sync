$(function(){

jQuery.fn.reverse = [].reverse;

var rooms;

window.WebSocket = window.WebSocket || window.MozWebSocket;

window.IFS = Object.subClass({
	init: function(gamefile, ip, port){
		if (!window.WebSocket)
			return false;
		var conn = new window.WebSocket('ws://'+ip+':'+port);
		conn.onopen = this.onopen;
		conn.onclose = this.onclose;
		conn.onerror = this.onerror;
		conn.onmessage = this.onmessage;
		// console.log(conn);
		this.connection = conn;
		setInterval(function() {
			if (conn.readyState !== 1) {
				//
			}
		}, 3000);
	},
	onopen: function(){
		$('#ifs > div').hide(); 
		$('#rooms').show(); 
	},
	onclose: function(){
		//
	},
	onerror: function(error){
		//
	},
	onmessage: function(message){
		try {
			var json = JSON.parse(message.data);
		} catch (e) {
			console.log('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}
		console.log(json.type, json.data);
		switch (json.type){
			case "MSG":
				processCommand(json.data);
				break;
			case "LIST":
				var $rooms = $('#rooms ul');
			    rooms = json.data;
				$rooms.empty();
				$('#ifs > div').hide();
				$('#rooms').show();
				for (var room in rooms){
					var button = $('<li>', {text: room, class:"room"});
					button.data('room', room);
					button.click(onRoomClick);
					$rooms.append(button);
				}
				if (urloptions.room && rooms[urloptions.room]){ 
					$('#rooms').hide();
					$('#nick').show();
					$('#name').focus(); 
				}
				break;
			case "JOIN":
				// console.log(json.data + " joined the game!");
				break;
			case "PART":
				// console.log(json.data + " left the game!");
				break;
			case "HISTORY":
				// Load up the game and push history through engine
				urloptions.story = rooms[urloptions.room];
				urloptions.save = json.data.save;
				loadParchmentIFS();
				// TODO: what if MSG is recieved while loading game/history?

				var t = setInterval(function(){
					if (runner != undefined) {
						clearInterval(t);
						console.log("Loading room history...");
						var commands = json.data.commands;
						for (var i in commands){
							console.log(commands[i]);
							processCommand(commands[i]);
						}
					}
				}, 50);
				break;
			case "NAMES":
				var names = json.data,
					$names = $('#names');
				$names.empty();
				for (i in names){
					$names.append($('<p>', {text:names[i]}));
				}
				break;
			case "RESTORE":
				runner.fromParchment({
					code: 'restore',
					data: file.base64_decode(json.data)
				});
				break;
			default:
				console.log('Hmm..., I\'ve never seen JSON like this: ', json);
		}
	},	
});

function processCommand(data){
	var ti = runner.io.TextInput;
	switch(data.mode){
		case "line":
			var t = ti.input.val();
			if (data.input.slice(0,1) == '.'){
				// Manually add chat lines
				var html = makeAuthor(data.name)[0].outerHTML;
				html += $('<p>').text(data.input.slice(1)).html(); // HTML escape using jQuery
				processHTML(html);
			} else {
				ti.input.val(data.input);
				ti.submitLine(data.name);
				inputFocus();
			}
			if (t != data.input)
				ti.input.val(t);
			break;
		case "char":
			ti.keyCode = data.input.keyCode;
			ti.charCode = data.input.charCode;
			ti.submitChar(data.name);
			break;
		case "html":
			processHTML(data.input);
			break;
	}
}

function inputFocus(){
	var input = runner.io.TextInput.input;
	if ( $(window).scrollTop() + $(window).height() - input.offset().top > -150 )
		input.focus();
}

function processHTML(html){
	var $lines = $('.main > span').reverse(),
	    input = runner.io.TextInput.input.detach()
	$lines.each(function(){
		var text = $(this).html().split("\n\n");
		if (text.length > 1){
			text.splice(text.length-1, 0, html);
			$(this).html(text.join("\n\n"));
			return false;
		}
	});
	$lines.first().append(input);
	input.val('');
	inputFocus();
}

window.sendToServer = function(type, data){
	var json = JSON.stringify({ type:type, data:data });
	server.connection.send(json); 
};

function onRoomClick(){
	// sendToServer("JOIN", $(this).data('room'));
	var room = encodeURIComponent($(this).data('room')).split('%20').join('+');
	window.location = "?room=" + room;
}

window.makeAuthor = function(userNick){
	var $author = $('<span>',{text:userNick, class:"author"});
	$author.css('color', stringToRGB(userNick));
	// $author.css('text-shadow', "1px 1px 1px " + stringToRGB(userNick, true));
	return $author;
};

window.formatTime = function(time){
	return (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
		 + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
}

window.loadParchmentIFS = function(){
	var library = new parchment.lib.Library();
	parchment.library = library;
	library.load();
};

function stringToRGB(str, invert){
	var hash = 0;
	for (var i = 0; i < str.length; i++)
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	var r = (hash & 0xFF0000) >> 16,
		g = (hash & 0x00FF00) >> 8,
		b = (hash & 0x0000FF);
	if (invert)
		return "rgb("+(255-r)+','+(255-g)+','+(255-b)+')';
	else
		return "rgb("+r+','+g+','+b+')';
}

$('#name').keydown(function(e){
	if (e.keyCode === 13){
		sendToServer("JOIN", {name:$(this).val(), room:urloptions.room});
	}
}).keyup(function(){
	$(this).css('color', stringToRGB($(this).val()));
});

$('#rooms button').click(function(){
	console.log('new room...');
	$('#rooms').hide();
	$('#games').show();
});

map_results_callback = function( story ){
	return $('<li>', {text: story.desc})
		.click(function(){
			var title = $('#roomtitle').val();
			if ($.trim(title) != '') {
				sendToServer("JOIN", {
					room: title,
					url: "http://mirror.ifarchive.org/"+story.path
				});
			} else
				$('#setuperror').show().text("Enter a room title.");	
		});
};

$('#search').keydown(function(){
	var $this = $(this);
	$this.unbind( 'keydown' );
	$.getJSON( 'stories/if-archive.json' )
		.done(function( data ){
			var dosearch = function() {
				// Filter the archive
				var key = RegExp( $('#search').val().replace( ' ', '( )?' ), 'i' ),
				results = $.grep( data, function( story ){
					return key.test( story.path + story.desc );
				});
				results = results.slice( 0, 30 );
				$('#games ul').empty().append($.map(results, map_results_callback));
			};
			// Attach the real handler once the archive's been downloaded, and then run it once
			$this.keyup( dosearch );
			dosearch();
		});
});

});