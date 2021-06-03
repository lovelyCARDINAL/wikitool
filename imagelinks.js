/*  _____________________________________________________________________________
 * |                                                                             |
 * |                    === WARNING: GLOBAL GADGET FILE ===                      |
 * |                  Changes to this page affect many users.                    |
 * | Please discuss changes on the talk page or on [[WT:Gadget]] before editing. |
 * |_____________________________________________________________________________|
 *
 * Direct imagelinks to Commons
 *
 * Required modules: mediawiki.util
 *
 * @source https://www.mediawiki.org/wiki/Snippets/Direct_imagelinks_to_Commons
 * @author Krinkle
 * @version 2015-08-01
 */
if ( mw.config.get( 'wgNamespaceNumber', 0 ) >= 0 ) {
	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var
			uploadBaseRe = /^\/\/upload\.wikimedia\.org\/wikipedia\/commons/, //谁能告诉我这里怎么修改

			localFileNSString = mw.config.get( 'wgFormattedNamespaces' )['6'] + ':',
			localBasePath = new RegExp(
				'^' + mw.util.escapeRegExp( mw.util.getUrl( localFileNSString ) )
			),
			localBaseScript = new RegExp(
				'^' + mw.util.escapeRegExp(
					mw.util.wikiScript() + '?title=' + mw.util.wikiUrlencode( localFileNSString )
				)
			),

			commonsBasePath = '//commons.moegirl.org.cn/File:',
			commonsBaseScript = '//commons.moegirl.org.cn/index.php?title=File:';

		$content.find( 'a.image' ).attr( 'href', function ( i, currVal ) {
			if ( uploadBaseRe.test( $( this ).find( 'img' ).attr( 'src' ) ) ) {
				return currVal
					.replace( localBasePath, commonsBasePath )
					.replace( localBaseScript, commonsBaseScript );
			}
		} );
	} );
}
