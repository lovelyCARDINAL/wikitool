let NS = [0,4,12]
if ( NS.includes(mw.config.get('wgNamespaceNumber')) ) {
  jQuery(document).ready(function(){
    'use strict';
    mw.util.addPortletLink('p-cactions', 
      mw.config.get('wgScript') + "?title=Special:Search&search=" + "insource:%22" +
      (mw.config.get('wgTitle').split(" ").join("_")) + "%22" + "+linksto:%22" + 
      (mw.config.get('wgPageName').split(" ").join("_")) + "%22" + "&profile=advanced&ns0=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1", 
    '查找链入', 'ca-searchlinks', "通过高级搜索查找链入");
  });
}
if (mw.config.get('wgNamespaceNumber') === 10) {
  jQuery(document).ready(function(){
    'use strict';
    mw.util.addPortletLink('p-cactions', 
      mw.config.get('wgScript') + "?title=Special:Search&search=" + "insource:%22" +
      (mw.config.get('wgTitle').split(" ").join("_")) + "%22" + "+hastemplate:%22" + 
      (mw.config.get('wgTitle').split(" ").join("_")) + "%22" + "&profile=advanced&ns0=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1", 
    '查找嵌入', 'ca-searchlinks', "通过高级搜索查找嵌入");
  });
}
