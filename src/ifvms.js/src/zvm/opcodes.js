/*

Z-Machine opcodes
=================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Abstract out the signed conversions such that they can be eliminated if possible
	don't access memory directly
	
*/

// If the .write() of an operand generates code to access the stack or the memory (if non-native ByteArray) then don't access it more than once
// Currently only for @test
var rUnsafeOperand = native_bytearrays ? /^s/ : /^[sm]/,
safe_operand = function( opcode, operand )
{
	var temp = operand.write();
	if ( rUnsafeOperand.test( temp ) )
	{
		opcode.pre.push( 'var ' + opcode.temp() + '=' + temp );
		temp = 't' + opcode.pc;
	}
	return temp;
},

// Common functions
simple_func = function( a ) { return a.write(); },

// Common opcodes
alwaysbranch = opcode_builder( Brancher, function() { return 1; } ),

// Indirect variable operand
IndirectVariable = Variable.subClass({
	write: function( value )
	{
		var havevalue = arguments.length,
		variable = this.v;
		if ( this.v.write || this.v == 0 )
		{
			value = value && value.write ? value.write() : value;
			variable = variable.write ? variable.write() : variable;
			return 'e.indirect(' + variable + ( havevalue ? ',' + value : '' ) + ')';
		}
		return this._super( value );
	}
}),

// Indirect storer opcodes - rather non-generic I'm afraid
// Not used for inc/dec
// @load (variable) -> (result)
// @pull (variable)
// @store (variable) value
Indirect = Storer.subClass({
	storer: 0,
	
	// Fake a storer operand
	post: function()
	{
		var operands = this.operands;
		
		// If the indirect operand is a variable we replace it with a new variable whose value is the first
		operands[0] = new IndirectVariable( this.e, operands[0] instanceof Variable ? operands[0] : operands[0].v );
		
		// Get the storer
		this.storer = this.code == 142 ? operands.pop() : operands.shift();
		
		// @pull needs an added stack. If for some reason it was compiled with two operands this will break!
		if ( operands.length == 0 )
		{
			operands.push( new Variable( this.e, 0 ) );
		}
	},
	
	func: simple_func
}),

