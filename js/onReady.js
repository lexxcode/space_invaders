/* DOM Ready
----------------------------------------------------------------------------- */
var onReady = (function() {
	var funcs = [],
		ready = false;
	function handler(e) {
		if(ready) return;
		if(e.type === 'readystatechange' && document.readyState !== 'complete') {return;}
		for (var i = 0; i < funcs.length; i++) {
			funcs[i].call(document);
		}
		ready = true;
		funcs = null;
	}
	if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', handler, false);
		document.addEventListener('readystatechange', handler, false);
		window.addEventListener('load', handler, false);
	}
	else if(document.attachEvent) {
		document.attachEvent('onreadystatechange', handler);
		window.attachEvent('onload', handler);
	}
	return function onReady(f) {
		if (ready) {
			f.call(document);
		}
		else {
			funcs.push(f);
		}
	}
}());
