/* TODO:
    1.回退/撤销失败的页面给出控制台以外的提示
    2.为管理员回退提供markbot可选框，无需以flood用户组或URL带bot视为开关
    3.可能不需要连选功能，按住shift可自动连选，但移动设备无shift
    4.使用ooui
    5.增加功能，批量更改该用户编辑的版本可见性
*/
/* global $, mw */
function MassRollback() {
    $(".mw-contributions-list").prepend(`<div style=\"clear: both;\"><div style=\"float:right;\" class=\"mw-history-revision-actions\"> 		<button type=\"submit\" name=\"undo-batch\" value=\"1\" class=\"contributions-undo-button\">撤销选中版本</button> \
		<button type=\"submit\" name=\"rollback-batch\" value=\"1\" class=\"contributions-rollback-button patroller-show\">回退选中页面</button></div> \
		<button type=\"submit\" name=\"revdel-batch\" value=\"1\" class=\"contributions-revdel-button sysop-show\">删除选中版本</button></div> \
		<div class=\"mw-checkbox-toggle-controls\">选择：<a class=\"mw-checkbox-all\" role=\"button\" tabindex=\"0\">全选</a>、 \
		<a class=\"mw-checkbox-none\" role=\"button\" tabindex=\"0\">全不选</a>、 \
		<a class=\"mw-checkbox-invert\" role=\"button\" tabindex=\"0\">反选</a>、 \
		<a class=\"mw-checkbox-between\" role=\"button\" tabindex=\"0\">连选</a> \
		</div></div>`);

    var $checkboxes = $("li input[type=\"checkbox\"]");
    function selectAll(check) {
        $checkboxes.prop("checked", check);
    }
    $(".mw-checkbox-all").click(function() {
        selectAll(true);
    });
    $(".mw-checkbox-none").click(function() {
        selectAll(false);
    });
    $(".mw-checkbox-invert").click(function() {
        $checkboxes.prop("checked", function(i, val) {
            return !val;
        });
    });
    $(".mw-checkbox-between").click(function() {
        var last = $(".mw-contributions-list input[type=\"checkbox\"]:checked:last").parent()[0];
        $(".mw-contributions-list input[type=\"checkbox\"]:checked:first").parent().nextUntil(last).children("input[type=\"checkbox\"]").prop("checked", true);
    });

    const api = new mw.Api();
    $(".contributions-rollback-button").click(function() {
        const checked = $(".mw-contributions-list li :checkbox:checked");
        const reason = prompt("选中了 " + checked.length + " 个页面\n批量回退的编辑摘要【xxx //MassRollback】：");
        if (reason === null) return;
        console.log("开始回退...");
        const user = mw.config.get("wgRelevantUserName");
        checked.each(function() {
            var title = this.getAttribute("data-title");
            try {
                api.postWithToken("rollback", {
                    action: "rollback",
                    format: "json",
                    title: title,
                    user: user,
                    markbot: mw.config.get("wgUserGroups").includes("sysop") && (mw.config.get("wgUserGroups").includes("flood") || document.URL.includes("bot=1")) ,
                    watchlist: "nochange",
                    tags: "Automation tool",
                    summary: reason ? reason + " //MassRollback" : "//MassRollback"
                }).then(function (result) {
                    console.log("回退：" + title + "\n" + result);
                });
            } catch (e) {
                console.log("回退失败：" + e instanceof Error ? e.stack.split("\n")[1].trim() : JSON.stringify(e));
            }
        });
    });

    $(".contributions-undo-button").click(function() {
        const checked = $(".mw-contributions-list li :checkbox:checked");
        const reason = prompt("选中了 " + checked.length + " 个页面\n批量撤销的编辑摘要【xxx //MassUndo】：");
        if (reason === null) return;
        console.log("开始撤销...");
        checked.each(function() {
            var title = this.getAttribute("data-title");
            var revid = this.getAttribute("data-revid");
            try {
                api.postWithToken("csrf", {
                    action: "edit",
                    format: "json",
                    title: title,
                    undo: revid,
                    tags: "Automation tool",
                    bot: mw.config.get("wgUserGroups").includes("flood"),
                    watchlist: "nochange",
                    summary: reason ? reason + " //MassUndo" : "//MassUndo"
                }).then(function (result) {
                    console.log("撤销：" + title + "\n" + result);
                });
            } catch (e) {
                console.log("撤销失败：" + e instanceof Error ? e.stack.split("\n")[1].trim() : JSON.stringify(e));
            }
        });
    });
	
    $(".contributions-revdel-button").click(function() {
        const checked = $(".mw-contributions-list li :checkbox:checked");
        const reason = prompt("选中了 " + checked.length + " 个版本\n将删除版本内容和编辑摘要\n批量版本删除的原因【xxx //MassRevisionDelete】：");
        if (reason === null) return;
        console.log("开始版本删除...");
        checked.each(function() {
            var title = this.getAttribute("data-title");
            var revid = this.getAttribute("data-revid");
            try {
                api.postWithToken("csrf", {
                    action: "revisiondelete",
                    format: "json",
                    type: "revision",
                    target: title,
                    ids: revid,
                    tags: "Automation tool",
                    hide: "comment|content",
                    reason: reason ? reason + " //MassRevisionDelete" : "//MassRevisionDelete"
                }).then(function (result) {
                    console.log("版本删除：" + title + "\n" + result);
                });
            } catch (e) {
                console.log("版本删除失败：" + e instanceof Error ? e.stack.split("\n")[1].trim() : JSON.stringify(e));
            }
        });
    });
}
$( function() {
    if (mw.config.get("wgCanonicalSpecialPageName") !== "Contributions") { 
        return;
    }
    MassRollback();
});
