"use strict";
process.title = 'parchment-ifs';

/*
1. Client connects
2. Client <- LIST of rooms
3. Client -> JOIN (name, room)
4. Clients <- JOIN (name)
5. Client <- HISTORY
6. Clients <- NAMES in room
-----
7. Client -> MSG
8. Clients <- MSG response
-----
9. Client -> PARTs the room
10. Clients <- PART (name)
11. Clients <- NAMES in room
12. Goto #2
*/
 
var webSocketServer = require('websocket').server,
	sanitize = require('validator').sanitize,
	http = require('http'),
	fs = require('fs'),
	port = 1337,
	clients = [], // array of clients' names
	rooms = {};


var Client = (function() {
	function Client(connection){
		this.conn = connection;
	}
	Client.prototype = {
		send: function(type, data){
			var json = JSON.stringify({ type:type, data:data });
			this.conn.sendUTF(json); 
		},
		partRoom: function(){
			if (this.room)
				rooms[this.room].clientPart(this);
		},
		sendList: function(){
			var list = {};
			for (var i in rooms){
				list[i] = rooms[i].url;
			}
			this.send("LIST", list);
		}
	}
	return Client;
})();

var ChatRoom = (function() {
	function ChatRoom(title, gameurl, callback){
		var self = this;
		this.title = title;
		this.url = gameurl;
		this.history = [];
		this.clients = {};
	}
	ChatRoom.prototype = {
		send: function(type, data){
			for(var i in this.clients)
				this.clients[i].send(type, data);
		},
		sendMsg: function(client, data){
			var msg = {
				time: (new Date()).getTime(),
				name: client.name,
				mode: data.mode,
				input: data.input
			};
			this.history.push(msg);
			this.send("MSG", msg);
		},
		sendHistory: function(client){
			client.send("HISTORY", this.history);
		},
		sendNames: function(){
			this.send("NAMES", Object.keys(this.clients));
		},
		clientJoin: function(client, name){
			console.log(name);
			if (this.clients[name])
				return false;
			client.name = name;
			client.room = this.title;
			this.send("JOIN", client.name);
			this.sendHistory(client);
			this.clients[client.name] = client;
			this.sendNames();
			return true;
		},
		clientPart: function(client){
			client.room = null;
			delete this.clients[client.name];
			this.send("PART", client.name);
			this.sendNames();
		}
	}
	return ChatRoom;
})();

var room1 = new ChatRoom("Cruel's Test Room", "http://www.ifarchive.org/if-archive/games/zcode/bj.z5");
// var room1 = new ChatRoom("Cruel's Test Room", "http://inform7.com/learn/eg/glass/Glass.zblorb");
rooms["Cruel's Test Room"] = room1;


// HTTP Server
var server = http.createServer(function(request, response) {
	//
});
server.listen(port, function() {
	console.log((new Date()) + " Server is listening on port " + port);
});


// WebSocket Server
var wsServer = new webSocketServer({httpServer: server});
 
wsServer.on('request', function(request) {
	console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
	// should check 'request.origin' (http://en.wikipedia.org/wiki/Same_origin_policy)
	var connection = request.accept(null, request.origin),
		client = new Client(connection),
		room;
 
	console.log((new Date()) + ' Connection accepted.');
	// client.send("LIST", Object.keys(rooms));
	client.sendList();
 
	connection.on('message', function(message) {
		if (message.type === 'utf8') { // accept only text
			var json = JSON.parse(message.utf8Data);
			console.log(json);
			switch(json.type){
				case "MSG":
					// console.log((new Date()) + ' Received Message from '+ client.name + ': ' + json.data);
					rooms[client.room].sendMsg(client, json.data);
					break;
				case "JOIN":
					if (rooms[json.data.room]){
						rooms[json.data.room].clientJoin(client, json.data.name);
					} else
						console.log("Room \""+rooms[json.data.room]+"\" doesn't exist");
					break;
				case "PART":
					break;
			}
		}
	});
 
	// user disconnected
	connection.on('close', function(connection) {
		if (client) {
			console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
			client.partRoom();
			delete clients[clients.indexOf(client.name)];
		}
	});
 
});
