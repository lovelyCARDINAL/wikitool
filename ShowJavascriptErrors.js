// This only shows alerts for things after this handler is installed of course.
// Because this is a gadget, error reporting can thus be inconsistent.
var originalErrorHandler = window.onerror || null;
// Column and error args are optional
window.onerror = function ( message, url, line, colomn, error ) {
	var $msg = $( '<p>' );
	if ( url ) {
		$( '<span>' )
			.text( url + ' at line ' + line + ': ' )
			.appendTo( $msg );
	}
	$( '<span>' )
		.text( message )
		.appendTo( $msg );

	mw.notify( $msg, {
		autoHide: true,
		autoHideSeconds: 10,
		tag: null,
		title: 'Javascript Error',
		type: 'error'
	} );
	if (originalErrorHandler) {
		return originalErrorHandler.apply(this, arguments);
	}
};
// unbind on leaving the page
$( window )
	.on( 'unload', function () {
		window.onerror = originalErrorHandler;
	} );
