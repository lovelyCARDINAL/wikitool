if (mw.config.get('wgNamespaceNumber') === 0) {
  jQuery(document).ready(function(){
    'use strict';
    mw.util.addPortletLink('p-cactions', 
      mw.config.get('wgScript') + "?title=Special:Search&search=" + "insource:%22" +
      (mw.config.get('wgTitle').split(" ").join("_")) + "%22" + "+linksto:%22" + 
      (mw.config.get('wgTitle').split(" ").join("_")) + "%22" + "&profile=advanced&ns0=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1", 
    '查找链入', 'ca-searchlinks', "通过高级搜索查找链入");
  });
}
