/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2013, Ajax.org B.V.
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
 *
 * Contributor(s):
 *
 * Garen J. Torikian
 *
 * ***** END LICENSE BLOCK ***** */

ace.define("ace/mode/toml",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/toml_highlight_rules","ace/mode/folding/ini"],function(e,t,n){var r=e("../lib/oop"),i=e("./text").Mode,s=e("../tokenizer").Tokenizer,o=e("./toml_highlight_rules").TomlHighlightRules,u=e("./folding/ini").FoldMode,a=function(){this.HighlightRules=o,this.foldingRules=new u};r.inherits(a,i),function(){this.lineCommentStart="#"}.call(a.prototype),t.Mode=a}),ace.define("ace/mode/toml_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],function(e,t,n){var r=e("../lib/oop"),i=e("./text_highlight_rules").TextHighlightRules,s=function(){var e=this.createKeywordMapper({"constant.language.boolean":"true|false"},"identifier"),t="[a-zA-Z\\$_¡-￿][a-zA-Z\\d\\$_¡-￿]*\\b";this.$rules={start:[{token:"comment.toml",regex:/#.*$/},{token:"string",regex:'"(?=.)',next:"qqstring"},{token:["variable.keygroup.toml"],regex:"(?:^\\s*)(\\[([^\\]]+)\\])"},{token:e,regex:t},{token:"support.date.toml",regex:"\\d{4}-\\d{2}-\\d{2}(T)\\d{2}:\\d{2}:\\d{2}(Z)"},{token:"constant.numeric.toml",regex:"-?\\d+(\\.?\\d+)?"}],qqstring:[{token:"string",regex:"\\\\$",next:"qqstring"},{token:"constant.language.escape",regex:'\\\\[0tnr"\\\\]'},{token:"string",regex:'"|$',next:"start"},{defaultToken:"string"}]}};r.inherits(s,i),t.TomlHighlightRules=s}),ace.define("ace/mode/folding/ini",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode"],function(e,t,n){var r=e("../../lib/oop"),i=e("../../range").Range,s=e("./fold_mode").FoldMode,o=t.FoldMode=function(){};r.inherits(o,s),function(){this.foldingStartMarker=/^\s*\[([^\])]*)]\s*(?:$|[;#])/,this.getFoldWidgetRange=function(e,t,n){var r=this.foldingStartMarker,s=e.getLine(n),o=s.match(r);if(!o)return;var u=o[1]+".",a=s.length,f=e.getLength(),l=n,c=n;while(++n<f){s=e.getLine(n);if(/^\s*$/.test(s))continue;o=s.match(r);if(o&&o[1].lastIndexOf(u,0)!==0)break;c=n}if(c>l){var h=e.getLine(c).length;return new i(l,a,c,h)}}}.call(o.prototype)});