opcodes = {
	
/* je */ 1: opcode_builder( Brancher, function( a, b ) { return arguments.length == 2 ? a.write() + '==' + b.write() : 'e.jeq(' + this.var_args( arguments ) + ')'; } ),
/* jl */ 2: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '<' + b.U2S(); } ),
/* jg */ 3: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '>' + b.U2S(); } ),
// Too many U2S/S2U for these...
/* dec_chk */ 4: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable.write() + ',-1))<' + value.U2S(); } ),
/* inc_chk */ 5: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable.write() + ',1))>' + value.U2S(); } ),
/* jin */ 6: opcode_builder( Brancher, function( a, b ) { return 'e.jin(' + a.write() + ',' + b.write() + ')'; } ),
/* test */ 7: opcode_builder( Brancher, function( bitmap, flag ) { var temp = safe_operand( this, flag ); return bitmap.write() + '&' + temp + '==' + temp; } ),
/* or */ 8: opcode_builder( Storer, function( a, b ) { return a.write() + '|' + b.write(); } ),
/* and */ 9: opcode_builder( Storer, function( a, b ) { return a.write() + '&' + b.write(); } ),
/* test_attr */ 10: opcode_builder( Brancher, function( object, attr ) { return 'e.test_attr(' + object.write() + ',' + attr.write() + ')'; } ),
/* set_attr */
/* clear_attr */
/* store */ 13: Indirect,
/* insert_obj */
/* loadw */ 15: opcode_builder( Storer, function( array, index ) { return 'm.getUint16(' + array.write() + '+2*' + index.U2S() + ')'; } ),
/* loadb */ 16: opcode_builder( Storer, function( array, index ) { return 'm.getUint8(' + array.write() + '+' + index.U2S() + ')'; } ),
/* get_prop */ 17: opcode_builder( Storer, function( object, property ) { return 'e.get_prop(' + object.write() + ',' + property.write() + ')'; } ),
/* get_prop_addr */ 18: opcode_builder( Storer, function( object, property ) { return 'e.get_prop_addr(' + object.write() + ',' + property.write() + ')'; } ),
/* get_next_prop */
/* add */ 20: opcode_builder( Storer, function( a, b ) { return 'e.S2U(' + a.write() + '+' + b.write() + ')'; } ),
/* sub */ 21: opcode_builder( Storer, function( a, b ) { return 'e.S2U(' + a.write() + '-(' + b.write() + '))'; } ),
/* mul */ 22: opcode_builder( Storer, function( a, b ) { return 'e.S2U(' + a.write() + '*' + b.write() + ')'; } ),
/* div */ 23: opcode_builder( Storer, function( a, b ) { return 'e.S2U(parseInt(' + a.U2S() + '/' + b.U2S() + '))'; } ),
/* mod */ 24: opcode_builder( Storer, function( a, b ) { return 'e.S2U(' + a.U2S() + '%' + b.U2S() + ')'; } ),
/* call_2s */ 25: CallerStorer,
/* call_2n */ 26: Caller,
/* set_colour */
/* throw */
/* jz */ 128: opcode_builder( Brancher, function( a ) { return a.write() + '==0'; } ),
/* get_sibling */
/* get_child */
/* get_parent */
/* get_prop_length */ 132: opcode_builder( Storer, function( a ) { return 'e.get_prop_len(' + a.write() + ')'; } ),
/* inc */ 133: opcode_builder( Opcode, function( a ) { return 'e.incdec(' + a.write() + ',1)'; } ),
/* dec */ 134: opcode_builder( Opcode, function( a ) { return 'e.incdec(' + a.write() + ',-1)'; } ),
/* print_addr */ 135: opcode_builder( Opcode, function( addr ) { return 'e.print(e.text.decode(' + addr.write() + ')[0])' } ),
/* call_1s */ 136: CallerStorer,
/* remove_obj */
/* print_obj */ 138: opcode_builder( Opcode, function( a ) { return 'e.print(e.text.decode(m.getUint16(e.objects+14*(' + a.write() + '-1)+13))[0])'; } ),
/* ret */ 139: opcode_builder( Stopper, function( a ) { return 'e.ret(' + a.write() + ')'; } ),
/* jump */ 140: opcode_builder( Stopper, function( a ) { return 'e.pc=' + a.U2S() + '+' + (this.next - 2) + ''; } ),
/* print_paddr */ 141: opcode_builder( Opcode, function( addr ) { return 'e.print(e.text.decode(' + addr.write() + '*' + this.e.packing_multipler + ')[0])'; } ),
/* load */ 142: Indirect.subClass( { storer: 1 } ),
/* call_1n */ 143: Caller,
/* rtrue */ 176: opcode_builder( Stopper, function() { return 'e.ret(1)'; } ),
/* rfalse */ 177: opcode_builder( Stopper, function() { return 'e.ret(0)'; } ),
// Reconsider a generalised class for @print/@print_ret?
/* print */ 178: opcode_builder( Opcode, function( text ) { return 'e.print("' + text + '")'; }, { printer: 1 } ),
/* print_ret */ 179: opcode_builder( Stopper, function( text ) { return 'e.print("' + text + '");e.ret(1)'; }, { printer: 1 } ),
/* nop */ 180: Opcode,
/* restart */ 183: opcode_builder( Stopper, function() { return 'e.act("restart")'; } ), // !!!
/* ret_popped */ 184: opcode_builder( Stopper, function( a ) { return 'e.ret(' + a.write() + ')'; }, { post: function() { this.operands.push( new Variable( this.e, 0 ) ); } } ),
/* catch */
/* quit */ 186: opcode_builder( Stopper, function() { return 'e.act("quit")'; } ),
/* new_line */ 187: opcode_builder( Opcode, function() { return 'e.print("\\n")'; } ),
/* verify */ 189: alwaysbranch, // Actually check??
/* piracy */ 191: alwaysbranch,
/* call_vs */ 224: CallerStorer,
/* storew */ 225: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint16(' + array.write() + '+2*' + index.U2S() + ',' + value.write() + ')'; } ),
/* storeb */ 226: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint8(' + array.write() + '+' + index.U2S() + ',' + value.write() + ')'; } ),
/* put_prop */
/* aread */ 228: opcode_builder( Stopper, function() { var storer = this.operands.pop(); return 'e.read(' + this.var_args( this.operands ) + ',' + storer.v + ');e.pc=' + this.next; }, { storer: 1 } ),
/* print_char */ 229: opcode_builder( Opcode, function( a ) { return 'e.print(String.fromCharCode(' + a.write() + '))'; } ), // !!! Needs proper ZSCII transcoding
/* print_num */ 230: opcode_builder( Opcode, function( a ) { return 'e.print(' + a.U2S() + ')'; } ),
/* random */
/* push */ 232: opcode_builder( Storer, simple_func, { post: function() { this.storer = new Variable( this.e, 0 ); }, storer: 0 } ),
/* pull */ 233: Indirect,
/* split_window */
/* set_window */
/* call_vs2 */ 236: CallerStorer,
/* erase_window */
/* erase_line */
/* set_cursor */
/* get_cursor */
/* set_text_style */ 241: opcode_builder( Opcode, function( stylebyte ) { return 'e.ui.set_style(' + stylebyte.write() + ')'; } ),
/* buffer_mode */
/* output_stream */
/* input_stream */
/* sound_effect */
/* read_char */ 246: opcode_builder( Stopper, function() { return 'e.act("quit")'; } ), // !!!
/* scan_table */
/* not */ 248: opcode_builder( Storer, function( a ) { return 'e.S2U(~' + a.write() + ')'; } ),
/* call_vn */ 249: Caller,
/* call_vn2 */ 250: Caller,
/* tokenise */
/* encode_text */
/* copy_table */
/* print_table */
/* check_arg_count */ 255: opcode_builder( Brancher, function( arg ) { return arg.write() + '<=e.call_stack[0][4]'; } ),
/* save */
/* restore */
/* log_shift */ 1002: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.log_shift(' + a.write() + ',' + b.U2S() + '))'; } ),
/* art_shift */ 1003: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.art_shift(' + a.U2S() + ',' + b.U2S() + '))'; } ),
/* set_font */
/* save_undo */ 1009: opcode_builder( Storer, function() { return 'e.save_undo(' + this.next + ',' + this.storer.v + ')'; } ),
// As the standard says this is technically illegal, we don't need to actually store the result
/* restore_undo */ 1010: opcode_builder( Opcode, function( a ) { return 'if(e.restore_undo(' + a.v + '))return'; }, { storer: 1 } ),
/* print_unicode */ 1011: opcode_builder( Opcode, function( a ) { return 'e.print(String.fromCharCode(' + a.write() + '))'; } ),
/* check_unicode */
// Assume we can print and read all unicode characters rather than actually testing
1012: opcode_builder( Storer, function() { return 3; } ),
/* gestalt */ 1030: opcode_builder( Storer, function() { return 'e.gestalt(' + this.var_args( arguments ) + ')'; } ),
/* parchment */ 1031: opcode_builder( Storer, function() { return 'e.op_parchment(' + this.var_args( arguments ) + ')'; } )
	
};