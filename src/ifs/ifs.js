$(function(){

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
				for (var room in rooms){
					var button = $('<li>', {text: room, class:"room"});
					button.data('room', room);
					button.click(onRoomClick);
					$rooms.append(button);
				}
				if (urloptions.room && rooms[urloptions.room]){
					$('#ifs > div').hide(); 
					$('#nick').show(); 
				}
				break;
			case "JOIN":
				console.log(json.data + " joined the game!");
				break;
			case "PART":
				console.log(json.data + " left the game!");
				break;
			case "HISTORY":
				// Load up the game and push history through engine
				urloptions.story = rooms[urloptions.room];
				parchment.library.load();

				var t = setInterval(function(){
					if (runner) {
						clearInterval(t);
						console.log("Loading room history...");
						// runner.fromParchment({ code: 'jump' });
						for (var i in json.data){
							console.log(json.data[i]);
							processCommand(json.data[i]);
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
				// $('#setup').hide(); 
				break;
			case "GAMES":
				// var games = json.data;
				// $games.empty();
				// for (i in games){
				// 	var button = $('<li>', {text: games[i], class:"room"});
				// 	button.data('game', games[i]);
				// 	button.click(onGameClick);
				// 	$games.append(button);
				// }
				// hideStartups();
				// $('#games').show();
				break;
			default:
				console.log('Hmm..., I\'ve never seen JSON like this: ', json);
		}
	},	
});

function processCommand(data){
	var ti = runner.io.TextInput;
	if (data.mode == "line"){
		$('.TextInput').val(data.input);
		ti.submitLine(data.name);
	} else {
		ti.keyCode = data.input.keyCode;
		ti.charCode = data.input.charCode;
		ti.submitChar(data.name);
	}
}

window.sendToServer = function(type, data){
	var json = JSON.stringify({ type:type, data:data });
	server.connection.send(json); 
}

function onRoomClick(){
	// sendToServer("JOIN", $(this).data('room'));
	var room = encodeURIComponent($(this).data('room')).split('%20').join('+');
	window.location = "?room=" + room;
}

window.formatTime = function(time){
	return (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
		 + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
}

window.stringToRGB = function(str, invert){
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

$doc.on('TextInput', function(evt){
	console.log(evt.mode + " - " + evt.input, evt.input.charCode, evt.input.keyCode);
});

});