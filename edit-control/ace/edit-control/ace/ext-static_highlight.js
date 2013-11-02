/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

ace.define("ace/ext/static_highlight",["require","exports","module","ace/edit_session","ace/layer/text","ace/config","ace/lib/dom"],function(e,t,n){var r=e("../edit_session").EditSession,i=e("../layer/text").Text,s=".ace_static_highlight {font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', 'Droid Sans Mono', monospace;font-size: 12px;}.ace_static_highlight .ace_gutter {width: 25px !important;display: block;float: left;text-align: right;padding: 0 3px 0 0;margin-right: 3px;position: static !important;}.ace_static_highlight .ace_line { clear: both; }.ace_static_highlight .ace_gutter-cell {-moz-user-select: -moz-none;-khtml-user-select: none;-webkit-user-select: none;user-select: none;}",o=e("../config"),u=e("../lib/dom");t.render=function(e,n,i,s,u,a){function c(){var r=t.renderSync(e,n,i,s,u);return a?a(r):r}var f=0,l=r.prototype.$modes;return typeof i=="string"&&(f++,o.loadModule(["theme",i],function(e){i=e,--f||c()})),typeof n=="string"&&(f++,o.loadModule(["mode",n],function(e){l[n]||(l[n]=new e.Mode),n=l[n],--f||c()})),f||c()},t.renderSync=function(e,t,n,o,u){o=parseInt(o||1,10);var a=new r("");a.setUseWorker(!1),a.setMode(t);var f=new i(document.createElement("div"));f.setSession(a),f.config={characterWidth:10,lineHeight:20},a.setValue(e);var l=[],c=a.getLength();for(var h=0;h<c;h++)l.push("<div class='ace_line'>"),u||l.push("<span class='ace_gutter ace_gutter-cell' unselectable='on'>"+(h+o)+"</span>"),f.$renderLine(l,h,!0,!1),l.push("</div>");var p="<div class='"+n.cssClass+"'>"+"<div class='ace_static_highlight'>"+l.join("")+"</div>"+"</div>";return f.destroy(),{css:s+n.cssText,html:p}},t.highlight=function(e,n,r){var i=e.className.match(/lang-(\w+)/),s=n.mode||i&&"ace/mode/"+i[1];if(!s)return!1;var o=n.theme||"ace/theme/textmate",a="",f=[];if(e.firstElementChild){var l=0;for(var c=0;c<e.childNodes.length;c++){var h=e.childNodes[c];h.nodeType==3?(l+=h.data.length,a+=h.data):f.push(l,h)}}else a=u.getInnerText(e);t.render(a,s,o,1,!0,function(t){u.importCssString(t.css,"ace_highlight"),e.innerHTML=t.html;var n=e.firstChild.firstChild;for(var i=0;i<f.length;i+=2){var s=t.session.doc.indexToPosition(f[i]),o=f[i+1],a=n.children[s.row];a&&a.appendChild(f[i+1])}r&&r()})}});