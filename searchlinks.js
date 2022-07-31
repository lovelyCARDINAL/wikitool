'use strict';
$.when( mw.loader.using( ['mediawiki.util', 'ext.gadget.site-lib'] ), $.ready )
.then( function () {
    const NS = [0,4,12],
        wgScript = mw.config.get('wgScript'),
        wgNamespaceNumber = mw.config.get('wgNamespaceNumber'),
        RelevantPageName = mw.config.get('wgRelevantPageName').split(" ").join("_"),
        isWhatlinkshere = mw.config.get('wgCanonicalSpecialPageName') === 'Whatlinkshere';
    const Title = isWhatlinkshere ? encodeURIComponent(RelevantPageName.replace(/^(Template:|萌娘百科:|Help:)/gi,"")) : encodeURIComponent(mw.config.get('wgTitle').split(" ").join("_"));
    if (NS.includes(wgNamespaceNumber) || isWhatlinkshere) {
        mw.util.addPortletLink('p-cactions', 
            wgScript + "?title=Special:Search&search=" + "insource:%22" + Title + "%22" + "+linksto:%22" + encodeURIComponent(RelevantPageName) + "%22" + "&profile=advanced&ns0=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1", 
            wgULS('查找链入', '搜尋連入'), 'ca-searchlinks', wgULS('通过高级搜索查找链入', '搜尋實際連結至此的頁面')
        );
    } else if (wgNamespaceNumber === 10 || isWhatlinkshere) {
        mw.util.addPortletLink('p-cactions', 
            wgScript + "?title=Special:Search&search=" + "insource:%22" + Title + "%22" + "+hastemplate:%22" + Title + "%22" + "&profile=advanced&ns0=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1", 
            wgULS('查找嵌入', '搜尋嵌入'), 'ca-searchlinks', wgULS('通过高级搜索查找嵌入', '搜尋實際的嵌入')
        );
    };
});
