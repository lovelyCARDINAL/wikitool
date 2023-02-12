/* 
自动检查并修复重定向分类，支持检查{{萌点}}和{{Cate}}模板，以及“声优”参数。
源自Xzonn的1.1.1版本https://zh.moegirl.org.cn/User:Xzonn/FixRedirectCategory.js?action=raw&ctype=text/javascript
当前版本only for bot ，自行修改了编辑摘要，监视列表采用nochange
*/
/* global mw, jQuery */
setTimeout(function xzFixRedirectCategory() {
    "use strict";
    let xzFixRedirectCategoryInterval = +localStorage.getItem("xzFixRedirectCategoryInterval");
    if (xzFixRedirectCategoryInterval == 0 || isNaN(xzFixRedirectCategoryInterval)) {
        localStorage.setItem("xzFixRedirectCategoryInterval", (xzFixRedirectCategoryInterval = 1800000));
    }
    if (new Date() - +localStorage.getItem("xzFixRedirectCategoryTime") < xzFixRedirectCategoryInterval) {
        return;
    }
    if (!window.mw || !mw.Api) {
        setTimeout(xzFixRedirectCategory, 100);
        return;
    }
    let missions = 0, interval;
    let rawTexts = {};
    let api = new mw.Api();
    let esc = function (s) {
        return s.replace(/([?.\\^$*+()])/g, "\\$1");
    };
    let printLog = function (text, className, id) {
        if (id) {
            if (jQuery("#" + id).length == 0) {
                jQuery("<p/>").attr("id", id).appendTo(jQuery("#siteNotice"));
            } else {
                jQuery("#" + id).text(text);
            }
        } else {
            jQuery("<p/>").text(text).addClass(className).css({
                "font-size": "18px"
            }).appendTo(jQuery("#siteNotice"));
        }
    };
    let editPageContent = function (data, zhHans, zhHant) {
        let from = data["query"]["redirects"][0]["from"].replace(/^Category:/, ""), to = data["query"]["redirects"][0]["to"].replace(/^Category:/, "");
        data["query"]["categorymembers"].forEach(function (page) {
            missions++;
            return api.get({
                "action": "query",
                "format": "json",
                "pageids": page["pageid"],
                "prop": "revisions",
                "rvprop": "content",
                "rvlimit": 1,
                "meta": "tokens",
                "type": "csrf"
            }).done(function (data) {
                let moe, lastIndex = 0;
                let text;
                if (rawTexts[page["pageid"]]) {
                    text = rawTexts[page["pageid"]];
                } else {
                    text = data["query"]["pages"][page["pageid"]]["revisions"][0]["*"];
                }
                let chineseCate = [from, from.replace(" ", "_"), zhHans, zhHans.replace(" ", "_"), zhHant, zhHant.replace(" ", "_")].map(esc).join("|");
                let reg = new RegExp("\\[\\[\\s*(?:Category|分类|分類|Cat):(?:" + chineseCate + ")\\s*(\\|[^\\[\\]]*)?\\s*\\]\\]", "ig");
                text = text.replace(reg, "[[Category:" + to + "$1]]");

                /* 萌点，cate 模板 */
                // eslint-disable-next-line no-cond-assign
                while (moe = text.substring(lastIndex, text.length).match(/{{\s*(萌点|萌點|[Cc]ate)\s*\|/)) {
                    let left = 2, i, groups = [""];
                    for (i = lastIndex + moe.index + moe[0].length; i < text.length; i++) {
                        if (text[i] == "{") {
                            left++;
                        } else if (text[i] == "}") {
                            left--;
                        }
                        if (left == 2 && text[i] == "|") {
                            groups.push("");
                        } else {
                            groups[groups.length - 1] += text[i];
                        }
                        if (left == 0) {
                            groups[groups.length - 1] = groups[groups.length - 1].substr(0, groups[groups.length - 1].length - 2);
                            break;
                        }
                    }
                    groups = groups.map(x => x.replace(new RegExp("^(\\s*)(" + chineseCate + ")(\\s*)$"), "$1" + to + (moe[1].toLowerCase() == "cate" ? "" : ",$2") + "$3"));
                    groups = groups.map(x => x.replace(new RegExp("^(\\s*)(" + chineseCate + ")([，,].*)$"), "$1" + to + "$3"));
                    groups = groups.map(x => x.replace(/^\s*([^，,\s]+)[，,]\1\s*$/, "$1"));
                    text = text.substring(0, lastIndex + moe.index + moe[0].length) + groups.join("|") + text.substring(i - 1, text.length);
                    lastIndex = i;
                }

                /* 声优 参数 */
                text = text.replace(new RegExp("(\\|\\s*(?:声优|聲優|配音)\\s*=\\s*)(?:" + chineseCate + ")(?=\\s*[\\|\\}])", "g"), "$1" + to);

                /* 缓存 */
                rawTexts[page["pageid"]] = text;

                return api.post({
                    "action": "edit",
                    "pageid": page["pageid"],
                    "text": text,
                    "minor": 1,
                    "bot": 1,
                    "tags": "Bot",
                    "watchlist": "nochange",
                    "summary": "分类文本替换 - 『[[Category:" + from + "]]』→『[[Category:" + to + "]]』",
                    "token": data["query"]["tokens"]["csrftoken"]
                }).done(function (data) {
                    console.log(data);
                    if (data["edit"]["nochange"] !== undefined) {
                        printLog(`${data["edit"]["title"]} 修复失败，请手动检查。`, "error");
                    } else {
                        printLog(`${data["edit"]["title"]} 修复成功。`, "sucess");
                    }
                    missions--;
                });
            });
        });
    };
    let clearCategories = function ([title, pageid]) {
        missions++;
        return api.post({
            "action": "parse",
            "format": "json",
            "text": "<span id='zh-hant'>-{zh-hant;zh-tw;|" + title + "}-</span><span id='zh-hans'>-{zh-hans;zh-cn;|" + title + "}-</span>",
            "prop": "text",
            "preview": 1,
            "uselang": "zh"
        }).done(function (data) {
            let parseResult = jQuery(data["parse"]["text"]["*"]);
            let zhHant = parseResult.find("#zh-hant").text(), zhHans = parseResult.find("#zh-hans").text();
            let clearCategories = function (data) {
                if (!data || (data["continue"] && data["continue"]["cmcontinue"])) {
                    missions++;
                    return api.get({
                        "action": "query",
                        "format": "json",
                        "titles": "Category:" + title,
                        "redirects": 1,
                        "list": "categorymembers",
                        "cmcontinue": data && data["continue"]["cmcontinue"],
                        "cmpageid": pageid,
                        "cmlimit": "max"
                    }).done(function (data) {
                        editPageContent(data, zhHans, zhHant);
                        clearCategories(data);
                        missions--;
                    });
                }
            };
            clearCategories();
            missions--;
        });
    };
    let checkCategories = function (data) {
        missions++;
        let pageids = data["query"]["categorymembers"].map(x => x["pageid"]);
        return api.get({
            "action": "query",
            "format": "json",
            "prop": "categoryinfo",
            "pageids": pageids.join("|")
        }).done(function (data) {
            Object.values(data["query"]["pages"]).filter(x => x["categoryinfo"]["size"] > 0).map(x => [x["title"].replace(/^Category:/, ""), x["pageid"]]).forEach(clearCategories);
            missions--;
        });
    };
    let getCategories = function (data) {
        if (!data || (data["continue"] && data["continue"]["cmcontinue"])) {
            missions++;
            if (!interval) {
                interval = setInterval(function () {
                    if (missions == 0) {
                        localStorage.setItem("xzFixRedirectCategoryTime", +new Date());
                        printLog(`分类重定向已检查完毕。下次检查将于 ${new Date(+new Date() + xzFixRedirectCategoryInterval).toLocaleString()} 进行。`, null, "xz-fix-redirect-category-main");
                        clearInterval(interval);
                    } else {
                        printLog(`正在检查分类重定向……剩余 ${missions} 项查询。`, null, "xz-fix-redirect-category-main");
                    }
                }, 100);
            }
            return api.get({
                "action": "query",
                "format": "json",
                "list": "categorymembers",
                "cmcontinue": data && data["continue"]["cmcontinue"],
                "cmtitle": "Category:已重定向的分类",
                "cmlimit": "50"
            }).done(function (data) {
                checkCategories(data);
                getCategories(data);
                missions--;
            });
        }
    };
    jQuery("#localNotice").hide();
    printLog("正在检查分类重定向……", null, "xz-fix-redirect-category-main");
    getCategories();
}, 100);
