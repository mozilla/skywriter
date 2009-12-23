var ENV = {"platform":"classic","mode":"production"};
var SC=SC||{BUNDLE_INFO:{},LAZY_INSTANTIATION:{}};SC.json=JSON;SC.browser=(function(){var c=navigator.userAgent.toLowerCase();
var a=(c.match(/.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/)||[])[1];var b={version:a,safari:(/webkit/).test(c)?a:0,opera:(/opera/).test(c)?a:0,msie:(/msie/).test(c)&&!(/opera/).test(c)?a:0,mozilla:(/mozilla/).test(c)&&!(/(compatible|webkit)/).test(c)?a:0,mobileSafari:(/apple.*mobile.*safari/).test(c)?a:0,windows:!!(/(windows)/).test(c),mac:!!((/(macintosh)/).test(c)||(/(mac os x)/).test(c)),language:(navigator.language||navigator.browserLanguage).split("-",1)[0]};
b.current=b.msie?"msie":b.mozilla?"mozilla":b.safari?"safari":b.opera?"opera":"unknown";
return b})();SC.bundleDidLoad=function(a){var b=this.BUNDLE_INFO[a];if(!b){b=this.BUNDLE_INFO[a]={}
}b.loaded=true};SC.bundleIsLoaded=function(a){var b=this.BUNDLE_INFO[a];return b?!!b.loaded:false
};SC.loadBundle=function(){throw"SC.loadBundle(): SproutCore is not loaded."};SC.setupBodyClassNames=function(){var e=document.body;
if(!e){return}var c,a,f,b,g,d;c=SC.browser.current;a=SC.browser.windows?"windows":SC.browser.mac?"mac":"other-platform";
d=document.documentElement.style;f=(d.MozBoxShadow!==undefined)||(d.webkitBoxShadow!==undefined)||(d.oBoxShadow!==undefined)||(d.boxShadow!==undefined);
b=(d.MozBorderRadius!==undefined)||(d.webkitBorderRadius!==undefined)||(d.oBorderRadius!==undefined)||(d.borderRadius!==undefined);
g=e.className?e.className.split(" "):[];if(f){g.push("box-shadow")}if(b){g.push("border-rad")
}g.push(c);g.push(a);if(SC.browser.mobileSafari){g.push("mobile-safari")}e.className=g.join(" ")
};
