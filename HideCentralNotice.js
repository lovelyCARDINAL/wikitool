/**
 * Prevent CentralNotice banners from being loaded.
 *
 * This script relies on being able to listen for events emitted
 * by the browser when it starts proccessing a script, image or iframe.
 * If this script is loaded after the one it is trying to prevent, it will
 * effectivelty do nothing.
 */
if ( document.addEventListener ) {

	function blockBannerLoader (e) {
		var element, src;
		if (!e || !e.preventDefault) {
			return;
		};
		element = e.target;
		if (!element) {
			return;
		}
	
		if (element.nodeName.toLowerCase() === 'script') {
			src = String(element.src);
			if (src.indexOf('Special:BannerLoader') !== -1 || src.indexOf('Special:BannerListLoader') !== -1) {
				e.preventDefault();
			}
		}
	}
	
	// Listen to every script, image, iframe etc. being addded
	document.addEventListener('beforeload', blockBannerLoader, true);
}
