// <nowiki>
/**
** This is the installer-Script for MediaWiki:AxUserMsg.js
** Using LOD (Load on demand) to increase the overall page-loading time.
** Written in 2011 by Rillke
**
**/
/* eslint indent:["error","tab",{"outerIIFEBody":0}] */
( function () {
'use strict';

var linktext = 'Notify this user',
	nsNr = mw.config.get( 'wgNamespaceNumber' );
if ( nsNr === 3 || nsNr === 2 ||
	( nsNr === -1 &&
		[ 'Contributions', 'DeletedContributions', 'Block', 'CentralAuth', 'Userrights', 'Listfiles', 'Log' ].indexOf( mw.config.get( 'wgCanonicalSpecialPageName' ) ) !== -1
	) ) {
	var loadFullScript = function () {
		mw.loader.load( mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' ) + '?title=MediaWiki:AxUserMsg.js&action=raw&ctype=text/javascript&dummy=1' );
		setTimeout( function () {
			if ( !window.AxUserMsg ) { loadFullScript(); }
		}, 4500 );
	};

	if ( window.installOldLinks || window.AxUserMsgFireAsYouClick ) {
		if ( window.AxUserMsgFireAsYouClick ) { window.installOldLinks = true; }
		// User wants old links - therefore we have to load the whole script each time
		loadFullScript();
		return;
	} else {
		$( function () {
			mw.loader.using( [ 'mediawiki.util' ], function () {
				if ( window.installOldLinks || window.AxUserMsgFireAsYouClick ) {
					if ( window.AxUserMsgFireAsYouClick ) { window.installOldLinks = true; }
					// User js was loaded later, so do it now!
					loadFullScript();
					return;
				}

				if ( !$( '#t-AjaxUserMessage' ).length && !$( '#t-AjaxUserMessageLOD' ).length ) {
					var pHref = mw.util.addPortletLink( 'p-tb', '#', linktext, 't-AjaxUserMessageLOD', 'Launch user messages script' );
					if ( !pHref ) { mw.notify( 'Gadget user messages: Unable to install link!' ); }

					$( pHref ).on( 'click.umBootStrap', function ( e ) {
						var $linknode = $( this ).find( 'a' );
						if ( !$linknode.length ) { $linknode = $( this ); }
						e.preventDefault();
						$linknode.text( 'Loading...' );
						$( document ).on( 'scriptLoaded', function ( evt, st, o ) {
							if ( st ) {
								if ( st === 'AxUserMsg' && o ) {
									$linknode.text( linktext );
									o.umNotifyUser();
								}
							}
						} );
						$( this ).off( 'click.umBootStrap' );
						loadFullScript();
					} );
				}

			} );
		} );
	}
} // Namespace Guard
}() );
// </nowiki>
