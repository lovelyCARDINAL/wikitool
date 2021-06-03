$( function($) {
	$( '.mw-rollback-link a' ).click( function(e) {
		e.preventDefault();
		var $el = $(this);
		$.ajax({
			url: $el.attr('href'),
			success: function() {	
				// [[phab:T29606]]
				var user = mw.util.getParamValue( 'from', $el.attr('href') ).replace(/\+/g, '_');
				location.href = mw.util.getUrl( 'Special:Contributions/' + user );
			},
			error: function(){
				$el.text(function( i, val ) {
					return val + ' [failed]';
				} );		
			}
		});
	} );
});
