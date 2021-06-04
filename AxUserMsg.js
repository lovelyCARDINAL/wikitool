/**
 ** AxUserMsg.js - Ajax/API based adding comments and templates to User-Talk-Pages
 ** written in 2011 by [[User:Rillke]]; little parts are from [[MediaWiki:AjaxQuickDelete.js]] by DieBuche and from the old [[MediaWiki:Gadget-UserMessages.js]]
 ** bootstrap-code at [[MediaWiki:Gadget-UserMessages.js]] (which severed as idea for writing this script), help at [[Help:Gadget-UserMessages]]
 **
**/
//<nowiki>
// Invoke automated jsHint-validation on save: A feature on Wikimedia Commons.
// Interested? See [[c:MediaWiki:JSValidator.js]].
/* eslint indent:["error","tab",{"outerIIFEBody":0}] */

(function() {
'use strict';

if (window.AxUserMsg) return;

function ClsUPC($userInputField, $outputField, stCallBack, callingObject, CBValidChange) { // User Presence Check
	this.$userInputField = $userInputField;
	this.$outputField = $outputField;
	this.callingObject = callingObject;
	this.stCallBack = stCallBack;
	this.CBValidChange = CBValidChange;
	this.pendingCalls = 0;
	this.pendingSetTimeouts = 0;
	this.oldValue = '';
	this.userNameExists = 2;

	var o = this;

	$userInputField.on('keyup', function(/* e*/) {
		var tmpUNE = o.userNameExists;
		if ( o.isValidIP($(this).val()) ) {
			o.setToIP(tmpUNE);
		} else {
			o.execApiCall(false, $(this).val());
		}
	});
	$userInputField.on('input', function() {
		$userInputField.keyup();
	});
	$userInputField.on('selected', function() {
		$userInputField.keyup();
	});
}

ClsUPC.prototype.isValidIP = function (username) {
	if ( mw.util.isIPv4Address(username) ) return true; //IP v.4
	return mw.util.isIPv6Address(username);  //IP v.6
};

ClsUPC.prototype.setToIP = function (tmpUNE) {
	var o = this;
	o.userNameExists = -1;
	if ('function' === typeof(o.CBValidChange) && tmpUNE !== o.userNameExists ) {
		o.$outputField.attr('src', o.callingObject.umImgUserIsIP);
		o.$outputField.attr('alt', 'IP');
		o.oldValue = o.callingObject.umCleanFileAndUser(o.$userInputField.val());
		o.CBValidChange(o, o.callingObject);
	}
};

ClsUPC.prototype.execApiCall = function (isTimeout, val) {
	if (isTimeout) this.pendingSetTimeouts--;
	if (this.oldValue !== this.callingObject.umCleanFileAndUser(val)) {
		if (this.pendingCalls > 0) {
			if (!this.pendingSetTimeouts) {
				this.pendingSetTimeouts++;
				var o = this;
				setTimeout( function () {
					o.execApiCall(true, o.$userInputField.val());
				}, 1000); // do not use the old value, use the current instead
			}
			return;
		}
		var User = this.oldValue = this.callingObject.umCleanFileAndUser(val);
		var query = {
			action: 'query',
			list: 'allusers',
			aufrom: User,
			auto: User
		};
		this.callingObject.umCurrentUserQuery = this;
		this.pendingCalls++;
		this.callingObject.doAPICall(query, this.stCallBack);
	}
};

ClsUPC.prototype.evalAPICall = function(result) {
	this.pendingCalls--;
	var uifval = this.$userInputField.val();
	if (this.oldValue !== this.callingObject.umCleanFileAndUser(uifval)) {
		// Don't do anything if user updated the field in-between
		return;
	}
	if (this.isValidIP(uifval)) {
		return;
	}
	if ('object' === typeof(result.query) && 'object' === typeof(result.query.allusers)) {
		var tmpUNE = this.userNameExists;
		if (!result.query.allusers.length) {
			this.$outputField.attr('src', this.callingObject.umImgUserNotExists);
			this.$outputField.attr('alt', '!! invalid !!');
			this.userNameExists = false;
		} else {
			if (this.callingObject.umCleanFileAndUser(this.$userInputField.val()) === result.query.allusers[0].name) {
				this.$outputField.attr('src', this.callingObject.umImgUserExists);
				this.$outputField.attr('alt', 'OK');
				this.userNameExists = true;
			} else {
				if (!this.pendingSetTimeouts) { // Only overwrite if there is nothing pending
					this.$outputField.attr('src', this.callingObject.umImgUserUndefined);
					this.$outputField.attr('alt', '?');
					this.userNameExists = 2;
				}
			}
		}
		if ('function' === typeof(this.CBValidChange) && tmpUNE !== this.userNameExists) this.CBValidChange(this, this.callingObject);
	}
};


var umsg = window.AxUserMsg = {
	umInstall: function () {
		if (!$('#t-AjaxUserMessage').length) {
			var _this = this;
			var $LODLinkNode = $('#t-AjaxUserMessageLOD');
			var $Href = $LODLinkNode.length ? $LODLinkNode.eq(0) : $(mw.util.addPortletLink('p-tb', '#', "Notify this user", 't-AjaxUserMessage', 'Click here to launch user messages'));
			$Href.on('click', function(e) {
				e.preventDefault();
				_this.fireImmediately = false;
				_this.umNotifyUser();
			});
		}
		window.AxUserMsgPreSelect = (window.AxUserMsgPreSelect || this.umTemplate.length - 1); // default last msg
	},

	umInstallOldLinks: function () {
		// written for Herby, who needs this for working on Commons
		var _this = this;
		$.each(this.umTemplate, function(id, ti) {
			// Create portlet link
			var portletLink = mw.util.addPortletLink( 'p-tb', '#' + id, ti[1], 't-gadgetUserMessage' + id, ti[2]);
			// Bind click handler
			$(portletLink).on('click', function( e ) {
				e.preventDefault();
				window.AxUserMsgPreSelect = $(this).find('a').attr('href').split('#')[1];
				if (window.AxUserMsgFireAsYouClick) {
					var umType = _this.umTemplate[window.AxUserMsgPreSelect][3];
					if (!(umType & _this.umFlagUQ) && !(umType & _this.umFlagReq))
						_this.fireImmediately = true;
					else {
						_this.fireImmediately = false;
					}
				}
				_this.umNotifyUser();
			});
		});
	},

	umNotifyUser: function () {
		// mw.util.addCSS('a.new{color:#B00 !important;}'); ??
		this.umUser = '';
		this.editToken = '';
		this.umDlgPresent = false;
		this.umExecuting = false;
		this.umPendingParser = 0;
		this.umPendingParserTimeouts = 0;
		this.umParserTimerID = 0;
		this.umDelay = (window.AxUserMsgDelay || 100);
		this.umUserCache = {};
		this.umFileCache = {};
		this.umParserCache = {};
		this.focusOwner = '';
		this.umObtainEditToken();

		this.umUser = mw.libs.commons.guessUser();
		this.umDlg();
	},

	umFillSelect: function (caller, o) {
		var userstate = caller.userNameExists;
		$.each(o.umTemplate, function(id, currentTag) {
			if ( !$('#umOpt' + id, o.$tagSelect).length ) { // check wether to add
				if ( (-1 === userstate && !(currentTag[3] & o.umFlagUM)) || (true === userstate && !(currentTag[3] & o.umFlagIP)) ) {
					o.$tagSelect.append( '<option id="umOpt' + id + '" value="' + id + '">' + mw.html.escape(currentTag[1] + ' - ' + currentTag[2]) + '</option>' );
					return;
				}
			} else { // check wether to remove
				if ( (-1 === userstate && (currentTag[3] & o.umFlagUM)) || (true === userstate && (currentTag[3] & o.umFlagIP)) ) {
					$('#umOpt' + id, o.$tagSelect).remove();
					return;
				}
			}
		});
		if (-1 === userstate) { if (window.AxUserMsgPreSelectIP) { o.$tagSelect.val(window.AxUserMsgPreSelectIP); }
		} else { if (window.AxUserMsgPreSelect) { o.$tagSelect.val(window.AxUserMsgPreSelect); }
		}
		o.umValidateInput(o);
		o.$tagSelect.change();
	},

	umDlg: function () {
		var _this = this,
			$win = $(window),
			dlgButtons = {};
		dlgButtons[this.i18n.submitButtonLabel] = function () {
			try {
				if (_this.umIsValid) _this.umNotifyUserExecute();
			} catch (ex) {
				_this.fail(ex);
			}
		};
		dlgButtons[this.i18n.cancelButtonLabel] = function () {
			$(this).dialog("close");
		};
		this.dlg = $('<div>').html('<div id="AjaxUmContainer"></div>').dialog({
			modal: true,
			closeOnEscape: true,
			position: [Math.round(($win.width() - Math.min($win.width(), 850)) / 2),
						Math.round(($win.height() - Math.min($win.height(), 800)) / 2)],
			title: 'User Messages - ' +
				'<a href="//commons.wikimedia.org/wiki/MediaWiki_talk:Gadget-UserMessages.js" target="_blank">Report</a> bugs and ideas. ' +
				'<a href="//commons.wikimedia.org/wiki/Help:Gadget-UserMessages#Custom_settings" target="_blank">Learn how to customize this gadget</a>.',
			height: Math.min($win.height(), 800),
			width: Math.min($win.width(), 850),
			buttons: dlgButtons,
			close: function () {
				$(this).dialog("destroy");
				$(this).remove();
				_this.umDlgPresent = false;
			},
			open: function() {
				var $dlg = $(this),
					$buttons = $dlg.parent().find('.ui-dialog-buttonpane button'),
					$submitBtn = $buttons.eq(0).specialButton('proceed'),
					$cancelBtn = $buttons.eq(1).specialButton('cancel');

				$dlg.parents('.ui-dialog').css({position:'fixed', top:Math.round(($win.height() - Math.min($win.height(), 800)) / 2) + 'px'});
			}
		});
		this.umDlgPresent = true;

		if (this.dlg) {
			var $AjaxUmContainer = $('#AjaxUmContainer');

			$AjaxUmContainer.append('<label for="umUser">' + mw.html.escape(this.i18n.umFillInUser) + '</label><br><input type="text" id="umUser" style="width: 95%;" value="' + mw.html.escape(this.umUser) + '"/>' +
				this.umInitImgUserExists.replace('%ID%', 'umUserExists') + '<br><br>');

			this.$tagSelect = $('<select>', {
				size : '1',
				id   : 'umTagToInsert',
				style: 'width: 99%;'
			} );

			$AjaxUmContainer.append([
				'<label for="umTagToInsert">' + mw.html.escape(this.i18n.umSelectTag) + '</label><br>',
				this.$tagSelect, '<br><br>',
				'<span id="umMediaWrapper"><label for="umMedia">' + mw.html.escape(this.i18n.umFillInMedia) + '</label><br><input type="text" id="umMedia" style="width: 95%;" value="File:"/><br><br></span>',
				'<span id="umP2Wrapper"><label for="umP2">' + mw.html.escape(this.i18n.umFillInAdditional) + '</label><br><input type="text" id="umP2" style="width: 95%;"/><br><br></span>',
				'<span id="umP3Wrapper"><label for="umP3">' + mw.html.escape(this.i18n.umFillInAdditional) + '</label><br><input type="text" id="umP3" style="width: 95%;"/><br><br></span>',
				'<span id="umRelatedUserWrapper"><label for="umRelatedUser">' + mw.html.escape(this.i18n.umFillInRelUser) + '</label><br><input type="text" id="umRelatedUser" style="width: 95%;" value="User:"/>' + this.umInitImgUserExists.replace('%ID%', 'umRelatedUserExists') + '<br><br></span>',
				'<span id="umSummaryWrapper"><label for="umSummary">' + mw.html.escape(this.i18n.umFillInSummary) + '</label><br><input type="text" id="umSummary" style="width: 95%;" value="Summary"/><br><br></span>',
				'<label for="umAddText">' + mw.html.escape(this.i18n.umAddText) + '</label><br><textarea id="umAddText" style="width: 95%; height: 5em;">' + (mw.html.escape(window.AxUserMsgCustomText || '')) + '</textarea><br><br>'
			]);

			this.talkTag = '';
			var	$umMedia       = $('#umMedia'),
				$umP2          = $('#umP2'),
				$umP3          = $('#umP3'),
				$umUser        = $('#umUser'),
				$umRelatedUser = $('#umRelatedUser'),
				$umSummary     = $('#umSummary'),
				$umAddText     = $('#umAddText');

			this.uUPC = new ClsUPC($umUser, $('#umUserExists'), 'umUserExistsCB', this, this.umFillSelect);
			this.ouUPC = new ClsUPC($umRelatedUser, $('#umRelatedUserExists'), 'umUserExistsCB', this, this.umUserValidChange);

			var submitButton = $('.ui-dialog-buttonpane button:first');
			this.$tagSelect.on('keyup', function(event) {
				if (13 === event.which) submitButton.click();
			});

			// guessing the related file thanks User:Platonides
			var guessFile = function() {
				var f = mw.util.getParamValue('title', document.referrer);
				if (f && /File:/.test(f)) return f;
				f = mw.util.getParamValue('page', document.referrer);
				if (f && /File:/.test(f)) return f;
				f = mw.util.getParamValue('target', document.referrer);
				if (f && /File:/.test(f)) return f;
				var m = document.referrer.match(/File:(.+)/);
				try {
					if (m) { if (/&.+=/.test(m[1])) return('File:' + decodeURI(m[1]).match(/^(.+)&/)[1]); else return('File:' + m[1]); }
				} catch (ex) {}
			};
			var umFile = guessFile();
			if (umFile) $umMedia.val(decodeURIComponent(umFile).replace(/_/g, ' '));

			$umUser.on('keyup', function(event) {
				$(this).val( $(this).val().replace(/<|>|\^/g, '') );
				if (event) if (event.which) if (13 === event.which) submitButton.click();
			});
			$umUser.autocomplete({
				minLength: 1,
				source: function ( request, callback ) { _this.umSeekUsers( request, callback ); },
				close: function( e, ui ) { $umUser.triggerHandler('selected'); }
			});
			$umMedia.on('change', function() {
				_this.umValidateInput(_this);
			});
			$umMedia.on('input', function() {
				$(this).val( $(this).val().replace(/<|>|\^/g, '') );
				_this.umValidateInput(_this);
			});
			$umMedia.on('keyup', function(e) {
				$(this).val( $(this).val().replace(/<|>|\^/g, '') );
				if (13 === e.which) submitButton.click();
			});
			$umMedia.autocomplete({
				minLength: 1,
				source: function ( request, callback ) { _this.umSeekFiles( request, callback ); },
				close: function( e, ui ) { $umMedia.triggerHandler('input'); }
			});
			$umRelatedUser.on('keyup', function(event) {
				$(this).val( $(this).val().replace(/<|>|\^/g, '') );
				if (event) if (event.which) if (13 === event.which) submitButton.click();
				_this.umValidateInput(_this);
			});
			$umRelatedUser.autocomplete({
				minLength: 1,
				source: function ( request, callback ) { _this.umSeekUsers( request, callback ); },
				close: function( e, ui ) { $umRelatedUser.triggerHandler('selected'); }
			});
			$umP2.on('change', function() {
				_this.umValidateInput(_this);
			});
			$umP2.on('input', function() {
				_this.umValidateInput(_this);
			});
			$umP2.on('keyup', function(event) {
				if (13 === event.which) submitButton.click();
			});
			$umP3.on('change', function() {
				_this.umValidateInput(_this);
			});
			$umP3.on('input', function() {
				_this.umValidateInput(_this);
			});
			$umP3.on('keyup', function(event) {
				if (13 === event.which) submitButton.click();
			});
			$umAddText.on('change', function() {
				_this.umValidateInput(_this);
			});
			$umAddText.on('input', function() {
				_this.umValidateInput(_this);
			});
			$umSummary.on('keyup', function(event) {
				if (13 === event.which) submitButton.click();
			});

			submitButton.focus();

			$AjaxUmContainer.append(this.umInstPrevContainer.clone().text('Instant-preview container is empty.'));
			this.$tagSelect.on('change', function(/* e*/) {
				var umType = _this.umTemplate[$(this).val()][3];

				$umSummary.val(_this.umTemplate[$('#umTagToInsert').val()][4] ? _this.umTemplate[$('#umTagToInsert').val()][4] : (_this.umTemplate[$('#umTagToInsert').val()][2] + '.'));
				_this.umValidateInput(_this);
				_this.$tagSelect.combobox({'displaytext': _this.$tagSelect.val() ? _this.$tagSelect.children( ":selected" ).text() : ""});

				if (umType & _this.umFlagP2) {
					$('#umP2Wrapper').show();
					if (document.activeElement && $umUser.attr('id') !== document.activeElement.id) $('#umP2').select();
				} else {
					$('#umP2Wrapper').hide();
				}
				if (umType & _this.umFlagP3) {
					$('#umP3Wrapper').show();
					if (document.activeElement && $umUser.attr('id') !== document.activeElement.id) $('#umP3').select();
				} else {
					$('#umP3Wrapper').hide();
				}
				if (umType & _this.umFlagMQ) {
					$('#umMediaWrapper').show();
					if (document.activeElement && $umUser.attr('id') !== document.activeElement.id) $('#umMedia').select();
				} else {
					$('#umMediaWrapper').hide();
				}
				if (umType & _this.umFlagUQ) {
					$('#umRelatedUserWrapper').show();
					if (document.activeElement && $umUser.attr('id') !== document.activeElement.id) $('#umMedia').select();
				} else {
					$('#umRelatedUserWrapper').hide();
				}
			});
			if (window.AxUserMsgPreSelect) this.$tagSelect.val(window.AxUserMsgPreSelect);
			$('#umUser').keyup();
			$('#umTagToInsert').combobox();
		}
	},

	umSeekUsers: function ( request, pCallback ) {
		var query = {
			action: 'query',
			list: 'allusers',
			auprefix: request.term.replace(/^(?:User):/, "")
		};
		this.doGetApiCall(query, 'umSeekUsersCB', pCallback);
	},

	umSeekUsersCB: function ( result, pCallback ) {
		var searchTerms = [];
		$.each(result, function(id, usi) {
			searchTerms.push( { 'id': usi.userid, 'value': usi.name } );
		});
		if ('function' === typeof pCallback) pCallback(searchTerms);
	},

	umSeekFiles: function ( request, pCallback ) {
		var query = {
			action: 'query',
			list: 'allimages',
			aiprefix: request.term.replace(/^(?:File|Image):/, "")
		};
		this.doGetApiCall(query, 'umSeekFilesCB', pCallback);
	},

	umSeekFilesCB: function ( result, pCallback ) {
		var searchTerms = [];
		$.each(result, function(id, fii) {
			searchTerms.push( { 'id': fii.timestamp, 'value': 'File:' + fii.name } );
		});
		if ('function' === typeof pCallback) pCallback(searchTerms);
	},

	umUserExistsCB: function (result) {
		this.umCurrentUserQuery.evalAPICall(result);
	},

	umShowInfo: function(info, o) {
		$('#umInstantPreviewContainer').empty().html('<p class="center"><img src="' + o.umImgInfo + '" width="64" height="64"/><br>' +
		info + '</p>');
	},

	umValidateInput: function (o) {
		this.umIsValid = true;
		var umType = this.umTemplate[$('#umTagToInsert').val()][3];
		var submitButton = $('.ui-dialog-buttonpane button:first');
		var validRelatedUser = function() {
			if (umType & o.umFlagUQ) {
				if (o.umCleanFileAndUser($('#umRelatedUser').val()).length < 1 ) {
					o.umShowInfo('No related user specified.', o);
					return false;
				}
				if ( !o.ouUPC.userNameExists ) {
					o.umShowInfo('Related user does not exist.', o);
					return false;
				}
			}
			return true; };

		var validMedia = function() {
			if (umType & o.umFlagMQ) {
				if ( (o.umCleanFileAndUser($('#umMedia').val()).length < 5 ) && (umType & o.umFlagReq) ) {
					o.umShowInfo('No file specified. This is mandatory in this case.', o);
					return false;
				}
			}
			return true; };

		var validUser = function() {
			if ( o.umCleanFileAndUser($('#umUser').val()).length < 1 ) {
				o.umShowInfo('No user specified.', o);
				return false;
			}
			if ( !o.uUPC.userNameExists ) {
				o.umShowInfo('User does not exist.', o);
				return false;
			}
			return true; };

		this.umIsValid = this.umIsValid && validRelatedUser() && validMedia() && validUser();

		if (this.umIsValid) {
			submitButton.removeClass('ui-state-disabled');
			if (umType & this.umFlagMQ) {
				this.talkTag = '\n{{subst:' + this.umTemplate[$('#umTagToInsert').val()][0] +
					(this.umCleanFileAndUser($('#umMedia').val()) ? ('|1=' + ((umType & this.umFlagNS) ? ('File:' + this.umCleanFileAndUser($('#umMedia').val())) : $('#umMedia').val())) : '' );
			} else if (umType & this.umFlagUQ) {
				this.talkTag = '\n{{subst:' + this.umTemplate[$('#umTagToInsert').val()][0] + '|1=' + this.umCleanFileAndUser($('#umRelatedUser').val());
			}
			else {
				this.talkTag = '\n{{subst:' + this.umTemplate[$('#umTagToInsert').val()][0];
			}
			var paramCount = ((umType & this.umFlagUQ) ? 1 : 0) + ((umType & this.umFlagMQ) ? 1 : 0),
				// cut of extra white space
				sigText = mw.user.options.get('fancysig') ? $.trim(mw.user.options.get('nickname')) + ' ~~~~~' : '--~~~~';

			if (umType & this.umFlagP2) {
				paramCount++;
				this.talkTag += '|' + paramCount + '=' + $('#umP2').val();
			}
			if (umType & this.umFlagP3) {
				paramCount++;
				this.talkTag += '|' + paramCount + '=' + $('#umP3').val();
			}
			this.talkTag += '}}';
			if ('\n{{subst:}}' === this.talkTag) this.talkTag = '\n';

			this.talkTag += '\n' + $('#umAddText').val().replace(/~{3,5}$/, '') + sigText + '\n';
			this.umParseTemplate(false);
			// If the user wants the old behaviour back, we fire immediately
			if (this.fireImmediately) this.umNotifyUserExecute();
		} else {
			submitButton.addClass('ui-state-disabled');
		}
	},

	umUserValidChange: function (caller, o) {
		o.umValidateInput(o);
	},

	umCleanFileAndUser: function (input) {
		var output = '';
		if (input) {
			output = input.replace(/\_/g, " ").replace(/File\:/g, "").replace(/Image\:/g, "").replace(/User\:/g, "").replace(/^\s+|\s+$/g, '');
			output = output.substring(0, 1).toUpperCase() + output.substring(1);
		}
		return output;
	},

	umParseTemplate: function (viaSetTimeout) {
		if (window.AxUserMsgNoParse) return;
		var _this = this;

		if (viaSetTimeout) _this.umPendingParserTimeouts--;

		if (_this.umPendingParser > 0) {
			if (!_this.umPendingParserTimeouts) {
				// call me later
				var o = _this;
				_this.umPendingParserTimeouts++;
				setTimeout( function () {
					o.umParseTemplate(true);
				}, 300);
			}
			return;
		}

		function maybeParse() {
			_this.umPendingParser++;
			var action = {
				action: 'parse',
				uselang: mw.config.get('wgUserLanguage'),
				redirects: true,
				prop: 'text',
				pst: true,
				title: _this.umUserTalkPrefix + $('#umUser').val(),
				text: _this.talkTag
			};
			_this.umDelay = Math.min((_this.umDelay + 30), 1500); // Save server resources.
			_this.doAPICall(action, 'umParsedTemplate');
		}

		if (_this.umParserTimerID) {
			clearTimeout(_this.umParserTimerID);
		}
		_this.umParserTimerID = setTimeout( maybeParse, _this.umDelay );
	},

	umParsedTemplate: function(result) {
		this.umPendingParser--;
		if ( 'object' === typeof(result.parse) && ('object' === typeof(result.parse.text)) && this.umDlgPresent && (!this.umExecuting) && this.umIsValid )  {
			var $containerText = result.parse.text['*'].replace(' API', ' ' + this.umCleanFileAndUser($('#umUser').val())).replace('>API', '>' + this.umCleanFileAndUser($('#umUser').val()));
			$containerText = $($containerText);
			$('.editsection', $containerText).remove();
			$('a', $containerText).attr('target', '_blank');
			$('#umInstantPreviewContainer').empty().append($containerText).resizable({ alsoResize: '#AjaxUmContainer' });
		}
	},

	umObtainEditToken: function () {
		if (mw.user && mw.user.tokens) this.editToken = mw.user.tokens.get( 'csrfToken' );
		this.editToken = (this.editToken || (mw.user.isAnon() ? '+\\' : '') );
		if (this.editToken) return;

		var query = {
			action: 'query',
			prop: 'info',
			intoken: 'edit',
			titles: 'FAQ'  // Random title
		};
		this.doAPICall(query, 'umObtainEditTokenCB');
	},

	umObtainEditTokenCB: function (result) {
		var pages = result.query.pages;
		for (var id in pages) { // there should be only one, but we don't know its ID
			if (pages.hasOwnProperty(id)) {
				this.editToken = pages[id].edittoken;
			}
		}
	},

	umNotifyUserExecute: function () {
		if (this.umExecuting) return;
		this.pageName = this.umUserTalkPrefix + $('#umUser').val();
		this.talkSummary = $('#umSummary').val();
		this.appendTemplate();
	},

	appendTemplate: function () {
		var page = [];
		page.title = this.pageName;
		page.text = this.talkTag;
		page.editType = 'appendtext';
		page.redirect = true;
		if (window.AjaxDeleteWatchFile) page.watchlist = 'watch';

		this.umExecuting = true;
		$('#umInstantPreviewContainer').empty().html('<p class="center"><img src="//upload.wikimedia.org/wikipedia/commons/c/ce/RE_Ajax-Loader.gif"/></p>');
		this.savePage(page, this.talkSummary, 'umNotifyUserExecuteCB');
	},

	savePage: function (page, summary, callback) {
		var edit = {
			action: 'edit',
			summary: summary,
			watchlist: (page.watchlist || 'preferences'),
			title: page.title
		};
		if (page.redirect) edit.redirect = '';
		edit[page.editType] = page.text;
		edit.token = this.editToken;
		this.doAPICall(edit, callback);
	},

	umNotifyUserExecuteCB: function (/* result*/) {
		var encTitle = this.umUserTalkPrefix + $('#umUser').val();
		encTitle = encodeURIComponent(encTitle.replace(/ /g, '_')).replace(/%2F/ig, '/').replace(/%3A/ig, ':');
		var newLoc = mw.config.get('wgServer') + mw.config.get('wgArticlePath').replace("$1", encTitle);
		if (window.location.pathname === mw.config.get('wgArticlePath').replace("$1", encTitle)) {
			window.location.hash = '#footer';
			window.location.reload();
		} else {
			window.location.href = newLoc + '#footer';
		}


		this.umExecuting = false;
	},

	doGetApiCall: function (params, callback, pCallback) {
		var o = this;

		// Local Cache
		if (params.list) {
			if ("allusers" === params.list) {
				if (params.auprefix in o.umUserCache) {
					o[callback](o.umUserCache[params.auprefix], pCallback);
					return;
				}
			} else if ("allimages" === params.list) {
				if (params.aiprefix in o.umFileCache) {
					o[callback](o.umFileCache[params.aiprefix], pCallback);
					return;
				}
			}
		}

		params.format = 'json';
		$.ajax({
			url: this.apiURL,
			cache: true,
			dataType: 'json',
			data: params,
			type: 'GET',
			async: true,
			success: function (result, status, x) {
				if (!result) { if ('function' === typeof pCallback) pCallback(); return; }
				try {
					if (params.list) if ("allusers" === params.list) {
						// cache the result
						o.umUserCache[ params.auprefix ] = result.query.allusers;
						o[callback](result.query.allusers, pCallback);
						return;
					}
					if (params.list) if ("allimages" === params.list) {
						// cache the result
						o.umFileCache[ params.aiprefix ] = result.query.allimages;
						o[callback](result.query.allimages, pCallback);
						return;
					}
					// This is a "must", the doc sais
					if ('function' === typeof pCallback) pCallback();
					o[callback](result);
				} catch (e) {
					return o.fail(e);
				}
			},
			error: function () {
				// This is a "must", the doc sais
				if ('function' === typeof pCallback) pCallback();
			}
		});
	},

	doAPICall: function (params, callback) {
		var o = this;

		if (params.action) if ("parse" === params.action) {
			if (params.text in o.umParserCache) {
				o[callback](o.umParserCache[params.text]);
				return;
			}
		}

		params.format = 'json';
		$.ajax({
			url: this.apiURL,
			cache: false,
			dataType: 'json',
			data: params,
			type: 'POST',
			success: function (result, status, x) {
				if (!result) return o.fail("Receive empty API response:\n" + x.responseText);

				// In case we get the mysterious 231 unknown error, just try again
				if (result.error && result.error.info.indexOf('231') !== -1) return setTimeout(function () {
					o.doAPICall(params, callback);
				}, 500);
				if (result.error) return o.fail("API request failed (" + result.error.code + "): " + result.error.info);
				if (result.edit && result.edit.spamblacklist) {
					return o.fail("The edit failed because " + result.edit.spamblacklist + " is on the Spam Blacklist");
				}
				if (params.action) if ("parse" === params.action) {
					o.umParserCache[params.text] = result;
				}
				try {
					o[callback](result);
				} catch (e) {
					return o.fail(e);
				}
			},
			error: function (x, status, error) {
				return o.fail("API request returned code " + x.status + " " + status + "Error code is " + error);
			}
		});
	},

	fail: function (err) {
		if ('object' === typeof err) {
			var stErr = mw.html.escape(err.message) + '<br>' + err.name;
			if (err.lineNumber) stErr += ' @line' + err.lineNumber;
			if (err.line) stErr += ' @line' + err.line;
			err = stErr;
		} else {
			err = mw.html.escape(err.toString());
		}
		if (this.umDlgPresent) {
			$('#umInstantPreviewContainer').empty().html('<p class="center"><img src="' + this.umImgErr + '" width="64" height="64"/></p><br>' +
			"During the execution of AxUserMsg, the following error occured:<br>" + mw.html.escape(err));
		} else {
			mw.notify("During the execution of AxUserMsg, the following error occured: " + err);
		}

	},

	i18n: {
		umFillInUser: "Please fill in the user to notify:",
		umSelectTag: "Select the template to be added to the user's page. Insert text into the box to filter:",
		umFillInMedia: "Please specify the Media-file this message is about (namespace will be auto-detected):",
		umFillInAdditional: "The template has an additional parameter. You can fill it in here.",
		umFillInRelUser: "Who is the user related to this message?",
		umFillInSummary: "Edit summary",
		umAddText: "Fill in additional text to place on the user's discussion page, please:",
		submitButtonLabel: "Add template",
		cancelButtonLabel: "Cancel"
	},

	umInstPrevContainer: $('<div>', { id: 'umInstantPreviewContainer', style: 'background-color:#EFD;height:380px;overflow:scroll;vertical-align:middle;' }),
	umInitImgUserExists: '<img id="%ID%" src="//upload.wikimedia.org/wikipedia/commons/thumb/4/42/P_no.svg/20px-P_no.svg.png" alt="?"/>',
	umImgUserUndefined: '//upload.wikimedia.org/wikipedia/commons/thumb/4/42/P_no.svg/20px-P_no.svg.png',
	umImgUserNotExists: '//upload.wikimedia.org/wikipedia/commons/thumb/4/42/P_no_red.svg/20px-P_no_red.svg.png',
	umImgUserExists: '//upload.wikimedia.org/wikipedia/commons/thumb/b/be/P_yes.svg/20px-P_yes.svg.png',
	umImgUserIsIP: '//upload.wikimedia.org/wikipedia/commons/thumb/6/6e/IP.svg/20px-IP.svg.png',
	umImgErr: '//upload.wikimedia.org/wikipedia/commons/c/ca/Crystal_error.png',
	umImgWarn: '//upload.wikimedia.org/wikipedia/commons/a/af/Crystal_Clear_app_error-info.png',
	umImgInfo: '//upload.wikimedia.org/wikipedia/commons/0/09/Crystal_Clear_action_info.png',

	umFlagMQ: 1,   // Media Query
	umFlagUQ: 2,   // Username Query
	umFlagReq: 4,  // Required - must filled in
	umFlagNS: 8,   // Add Namespace
	umFlagP2: 16,  // add a universal parameter
	umFlagP3: 32,  // add a universal parameter
	umFlagIP: 64,  // Message for IP only
	umFlagUM: 128, // User message only
	umFlagReqMqNs: 13, // Combination of (umFlagReq | umFlagMQ | umFlagNS)

	umUserTalkPrefix: mw.config.get('wgFormattedNamespaces')[3] + ":",
	apiURL: mw.util.wikiScript('api')
};

umsg.umTemplate = [
/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * Append new messages at the bottom. Otherwise pre-selection for users will break.
 !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/
//  ['Template name',             "Name in Sidebar", "Detailed text",                                                                          Type/Prompt statement,           'Talk summary'];
	['Please link images',        "Please link",     "Request user to please link their images through categories or galleries",                 umsg.umFlagUM, "Please link images."],
	['Copyvionote',               "Copyvionote",     "Inform user about speedy deletion of uploaded media",                                    umsg.umFlagUM + umsg.umFlagReqMqNs, 'Please upload [[Commons:Copyright|free content]] only.'],
	['Derivativenote',            "Derivativenote",  "Inform user about speedy deletion of uploaded derivative media",                         umsg.umFlagUM + umsg.umFlagReqMqNs, 'Even [[COM:DW|derivative works]] of copyrighted material is protected.'],
	['No fair use',               "No fair use",     "Inform user that Commons does not accept fair use",                                      umsg.umFlagUM + umsg.umFlagReqMqNs, 'On Commons, we do not accept [[COM:FU|fair-use-media]]. Please stop uploading those.'],
	['Please name images',        "Please name",     "Request user to please name their images correctly",                                       umsg.umFlagUM + umsg.umFlagReqMqNs, 'Please [[Commons:File naming|name images]] correctly.'],
	['Please tag images',         "Please tag",      "Request user to please tag their images",                                                  umsg.umFlagUM, "The description of one of your uploads is lacking in information about reusing. Please check the whole description-page."],
	['Please describe images',    "Please describe", "Request user to please describe their images",                                             umsg.umFlagUM + umsg.umFlagReqMqNs, 'What is it? Could you please describe it in more detail?'],
	['Project scope',             "Project scope",   "Inform user on project scope after deleting out of scope contributions",                 umsg.umFlagMQ, "Please do not create [[COM:PS|out of scope media and pages.]]"],
	['No comments',               "Use talk pages",  "Inform user to use talk pages",                                                          0, "Please put comments to [[COM:TALK|the appropriate place]]."],
	['Welcome',                   "Welcome",         "Welcome a new user or a user who has not yet received a welcome message",                0, "Hello, [[Commons:Welcome|Welcome to Wikimedia Commons! -A database of freely usable media files]]."],
	['End of copyvios',           "End copyvio",     "Give user a final warning because of previous copyright violations",                     umsg.umFlagUM, "Immediately stop uploading copyright violations, please."],
	['Fcs',                       "Stop copyvio",    "Give user a polite warning because of copyright violations",                             umsg.umFlagUM, "Stop uploading copyright violations, please."],
	['Off topic',                 "Off topic",       "Please stay on topic in Commons",                                                        0, "Commons is not Wikipedia. Wikipedia is for articles; Commons for media."],
	['No re-uploading',           "No re-uploading", "Please do not re-upload",                                                                umsg.umFlagUM],
	['Test',                      "Test/Sandbox",    "Referral to sandbox for conducting experiments",                                         umsg.umFlagP2 + umsg.umFlagP3, "We have a [[COM:SAND|sandbox]] for test edits; or use the preview function if you want to test."],
	['Test2',                     "Vandalism",       "Warning or vandalism and request to cease",                                              umsg.umFlagP2 + umsg.umFlagP3, "Please do not contribute nonsense-edits."],
	['Test3',                     "Vandalism 2",     "Second warning for vandalism and announcement of block if it continues",                 umsg.umFlagP2 + umsg.umFlagP3, "Please stop making nonsense-edits."],
	['Test4',                     "Vandalism 3",     "Last warning for vandalism and announcement of block on next violation",                 0, "Last warning: Stop producing nonsense!"],
	['Inappropriate imagenotes',  "Imagenotes",      "Tell user not to add inappropriate imagenotes",                                          umsg.umFlagUM, "We have a [[COM:ANN|guideline for imagenotes]]."],
	['Dont remove delete',        "Rem.Delete",      "Please do not remove deletion-templates from pages nominated for deletion",              0],
	['Dont remove nsd or nld',    "Rem.n(slp)d",     "Please do not remove valid warning tags from file-description pages",                    0],
	['Dont remove speedy',        "Rem.speedy",      "Please do not remove speedy-deletion tags",                                              0],
	['Dont remove warnings',      "Rem.warning",     "Please do not remove valid warning templates from your talk page, except while archiving", 0],
	['Be civil',                  "Be civil",        "Please remain civil, even if your contributions are being attacked",                     0],
	['Be civil final',            "Be civil final",  "Remain civil! You will become blocked next time",                                        0],
	['Blocked user with header',  "Blocked user with header", 		 "Your account has been blocked",                                                		   umsg.umFlagP2 + umsg.umFlagP3],
	['Inappropriate username',    "Inapp.username",  "Your username is considered being inappropriate and therefore your account has been blocked", umsg.umFlagUM],
	['Copyviouploadindefblock',   "Blocked indefinite (copyvio)", "User blocked because they did not stop uploading copyvios after warnings",    umsg.umFlagUM, "You did not stop uploading copyright violations and therefore we had to block you."],
	['Indefblockeduser',          "Blocked indef",   "Your account has been blocked indefinitely",                                             umsg.umFlagP2],
	['Imposter',                  "Imposter",        "Mark account as blocked for impersonation or attack",                                    umsg.umFlagUQ],
	['Please register',           "Please register", "Please create an account. Your contributions are numerous and quite good",               umsg.umFlagIP],
	['Provide better quality',    "Better quality",  "Do you have a better version of this media?",                                            umsg.umFlagUM + umsg.umFlagReqMqNs],
	['Please use SVG',            "Use SVG, please", "SVG (Scalable Vector Graphics) have a few advantages, I'll tell you some of them",       umsg.umFlagUM],
	['No scaled down dupes',      "Scaled down",     "Please do not upload scaled down duplicates. MediaWiki can change the size for you",     umsg.umFlagUM + umsg.umFlagMQ + umsg.umFlagNS],
	['Unfree',                    "Unfree",          "Image deletion notification",                                                            umsg.umFlagUM + umsg.umFlagMQ + umsg.umFlagNS],
	['Attackimage',               "Attackimage",     "Please do not upload attack images",                                                     umsg.umFlagUM + umsg.umFlagReqMqNs],
	['Attackpage',                "Attackpage",      "Please do not create attack pages",                                                      umsg.umFlagP2 + umsg.umFlagReq],
	['Dont overwrite',            "Dont overwrite",  "Please do not overwrite images",                                                         umsg.umFlagUM + umsg.umFlagMQ + umsg.umFlagNS],
	['Dont recreate',             "Dont recreate",   "Please do not recreate deleted images",                                                  umsg.umFlagUM + umsg.umFlagReqMqNs],
	['Speedywhat',                "Speedy warn",     "One of your uploads has been speedy-deleted",                                            umsg.umFlagUM + umsg.umFlagReqMqNs],
	['No advertising',            "Dont advertise",  "Please do not advertise on Commons. We have the goal of an educational image collection",   0],
	['Sign',                      "Sign your postings",  "Please sign your postings with four tildes (~~~~) at the end of your comments",      0],
	['Blocked',                   "Blocked",         "Your account has been blocked",                                                          umsg.umFlagP2 + umsg.umFlagP3],
	['Anonblock',                 "Anon edit blocked", "Anonymous editing is not allowed from your IP address. Create an account to contribute", umsg.umFlagIP],
	['Blocked proxy subst',       "Blocked proxy",   "This IP address has been blocked because it is believed to be an open proxy or zombie computer", umsg.umFlagP2 + umsg.umFlagIP],
	['IPsock',                    "IP Sock",         "An editor has expressed concern that this IP address has been used by a registered user", umsg.umFlagUQ + umsg.umFlagIP],
	['Geocoding',                 "Geocoding",       "Geo-Coding: Maybe you could consider adding coordinates to some of your images",         umsg.umFlagUM],
	['Sourcefield',               "Sourcefield",     "Please properly use the source field",                                                   umsg.umFlagUM + umsg.umFlagReqMqNs + umsg.umFlagP2],
	['Dateformat',                "Dateformat",      "Please use the correct date format",                                                     umsg.umFlagUM + umsg.umFlagReqMqNs + umsg.umFlagP2],
	['Do not upload thumbnails',  "No thumbs",       "Please always upload the biggest resolution image, you can obtain. Thanks",              umsg.umFlagUM + umsg.umFlagReqMqNs],
	['Flickrvionote',             "Flickrvionote",   "Please do not upload questionable Flickr-Files to Commons",                              umsg.umFlagUM + umsg.umFlagReqMqNs],
	['Speedynote',                "Speedynote",      "Some of your contributed contents will be possibly speedy-deleted",                      umsg.umFlagReqMqNs + umsg.umFlagP2],
	['Talkback',                  "Talkback",        "Talkback would be appreciated",                                                          umsg.umFlagUQ + umsg.umFlagP2],
	['You\'ve got mail',          "E-Mailed",        "I sent an e-Mail to you using the e-Mail-this-user feature",                             umsg.umFlagUM],
	['Commons is not for articles',"About articles", "Wikimedia Commons is for media files. Wikipedia is for articles",                        umsg.umFlagUM],
	['Nopenis',                   "Nude photos",     "Please consider reading [[COM:Project scope]] and [[COM:Nudity]]",                       umsg.umFlagUM + umsg.umFlagReqMqNs],
	['Please use TeX',            "Use TeX, please", "TeX markup have a few advantages, I'll tell you some of them",                           umsg.umFlagUM],
	['Wrong license note',        "Wrong license",   "Please be careful to select the correct license",                                        umsg.umFlagUM + umsg.umFlagReqMqNs, 'Please pay attention to copyright'],
	['How to transfer',           "Please use CommonsHelper", "You've made an error when transferring. Please consider using CommonsHelper",   umsg.umFlagUM + umsg.umFlagReqMqNs, 'Asking user to consider using CommonsHelper'],
	['Unfreeflickrnote',          'Unfree flickr note', "Please do not upload unfree files from Flickr",                                       umsg.umFlagUM + umsg.umFlagReqMqNs],
	['Dont upload Wikipedia thumbnails', "No Wikipedia thumbs", "Please always upload the biggest resolution image, you can obtain (Wikipedia specific). Thanks",   umsg.umFlagUM + umsg.umFlagReqMqNs, "Please always upload the biggest resolution image, you can obtain. Thanks"],
	['No selfies',                'No selfies',      "Inform the user that pictures of self and family/friends are out of often scope",        umsg.umFlagUM, "Please do not create [[COM:PS|out of scope media and pages.]]"],
        ['Dont editwar',              "Don't edit war",  "Ask the user to refrain from edit warring",                                              0],
	['',                          "Select a message! Empty option.", "A new message for you!",                                                 0]
];

/**
 * A custom widget built by composition of Autocomplete and Button.
 * You can either type something into the field to get filtered suggestions based on your input,
 * or use the button to get the full list of selections.
 *
 * The input is read from an existing select-element for progressive enhancement,
 * passed to Autocomplete with a customized source-option.
 *
 * Autor: someone from the jQuery UI-Team?
 * slightly altered
**/
var initCombobox = function( $ ) {
$.widget( 'ui.combobox', {
	// These options will be used as defaults
	options: {
		displaytext: '',
		emptyMessage: 42,
		passEnter: true,
		shutOff: window.AxUserMsgUseSelect
	},

    // Use the _setOption method to respond to changes to options
	_setOption: function(key, value) {
		if (this.options.shutOff) return;
		switch( key ) {
			case 'displaytext':
			this.input.val(value);
			break;
			case 'passEnter':
			this.options.passEnter = value;
			break;
		}

		// In jQuery UI 1.8, you have to manually invoke the _setOption method from the base widget
		$.Widget.prototype._setOption.apply( this, arguments );
	},

	_create: function() {
		if (this.options.shutOff) return;
		var self = this,
			select = this.element.hide(),
			selectWidth = select.width(),
			selectId = select.attr('id'),
			selectLabels,
			selected = select.children( ":selected" ),
			value = selected.val() ? selected.text() : "",
			ownId = 'j' + Math.floor(Math.random() * 10000000000),
			isOpen = false,
			valid = true;
		if (selectId) {
			selectLabels = $('label[for="' + selectId + '"]');
		}
		var portMessure = this.portMessure = $('<div>', { id: ownId + 'vp' }).css({ position: 'fixed', top: '0', height: '0' });
		$('body').append(portMessure);
		var input = this.input = $( "<input>", { id: ownId } )
			.insertAfter( select )
			.val( value )
			.autocomplete({
				delay: 0,
				minLength: 0,
				source: function( request, response ) {
					var i = 0,
						matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );

					response( select.children( "option" ).map(function() {
						if ( (i > (window.AxUserMsgMaxSelect || 20)) && request.term ) return;
						var text = $( this ).text();
						if ( this.value && ( !request.term || matcher.test(text) ) ) {
							i++;
							return {
								label: text.replace(
									new RegExp(
										"(?![^&;]+;)(?!<[^<>]*)(" +
										$.ui.autocomplete.escapeRegex(request.term) +
										")(?![^<>]*>)(?![^&;]+;)", "gi"
									), "<b>$1</b>" ),
								value: text,
								option: this
							};
						}
					}) );
				},
				select: function( event, ui ) {
					ui.item.option.selected = true;
					self._trigger( "selected", event, {
						item: ui.item.option
					});
					select.triggerHandler('change');
				},
				change: function( event, ui ) {
					if ( !ui.item ) {
						var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( $(this).val() ) + "$", "i" );
						valid = false;
						select.children( "option" ).each(function() {
							if ( $( this ).text().match( matcher ) ) {
								this.selected = valid = true;
								return false;
							}
						});
						if ( !valid ) {
							// remove invalid value, as it didn't match anything
							$( this ).val( "" );
							input.data( "autocomplete" ).term = "";
							select.val(self.options.emptyMessage);
							select.triggerHandler('change');
							return false;
						} else {
							select.triggerHandler('change');
						}
					}
				},
				create: function (e, ui) {
					var _t = $(this),
						t_top = _t.offset().top - portMessure.offset().top;
					$('.ui-autocomplete.ui-menu').css({
						'position': 'fixed',
						'overflow': 'auto',
						'max-height': Math.round($(window).height() - t_top - _t.height() - 20 ) + 'px'
					});
				},
				close: function (e, ui) { setTimeout( function() { isOpen = false; }, 1 ); },
				open: function (e, ui) {
					isOpen = true;
					var _t = $(this),
						t_top = _t.offset().top - portMessure.offset().top;
					$('.ui-autocomplete.ui-menu')
						.css({
							'position': 'fixed',
							'max-height': Math.round($(window).height() - t_top - _t.height() - 20 ) + 'px'
						});
				}
			})
			.addClass( "ui-widget ui-widget-content ui-corner-left" ).css('width', (selectWidth - 70) + 'px')
			.on('click', function() { $(this).select(); })
			.on('keydown', function(e) {
				if (self.options.passEnter && (13 === e.which) && !isOpen && valid) {
					var kup = $.Event('keyup');
					kup.ctrlKey = false;
					kup.keyCode = kup.which = 13;
					select.triggerHandler(kup);
				}
			});

		if (selectLabels) {
			selectLabels.attr('for', ownId);
		}

		input.data( "autocomplete" )._renderItem = function( ul, item ) {
			return $( "<li>" )
				.data( "item.autocomplete", item )
				.append( "<a>" + item.label + "</a>" )
				.appendTo( ul );
		};

		this.button = $( "<button>", {
			"tabIndex": -1,
			"type": "button",
			"text": "&nbsp;",
			"title": "Show All Items",
			"style": "height:1.5em;padding:0!important;width:20px;margin:0!important;position:relative;top:5px;"
		} )
			.insertAfter( input )
			.button({
				icons: {
					primary: "ui-icon-triangle-1-s"
				},
				text: false
			})
			.removeClass( "ui-corner-all" )
			.addClass( "ui-corner-right ui-button-icon" )
			.on('click', function() {
				// close if already visible
				if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
					input.autocomplete( "close" );
					return;
				}

				// work around a bug (likely same cause as #5265)
				$( this ).blur();

				// pass empty string as value to search for, displaying all results
				input.autocomplete( "search", "" );
				input.focus();
			});
	},

	destroy: function() {
		if (this.options.shutOff) return;
		this.input.remove();
		this.portMessure.remove();
		this.button.remove();
		this.element.show();
		$.Widget.prototype.destroy.call( this );
	}
});
};

if ([-1, 2, 3].indexOf(mw.config.get('wgNamespaceNumber')) !== -1) {
	// alternative for jQuery UI autocomplete: jquery.suggestions
	// http://jqueryui.com/demos/autocomplete/ http://svn.wikimedia.org/viewvc/mediawiki/trunk/phase3/resources/jquery/jquery.suggestions.js?view=markup
	$.when(mw.loader.using([
		'jquery.ui',
		'mediawiki.util',
		'mediawiki.user',
		'user.options', // for sig
		'ext.gadget.libUtil',
		'ext.gadget.libJQuery'
		]), $.ready)
		.then(function () {
			initCombobox($);
			umsg.umInstall();
			if (window.installOldLinks) umsg.umInstallOldLinks();
			$(document).triggerHandler('scriptLoaded', ['AxUserMsg', umsg]);
	});
}
})();
//</nowiki>
