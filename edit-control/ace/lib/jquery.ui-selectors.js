/*! jQuery UI - v1.10.3 - 2013-06-21
    * http://jqueryui.com
    * Includes: jquery.ui.core.js
    * Copyright 2013 jQuery Foundation and other contributors Licensed MIT */

define(["require","jquery"],function(e){function n(e,n){var i,s,o,u=e.nodeName.toLowerCase();return"area"===u?(i=e.parentNode,s=i.name,!e.href||!s||i.nodeName.toLowerCase()!=="map"?!1:(o=t("img[usemap=#"+s+"]")[0],!!o&&r(o))):(/input|select|textarea|button|object/.test(u)?!e.disabled:"a"===u?e.href||n:n)&&r(e)}function r(e){return t.expr.filters.visible(e)&&!t(e).parents().addBack().filter(function(){return t.css(this,"visibility")==="hidden"}).length}var t=e("jquery");return t.extend(t.expr[":"],{data:t.expr.createPseudo?t.expr.createPseudo(function(e){return function(n){return!!t.data(n,e)}}):function(e,n,r){return!!t.data(e,r[3])},focusable:function(e){return n(e,!isNaN(t.attr(e,"tabindex")))},tabbable:function(e){var r=t.attr(e,"tabindex"),i=isNaN(r);return(i||r>=0)&&n(e,!i)}}),t});