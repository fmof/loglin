
//basically from 
//http://www.cricketschirping.com/code/distribution.js and
//http://en.wikipedia.org/wiki/Box-Muller_transform
function normal(mu,sigma){
    return new Object({
	    sigma:sigma,
		mu:mu,
		sample: function(){
		var result;
		if(this.other_val){
		    result=this.other_val;
		    this.other_val=null;
		} else{
		    var r=Math.sqrt(-2*Math.log(Math.random()));
		    var t=2*Math.PI*Math.random();
		    result = r*Math.cos(t)*this.sigma + this.mu;
		    this.other_val = r*Math.sin(t)*this.sigma + this.mu;
		}
		return result;
	    }});
}


function sign(x){
    return x>0?1:(x<0?-1:0);
}


function get_constant_function(n){
    return function(){
	return n;
    };
}

function is_int(value){ 
    if((parseFloat(value) == parseInt(value)) && !isNaN(value)){
	return true;
    } else { 
	return false;
    } 
}


function add(x, y) {
    return x+y;
}

function sum(numbers) {
    return numbers.reduce(add,0);
}
