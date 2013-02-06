/*

Parchment load scripts
======================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/
(function(window, $){

var parchment = window.parchment;

// Load Parchment, start it all up!
$(function()
{
	var library;
	
	// Check for any customised options
	if ( window.parchment_options )
	{
		$.extend( parchment.options, parchment_options );
	}
	
	// Load additional options from the query string
	// Is a try/catch needed?
	if ( !parchment.options.lock_options && urloptions.options )
	{
		$.extend( parchment.options, $.parseJSON( urloptions.options ) );
	}
	
	// Some extra debug options
	/* DEBUG */
	parchment.options.debug = urloptions.debug;
	/* ENDDEBUG */

	window.server = new IFS('', 'cruels.net', 1337);
	if (!server.connection)
		console.log('No websocket, son');
	
	// Load the library
	library = new parchment.lib.Library();
	parchment.library = library;
	library.load();
});

})( this, jQuery );