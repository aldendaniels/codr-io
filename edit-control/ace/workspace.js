define(["require","jquery","helpers/helpers-web","helpers/socket","helpers/key-shortcut-handler","edit-control/modes","editor","toolbar"],function(e){var t=e("jquery"),n=e("helpers/helpers-web"),r=e("helpers/socket"),i=e("helpers/key-shortcut-handler"),s=e("edit-control/modes"),o=e("editor"),u=e("toolbar"),a="Untitled";return n.createClass({_oSocket:null,_oEditor:null,_oToolbar:null,_oUserInfo:null,_aObjects:null,_oFocusedObject:null,_oLastFocusedObject:null,__type__:"Workspace",__init__:function(e,f,l){var c=f?null:"ws://"+window.document.location.host+"/";this._oSocket=new r(c),this._oSocket.bind("message",this,this._handleServerAction);var h=new i;this._oToolbar=new u(this,this._oSocket,h),this._oEditor=new o(this._oSocket),this._aObjects=[this._oToolbar,this._oEditor],this._aFocusHistory=[];if(e)this._oToolbar.setTitle(a),this._setMode(l),this._oSocket.send("createDocument",{sMode:l.getName(),sTitle:a}),this.focusEditor();else{var p=/^(\/v)?\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[2];this._oSocket.send("openDocument",{sDocumentID:p}),this._setUrls(),t("#clone-doc-id").val(p)}if(f){var p=/^\/v\/([a-z0-9]+)\/?$/.exec(document.location.pathname)[1];t.get("/ajax/"+p+"/",n.createCallback(this,function(e){n.assert(!e.sError,e.sError),this._oEditor.setContent(e.aLines);var t=s.oModesByName[e.sMode];this._setMode(t),this._oToolbar.setTitle(e.sTitle)}))}this._oEditor.focus(),this._attachDOMEvents()},blurFocusedObject:function(){this._oFocusedObject&&this._oFocusedObject!=this._oEditor&&(this._oLastFocusedObject?this._oLastFocusedObject.focus():this._oEditor.focus())},focusEditor:function(){this.blurFocusedObject(),this._oEditor.focus()},setEditorMode:function(e){this._oEditor.setMode(e)},getUserInfo:function(){return this._oUserInfo},_setMode:function(e){this._oEditor.setMode(e),this._oToolbar.setMode(e)},_getContainingObj:function(e){for(var t in this._aObjects){var r=this._aObjects[t];if(r.contains(e))return r}return n.assert(e.is("BODY"),"Containing object not found this element:",e),null},_attachDOMEvents:function(){function e(e,t){e.onEvent(t)}n.on("BODY","mousedown click focusin keydown keyup keypress",this,function(r){var i=t(r.target),s=this._getContainingObj(i);switch(r.type){case"keydown":if(r.which==27){this.blurFocusedObject();break}r.ctrlKey&&n.inArray(r.which,[83,70,71])&&r.preventDefault();case"keypress":case"keyup":this._oFocusedObject&&e(this._oFocusedObject,r);break;case"focusin":if(this._oFocusedObject!=s){if(this._oFocusedObject){this._oFocusedObject.onBlur();var o=[this._oToolbar],u=[];n.inArray(s,o)&&n.inArray(this._oFocusedObject,u)?this._oLastFocusedObject=this._oFocusedObject:this._oLastFocusedObject=null}this._oFocusedObject=s};case"mousedown":(i.is(":not(input, textarea)")||i.prop("disabled"))&&r.preventDefault();default:e(s,r)}})},_handleServerAction:function(e){switch(e.sType){case"connect":this._oUserInfo=e.oData;break;case"setDocumentTitle":this._oToolbar.setTitle(e.oData.sTitle);break;case"setMode":var n=s.oModesByName[e.oData.sMode];this._setMode(n);break;case"setDocumentID":window.history.replaceState(null,"","/"+e.oData.sDocumentID),this._setUrls(),t("#clone-doc-id").val(e.oData.sDocumentID);break;case"error":document.write(e.oData.sMessage);break;default:return!1}return!0},_setUrls:function(){t("#collaborate-url").val(document.location.href.slice(7)),t("#workspace-logout").attr("href","/logout?next="+document.location.pathname),t("#workspace-login").attr("href","/login?next="+document.location.pathname)}})});