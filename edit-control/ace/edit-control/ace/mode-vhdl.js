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
 * ***** END LICENSE BLOCK ***** */

ace.define("ace/mode/vhdl",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/vhdl_highlight_rules","ace/range"],function(e,t,n){var r=e("../lib/oop"),i=e("./text").Mode,s=e("../tokenizer").Tokenizer,o=e("./vhdl_highlight_rules").VHDLHighlightRules,u=e("../range").Range,a=function(){this.HighlightRules=o};r.inherits(a,i),function(){this.lineCommentStart="--"}.call(a.prototype),t.Mode=a}),ace.define("ace/mode/vhdl_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],function(e,t,n){var r=e("../lib/oop"),i=e("./text_highlight_rules").TextHighlightRules,s=function(){var e="access|after|ailas|all|architecture|assert|attribute|begin|block|buffer|bus|case|component|configuration|disconnect|downto|else|elsif|end|entity|file|for|function|generate|generic|guarded|if|impure|in|inertial|inout|is|label|linkage|literal|loop|mapnew|next|of|on|open|others|out|port|process|pure|range|record|reject|report|return|select|shared|subtype|then|to|transport|type|unaffected|united|until|wait|when|while|with",t="bit|bit_vector|boolean|character|integer|line|natural|positive|real|register|severity|signal|signed|std_logic|std_logic_vector|string||text|time|unsigned|variable",n="array|constant",r="abs|and|mod|nand|nor|not|rem|rol|ror|sla|sll|srasrl|xnor|xor",i="true|false|null",s=this.createKeywordMapper({"keyword.operator":r,keyword:e,"constant.language":i,"storage.modifier":n,"storage.type":t},"identifier",!0);this.$rules={start:[{token:"comment",regex:"--.*$"},{token:"string",regex:'".*?"'},{token:"string",regex:"'.*?'"},{token:"constant.numeric",regex:"[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"},{token:"keyword",regex:"\\s*(?:library|package|use)\\b"},{token:s,regex:"[a-zA-Z_$][a-zA-Z0-9_$]*\\b"},{token:"keyword.operator",regex:"&|\\*|\\+|\\-|\\/|<|=|>|\\||=>|\\*\\*|:=|\\/=|>=|<=|<>"},{token:"punctuation.operator",regex:"\\'|\\:|\\,|\\;|\\."},{token:"paren.lparen",regex:"[[(]"},{token:"paren.rparen",regex:"[\\])]"},{token:"text",regex:"\\s+"}]}};r.inherits(s,i),t.VHDLHighlightRules=s});