/* global $, mw, wgULS */
"use strict";
$.when(
    mw.loader.using(["mediawiki.util", "ext.gadget.site-lib"]),
    $.ready
).then(() => {
    let sllink, sltext, sltitle;
    const NS = [0, 4, 12], wgScript = mw.config.get("wgScript"), wgTitle = mw.config.get("wgTitle"), wgNamespaceNumber = mw.config.get("wgNamespaceNumber"), RelevantPageName = mw.config.get("wgRelevantPageName").split(" ").join("_"), isWhatlinkshere = mw.config.get("wgCanonicalSpecialPageName") === "Whatlinkshere", isTemplate = wgNamespaceNumber === 10 || RelevantPageName.startsWith("Template:"), Title = isWhatlinkshere
        ? encodeURIComponent(RelevantPageName.replace(/^(Template:|萌娘百科:|File:|Help:)/giu, "")) : encodeURIComponent(wgTitle.split(" ").join("_"));
    if (wgNamespaceNumber === 6 || RelevantPageName.startsWith("File:")) {
        sllink = `${window.searchLinksSite ? window.searchLinksSite : wgScript}?title=Special:Search&search=insource:%22${Title}%22&profile=advanced&ns0=1&ns2=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1`,
            sltext = wgULS("查找链入", "搜尋連入"),
            sltitle = wgULS("通过高级搜索查找链入", "搜尋實際連結至此的頁面");
    } else if (NS.includes(wgNamespaceNumber) || (isWhatlinkshere && !isTemplate)) {
        sllink = `${wgScript}?title=Special:Search&search=insource:%22${Title}%22+linksto:%22${encodeURIComponent(RelevantPageName)}%22&profile=advanced&ns0=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1`,
            sltext = wgULS("查找链入", "搜尋連入"),
            sltitle = wgULS("通过高级搜索查找链入", "搜尋實際連結至此的頁面");
    } else if (isTemplate) {
        sllink = `${wgScript}?title=Special:Search&search=insource:%22${Title}%22+hastemplate:%22${Title}%22&profile=advanced&ns0=1&ns4=1&ns8=1&ns10=1&ns12=1&ns14=1&ns828=1`,
            sltext = wgULS("查找嵌入", "搜尋嵌入"),
            sltitle = wgULS("通过高级搜索查找嵌入", "搜尋實際的嵌入");
    }
    mw.util.addPortletLink(
        "p-cactions",
        sllink,
        sltext,
        "ca-searchlinks",
        sltitle,
    );
    $("#ca-searchlinks a")[0].setAttribute("target", "_blank");
});
