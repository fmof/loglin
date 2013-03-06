//http://stackoverflow.com/questions/3730510/javascript-sort-array-and-return-an-array-of-indicies-that-indicates-the-positi
function sortWithIndeces(toSort) {
    for (var i = 0; i < toSort.length; i++) {
	toSort[i] = [toSort[i], i];
    }
    toSort.sort(function(left, right) {
	    return left[0] < right[0] ? -1 : 1;
	});
    toSort.sortIndices = [];
    for (var j = 0; j < toSort.length; j++) {
	toSort.sortIndices.push(toSort[j][1]);
	//	toSort[j] = toSort[j][0];
    }
    return toSort;
}

function print_loading_error(jqXHR, textStatus, errorThrown){
}

function INVERSE_FEATURE_LOOKUP(context,val){
    var ret = INVERSE_FEATURE_LIST[[CONTEXTS[context],val]];
    return isNumber(ret)?ret:-1;
}

function range(begin, end){
    var l=[];
    for (var i = begin; i < end; ++i){
	l.push(i);
    }
    return l;
}

function reduce(combine, base, array) {
    array.forEach(function (element) {
	    base = combine(base, element);
	});
    return base;
}

function ll_resizer(){
    return function(l){
	if(l<0 && !isFinite(l))
	    return 2;
	return LL_SIGMOID.transform(l) + 70;
    };
}
/*function ll_resizer(min,max){
    var m = (.85-.25)*DIV_LL_WIDTH / (max-min);
    return function(l){
	return m * (l - max) + (.85*DIV_LL_WIDTH) + 70;
    };
};*/

function bound_dom_range(x){
    return Math.max(.00001,Math.min(slider_width-handle_width-.0001,SLIDER_SIGMOID.transform(x)+handle_width/2))*100/slider_width;
}


function get_handle(slider_value_box){
    return slider_value_box.parentNode.childNodes[0].childNodes[1];
}


function get_slider_zero_positions(sh,known){
    var onepx = .75/slider_width*100;
    var c = known ? '#FFFFFF' : '';
    return [[sh-onepx-0.00000001,c],
	    [sh-onepx,'#000000'],
	    [sh+onepx,'#000000'],
	    [sh+onepx+0.00000001,c]];
}

//http://stackoverflow.com/questions/4197591/parsing-url-hash-fragment-identifier-with-javascript
function getHashParams(hs) {
    var hashParams = {};
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&;=]+)=?([^&;]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.hash.substring(1);

	while (e = r.exec(q))
	    hashParams[d(e[1])] = d(e[2]);

	return hashParams;
}
