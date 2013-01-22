TRUE_THETA_PATH='';
OBSERVATION_PATH='';
INSTRUCTION_PATH='';
loader_bar_img='imgs/ajax-bar-loader.gif';
LOADING_TIME_DELAY = 200;
has_cheated=0;
SLIDER_DIV=1; //amount to scale slider by (for display)

CURRENT_LESSON=1;
MAX_LESSONS=18;

TYPE_INDEX=[]; //type-string -> type-id, e.g., "circle,solid" -> 12
TYPE_MAP={}; //reverse of above

CONTEXTS=[]; //ids -> names, e.g., 0 -> circle
REVERSE_CONTEXTS={};//reverse of above, e.g., circle -> 0

solved=0;
VISUALS=[];

//context-id -> Associative Array of counts (by type-id), e.g., 0 -> {4=>3, 1=>12,..}
COUNTS=[];
//context id -> associative array of positions (by type id), e.g., 0 -> {[0,0] => 0, [0,1] => 4}
POSITION_BY_CONTEXT=[];
POSITIONS=[];
REVERSE_POSITIONS={};

//context_id -> associative array
DATA_BY_CONTEXT=[];

LAST_UPDATED_TOKEN_COUNT=null;

USED_CONTEXTS={};
USED_FEATURES={};

DATA_BY_POINT=[]; //maps type id_num to human readable feature vector (dim_0,...,dim_n)
ORIG_DATA=[]; //the full, original record (from csv file)
MAP_COUNT_INDICES=[]; //maps from type id to position in ascending sorted list
SORT_COUNT_INDICES=[]; //sorted list of observed type counts
//ditto, but for expected
MAP_EXPECTED_INDICES=[]; 
EXPECTED_COUNTS=[];
NUM_OBSERVATIONS=0; //the number of *type* observations
NUM_OBSERVATIONS_C=[];//number of types by context
TYPE_OBSERVATIONS_IN_C=[];//context_id -> list(array) of type indices
NUM_TOKENS=0; //the number of *token* observations
NUM_TOKENS_C=[];//the number of *tokens* observations by context

//OLD: [dim #, value # (per dim), value name]
FEATURE_LIST=[]; //feature_id# -> feature name (e.g., 2 -> circle)
INVERSE_FEATURE_LIST={}; //inverse of above

//[dimension #][human feature value] --> id, per dimension
//e.g., DIM[0]['rect'] --> 1; DIM[0]['circle'] --> 0
DIM=[]; 
//[dimension #][feature value id (int)] --> human feature value
//e.g., DIM[0][0] --> 'circle'; DIM[1][0] --> 'red'
REVDIM=[];
//stores max number of values per feature dimension
CURR_FOR_DIM=[];
//feature dimension number --> human readable dimension name
KEYS_TO_CARE_ABOUT=[]; //"shape","color","fill"];
//reverse of above, and how we (currently) define *everything*
REVERSE_KEYS={'shape':0,'color':1, 'fill':2};
for(var key in REVERSE_KEYS){
    KEYS_TO_CARE_ABOUT[REVERSE_KEYS[key]]=key;
}


/*DISPLAY PARAMETERS*/
NUM_PER_ROW=6; 
MAX_ROWS=-1; MAX_COLS=-1;
MAX_FRAMES=1;

Z_THETA=[];
TRUE_Z_THETA=[];
//two dimensional matrix
//[dimension #][feature value id (int)] -> float (weight)

THETA=[];
THETA_STRENGTH=[];
INVERSE_THETA_MAP={};
TRUE_THETA=[];

MAX_EXP_EMP_PROB=[];
MAX_EXP_EMP_PROB_TYPE=[];
MAX_EXP_EMP_AREA=[];

MAX_EMP_PROB=[];
MAX_EMP_PROB_TYPE=[];
MAX_EMP_AREA=[];

//feature ID number -> float
GRADIENT=[];
OBS_FEAT_COUNT=[];
EXP_FEAT_COUNT=[];
REG_FOR_GRAD=[];

SOLVE_STEP=0.1;
ORIG_SOLVE_STEP=SOLVE_STEP;
SHOW_GRADIENTS=0;
DISPLAY_GRADIENT_COMPONENTS=1;
SOLVE_ITERATION=1;
SOLVE_TIMEOUT_ID={};
SOLVE_TIME_DELAY=750; //in milliseconds
STOPPING_EPS=0.05;
MAX_SOLVE_ITERATIONS = 200;

SVG_WIDTH=100; SVG_HEIGHT=100;

DIV_LL_WIDTH=800;
RESERVE_LL_WIDTH=100;
worst_ll=2;
LOG_LIKELIHOOD=[0];
REGULARIZATION=[0]; //for LL
TRUE_LOG_LIKELIHOOD = [0];
TRUE_REGULARIZATION=[0];
USE_REGULARIZATION=0;
REGULARIZATION_EXPONENT=2;
REGULARIZATION_SIGMA2=1.0; //actually, the constant C (1/\sigma^2)

EXPECTED_TRANSPARENCY=0.4;
EXPECTED_STROKE_WIDTH=3;
EXPECTED_COUNT_COLOR='#A043BF';

TRUE_MODEL_COLOR='#11EE23';

COUNTS_TOO_LOW='red';
COUNTS_TOO_HIGH='blue';
COUNTS_EQUAL='#484848';

slider_min= -2* Math.E;
slider_max= 2*Math.E;
slider_step = 0.00001;
slider_width = 155;
handle_width = 12;
min_slider_val = Number.MIN_VALUE;
max_slider_val = slider_width-handle_width- Number.MIN_VALUE;

in_solving=0;
button_color='';

col_for_true_theta=TRUE_MODEL_COLOR;

gradients_drawn = 0;
//GRAD_LOW_C='#334455';
//GRAD_HIGH_C='#AA03FF';
GRAD_LOW_C='red';
GRAD_HIGH_C='blue';
//now unused...
//sigmoid_y_define_ratio = 7.0/8.0;
//sigmoid_x_define = Math.sqrt(2); 
//SIGMOID_CONSTANT = 1/sigmoid_x_define * Math.log(sigmoid_y_define_ratio/(1-sigmoid_y_define_ratio));

INITIAL_LOAD=1;
skip_next_hashchange=0;
initialize=0;
svg_loaded=0;
user_input_tokens_added=0;
function isNumber(n) {
    return (n==null || n==undefined || !(n.length)) || 
	(!isNaN(parseFloat(n)) && isFinite(n));
}

function get_sigmoid(amp,hmove, xdef, ratio){
    return new Object({
	    amp : amp,
		hmove : hmove,
		sconst : 1/(xdef-hmove) * Math.log(ratio/(1-ratio)),
		transform : function(x){
		return amp / (1+Math.exp(-this.sconst * (x - this.hmove)));
	    },
		inverse : function(x){
		return -1/this.sconst * Math.log(this.amp/x - 1) + this.hmove;
	    }});
}

var SLIDER_SIGMOID = get_sigmoid(slider_width-handle_width, 0, Math.sqrt(2), 7.0/8.0);
var LL_SIGMOID;

/*
function sigmoid_transform(x){
    return (slider_width-handle_width)/(1+Math.pow(Math.E,-SIGMOID_CONSTANT*(x)));
}
function inverse_sigmoid(x){
    var ret= -1/SIGMOID_CONSTANT * Math.log((slider_width-handle_width)/(x) - 1);
    return ret;
    }*/

function reset_paths(){
    TRUE_THETA_PATH='';
    OBSERVATION_PATH='';
}

function reset_data_structures(full){
    has_cheated=0;
    if(full){
	reset_paths();
	TYPE_INDEX=[]; //type-string -> type-id, e.g., "circle,solid" -> 12
	TYPE_MAP={}; //reverse of above
	CONTEXTS=[]; //ids -> names, e.g., 0 -> circle
	REVERSE_CONTEXTS={};//reverse of above, e.g., circle -> 0
	VISUALS=[];
	FEATURE_LIST=[]; //feature_id# -> feature name (e.g., 2 -> circle)
	INVERSE_FEATURE_LIST={}; //inverse of above
	NUM_OBSERVATIONS=0; //the number of *type* observations
	NUM_OBSERVATIONS_C=[];//number of types by context
	TYPE_OBSERVATIONS_IN_C=[];//context_id -> list(array) of type indices
	
	TRUE_Z_THETA=[];
	TRUE_THETA=[];
	Z_THETA=[];
	THETA=[];
	
	NUM_TOKENS=0; //the number of *token* observations
	GRADIENT=[]; OBS_FEAT_COUNT=[]; EXP_FEAT_COUNT=[]; REG_FOR_GRAD=[];
	POSITIONS=[];
	REVERSE_POSITIONS={};
	USED_CONTEXTS={};
	USED_FEATURES={};
	//context_id -> associative array :: this stores features
	DATA_BY_CONTEXT=[];
	//context-id -> Associative Array of counts, e.g., 0 -> {4=>3, 1=>12,..}
	COUNTS=[];
	EXPECTED_COUNTS=[];
	svg_loaded=0;
	user_input_tokens_added=0;
    }
    for(var c in NUM_TOKENS_C){
	NUM_TOKENS_C[c]=0;
    }

    MAX_EMP_PROB=[];
    MAX_EMP_PROB_TYPE=[];
    MAX_EMP_AREA=[];

    //is there a reason I wasn't nulling out these next three arrays?
    MAX_EXP_EMP_PROB=[];
    MAX_EXP_EMP_PROB_TYPE=[];
    MAX_EXP_EMP_AREA=[];

    //feature ID number -> float
    GRADIENT=GRADIENT.map(function(d){return d-d;});
    OBS_FEAT_COUNT=OBS_FEAT_COUNT.map(function(d){return d-d;});
    EXP_FEAT_COUNT=EXP_FEAT_COUNT.map(function(d){return d-d;});
    REG_FOR_GRAD=REG_FOR_GRAD.map(function(d){return d-d;});

    SOLVE_STEP=0.1;
    ORIG_SOLVE_STEP=SOLVE_STEP;
    SOLVE_ITERATION=1;
    SOLVE_TIMEOUT_ID={};
    STOPPING_EPS=0.05;

    worst_ll=2;
    LOG_LIKELIHOOD=[0];
    REGULARIZATION=[0];
    TRUE_LOG_LIKELIHOOD = [0];
    TRUE_REGULARIZATION=[0];
    
    EXPECTED_TRANSPARENCY=0.4;
    EXPECTED_STROKE_WIDTH=3;

    gradients_drawn = 0;
    LAST_UPDATED_TOKEN_COUNT=null;
}

max_prob=1;

//load current lesson
function load_lesson(){
    loading_object = new do_all_loading().start_timer();
    show_text_portion();
    show_data_portion();
    $('header_lesson_number').innerHTML=CURRENT_LESSON;
    $('header_lesson_number').setAttribute('lesson',CURRENT_LESSON);
    $('show_how_many_previous_lessons').innerHTML = Math.max(1,CURRENT_LESSON-1);
    $('show_how_many_next_lessons').innerHTML = Math.min(CURRENT_LESSON+1,MAX_LESSONS);
    reset_data_structures(1);
    if(!INITIAL_LOAD){
	//remove a bunch of nodes...
	jQuery('#draw_area').empty();
	jQuery('#ll_area').empty();
	jQuery('#feature_table').empty();
	//redisplay some things...
	$('cheat_button').style.display="none";
	$('new_counts').disabled='disabled';
	console.log('not hanging...');
    } else{
	INITIAL_LOAD=0;
    }
    TRUE_THETA_PATH = 'lessons/'+CURRENT_LESSON+'/theta';
    OBSERVATION_PATH = 'lessons/'+CURRENT_LESSON+'/observations';    
    INSTRUCTION_PATH = 'lessons/'+CURRENT_LESSON+'/instructions.html';
    if(CURRENT_LESSON == 3 || CURRENT_LESSON==7){
	$('new_challenge').style.display='none';
    } else{
	$('new_challenge').style.display='inline';
    }
    loading_object.start();
    document.title = 'Log-Linear Models: Lesson '+CURRENT_LESSON;
    history.pushState({CURRENT_LESSON:CURRENT_LESSON},'','#'+CURRENT_LESSON);
    $('jump_to_lesson_select').value=0;   
}

function setITimeout( callback, init_time, times ){
    var internalCallback = function( t, ep, counter ){
	return function(){
	    if ( t-- > 0 ){
		counter++;
		if(counter%10==0){
		    ep++;
		}
		var nt = init_time/(counter/Math.sqrt(10));
		console.log('time delay is '+nt);
		SOLVE_TIMEOUT_ID = window.setTimeout(internalCallback, nt);
		callback(counter)();
	    } else{
		//end solve here
		$('solve_button').onclick();
	    }
	}
    }( times, 0, 0 );
    SOLVE_TIMEOUT_ID=window.setTimeout( internalCallback, init_time/Math.sqrt(10) );
};

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

window.onhashchange = function(){
    if(skip_next_hashchange){
	skip_next_hashchange=0;
	return 0;
    }
    var n = parseInt(window.location.hash.substring(1));
    if(isNumber(n) && isFinite(n)){
	if(n>=1 && n<=MAX_LESSONS){
	    CURRENT_LESSON=n;
	    load_lesson();
	} else{
	    n=-CURRENT_LESSON;
	    skip_next_hashchange=1;
	    window.location.hash='#'+CURRENT_LESSON;
	}
    } else{
	n=-CURRENT_LESSON;
	    skip_next_hashchange=1;
	    window.location.hash='#'+CURRENT_LESSON;
    }
    return n;
}


window.onload = function(){
    var group;
    $('ll_area').style.width = (DIV_LL_WIDTH+RESERVE_LL_WIDTH)+'px';
    $$('.of_total_lessons').forEach(function(e){e.innerHTML=MAX_LESSONS;});
    if(parseInt($('header_lesson_number').getAttribute('lesson')) != 0){
	CURRENT_LESSON=parseInt($('header_lesson_number').getAttribute('lesson'));
    }
    if(window.onhashchange()<0)
	load_lesson();

    //add listeners for "jump to lesson" select
    if($('jump_to_lesson_select')){
	var s=$('jump_to_lesson_select');
	for(var i=1;i<=MAX_LESSONS;i++){
	    var o = document.createElement('option');
	    o.value=i;
	    o.innerHTML=i;
	    s.appendChild(o);
	}
	s.onchange=function(){
	    var v=parseInt(this.value);
	    if(v>0){
		CURRENT_LESSON=v;
		this.blur();
		load_lesson(0);		
		$('prev_lesson').verify();
		$('next_lesson').verify();
	    }
	};
    }

    /*if($('change_num_tokens_form')){
	$('change_num_tokens_form').style.display='none';
	$('done_changing_counts_button').onclick=function(){
	    $('change_num_tokens_form').style.display='none';
	    $('slider_area').style.display='block';
	    $('change_num_tokens').disabled='';
	    generate_new_observations();
	};
	}*/

    if($('new_counts')){
    	$('new_counts').onclick=function(){
	    //disable a bunch of buttons...
	    for(var c=0;c<CONTEXTS.length;c++){
		if(USED_CONTEXTS[c]){
		    var v = $('num_tokens_context_'+c).value;
		    v= isNumber(v)?parseFloat(v):-1;
		    //don't do the following when v == NUM_TOKENS_C[c]
		    if(c==LAST_UPDATED_TOKEN_COUNT || LAST_UPDATED_TOKEN_COUNT==null)
			generate_new_counts_context(c,v);
		}
	    }
	};
	$('new_counts').disabled='disabled';
    }

    if($('change_num_tokens')){
	//jQuery('#change_num_tokens').bt("you can change the number of <em>tokens</em> observed.");
	$('change_num_tokens').onclick=function(){
	    var form=$('change_num_tokens_form');
	    form.style.display="block";
	    form=form.childNodes[1];
	    $('slider_area').style.display='none';
	    this.disabled="disabled";
	    if(user_input_tokens_added){
		
	    } else{
		if(CONTEXTS.length==1){
		    var i = document.createElement('input');
		    i.type='text'; i.name='input_tokens_context_0'; i.id=i.name;
		    i.value=NUM_TOKENS_C[0]; i.setAttribute('context',0);
		    var d=document.createElement('div');
		    d.innerHTML='Tokens: ';
		    d.appendChild(i);
		    form.appendChild(d);
		    i.onchange = update_token_count;
		} else{
		    for(var c=0;c<CONTEXTS.length;c++){
			//input type="text" name = "" id="" value="" size=""
			var i = document.createElement('input');
			i.type='text'; i.name='input_tokens_context_'+c; i.id=i.name;
			i.setAttribute('context',c);
			i.value=NUM_TOKENS_C[c];
			var d=document.createElement('div');
			d.innerHTML='Tokens in Context '+c+': ';
			d.appendChild(i);
			form.appendChild(d);
			i.onchange=update_token_count;
		    }
		}
		user_input_tokens_added=1;
	    }
	    $('done_changing_counts_button').style.display='block';
	};
    }

    

    if($('new_challenge')){
    	$('new_challenge').onclick = function(){
	    $('step_button').disabled='disabled';
	    $('solve_button').disabled='disabled';
    	    var gs=$('gradient_step');
    	    gs.value = ORIG_SOLVE_STEP;
    	    gs.onchange();
    	    SOLVE_ITERATION=1;
	    LAST_UPDATED_TOKEN_COUNT=null;
    	    generate_new_observations();
	    this.blur();
	    if(has_cheated){
		$('cheat_button').style.display='block';
		var uufs=$$('.unused_feature');
		for(var u=0;u<uufs.length;u++){
		    uufs[u].style.display='none';
		}
    		var llb=$('ll_bars');
    		var th=parseFloat(llb.getAttribute('height'));
    		llb.setAttribute('height',(th-1)/2);
		has_cheated=0;
	    }
    	};
    }

    if($$('.expected_counts_text')){
	$$('.expected_counts_text').forEach(function(e){
		e.style.color = EXPECTED_COUNT_COLOR;
	    });
    }

    if($('next_lesson') && $('prev_lesson')){
	$('next_lesson').onclick=function(){
	    CURRENT_LESSON++;
	    load_lesson();
	    this.verify();
	    $('prev_lesson').verify();
	};
	$('next_lesson').verify = function(){
	    if(CURRENT_LESSON==MAX_LESSONS){
		this.disabled="disabled";
	    }
	    if(CURRENT_LESSON<MAX_LESSONS){
		$('next_lesson').disabled='';
	    }
	};
	$('prev_lesson').onclick=function(){
	    CURRENT_LESSON--;
	    this.verify();
	    $('next_lesson').verify();
	    load_lesson();
	};
	$('prev_lesson').verify = function(){
	    if(CURRENT_LESSON!=1){
		this.disabled="";
	    }
	    if(CURRENT_LESSON==1){
		this.disabled='disabled';
	    }
	};
	$('prev_lesson').verify(); $('next_lesson').verify();
    }

    if($('cheat_button')){
    	$('cheat_button').onclick=function(){
    	    if(!has_cheated){
    		var llb=$('ll_bars');
    		var th=parseFloat(llb.getAttribute('height'));
    		llb.setAttribute('height',2*th+1);
    		has_cheated=1;
    		$('cheat_button').style.display='none';
		draw_gradient();
		var uufs=$$('.unused_feature');
		for(var u=0;u<uufs.length;u++){
		    uufs[u].style.display='block';
		}
    	    }
    	};
	$('cheat_button').style.display='none';
    }

    if($('delay_normalization')){
    	$('delay_normalization').onclick = function(){
    	    alert('Frank should make this work!');
    	    this.disabled = this.disabled=="disabled"?"":"disabled";
    	    this.checked=false
    	}
    }

    if($("zero_weights_button")){
    	$("zero_weights_button").onclick = function(){  
    	    var group = $$('.feature_slider');
    	    var arr = group.map(function(d,i){
    		    var tindex = group[i].parentNode.parentNode.childNodes[0].getAttribute('theta_index');
    		    return [tindex,0];
    		});
    	    reset_sliders_manually(arr);
    	    redraw_all();
    	};
    }

    if(group=$$("input.regularization_radio")){
    	for(var i=0;i<group.length;i++){
    	    if(group[i].value != "0"){
    		group[i].onclick=function(){
    		    $('sigma2area').style.display='block';
    		    REGULARIZATION_EXPONENT=parseFloat(this.value);
    		    USE_REGULARIZATION=1;
    		    if(svg_loaded){
    			redraw_all();
    		    }
    		};		    
    	    } else{
    		group[i].onclick=function(){
    		    $('sigma2area').style.display="none";
    		    USE_REGULARIZATION=0;
    		    for(var i=0;i<REGULARIZATION.length;i++){
    			REGULARIZATION[i]=TRUE_REGULARIZATION[i]=0;
    		    }
    		    if(svg_loaded){
    			redraw_all();
    		    }
    		};
    	    }
	    if(group[i].checked){
		group[i].onclick();
	    }
    	}
    }	

    if($('step_button')){
    	$('step_button').onclick = function(){
    	    step_gradient();
    	};
    }

    if($('stop_solving')){
	$('stop_solving').onclick = function(){
	    clearInterval(SOLVE_TIMEOUT_ID);
	    $('stop_solving_div').style.display='none';
	    $('solve_button').disabled="";
	    $('step_button').disabled='';
	    $('next_lesson').disabled="";
	    $('prev_lesson').disabled="";
	    $('next_lesson').verify(); $('prev_lesson').verify();
	    //$('change_num_tokens').disabled="";
	    $('gradient_step').value = orig_step_size.toPrecision(5);
	    $('gradient_step').onchange();
	};
	$('stop_solving_div').style.display='none';
    }

    if($('solve_button')){
    	$('solve_button').onclick = function(){
    	    SOLVE_ITERATION=0;
	    if(in_solving){
		clearInterval(SOLVE_TIMEOUT_ID);
		in_solving=0;
		this.style.backgroundColor=button_color;
		//orig_solve_step
		$('gradient_step').value=SOLVE_STEP.toPrecision(5);
		this.innerHTML="Solve";
		//$('stop_solving_div').style.display='none';
		$('step_button').disabled='';
		$('next_lesson').disabled="";
		$('prev_lesson').disabled="";
		$('next_lesson').verify(); $('prev_lesson').verify();
		//$('change_num_tokens').disabled="";
		$('gradient_step').onchange();
	    } else{
		if(USE_REGULARIZATION){
		    $('regularization_constant').onchange();
		}
		if(SOLVE_STEP==0)
		    return;
		in_solving=1;
		button_color=this.style.backgroundColor;
		this.style.backgroundColor='red';
		this.innerHTML="Stop";
		$('step_button').disabled='disabled';
		$('next_lesson').disabled="disabled";
		$('prev_lesson').disabled="disabled";
		$('gradient_step').value=scale_gamma_for_solve(SOLVE_STEP,1).toPrecision(5);
		solved++;
		SOLVE_TIMEOUT_ID = setITimeout(function(iter){
			return function(){
			    console.log(iter);
			    var mystep = iter==1?recompute_step_size(SOLVE_STEP,0) : recompute_step_size(SOLVE_STEP);
			    console.log('done with recompsize : '+mystep);
			    solve_puzzle(mystep,
					 iter,
					 SOLVE_STEP);
			};}, SOLVE_TIME_DELAY/Math.sqrt(10), MAX_SOLVE_ITERATIONS);
				     
	    }
    	};
    }

    if(group=$$('.component_radio')){
    	for(var i=0;i<group.length;i++){
    	    group[i].onclick = setComponentDisplay;
    	}
    }
    if($('show_gradient')){
    	$('show_gradient').onclick = function(){
    	    //$('gradient_fieldset_div').style.display= this.checked ? 'block' : 'none';
    	    SHOW_GRADIENTS=this.checked;
    	    if(SHOW_GRADIENTS){
    		if(group=$$('.component_radio')){
		    var t;
		    for(var i=0;i<group.length;i++){
			if(group[i].checked){
			    t=group[i];
			    break;
			}
		    }
		    if(t!=undefined || t!=null){
			t.onclick();
		    }
		}
    		recompute_partition_function();
    		compute_gradient();
    	    } else{
    		recompute_partition_function();
    		compute_gradient();
    	    }
    	};
	if($('show_gradient').checked){
	    $('show_gradient').onclick();
	}
    }



    if($('gradient_step')){
    	$('gradient_step').value = SOLVE_STEP;
    	$('gradient_step').onchange = function(){
    	    if(isNumber(this.value)){
    		SOLVE_STEP=(this.value - 0);		
    	    } else{
    		//ZZZ !!!
    		alert('not a proper number. yell at creator for making this an alert');
    		//display error
    	    }
    	};
    }

    if($('regularization_constant')){
    	$('regularization_constant').onchange = function(){
    	    if(isNumber(this.value)){
    		REGULARIZATION_SIGMA2=(this.value - 0);		
    		if(svg_loaded){
    		    redraw_all();
		} else{
    		    recompute_partition_function_single();
    		    compute_gradient();
    		    draw_gradient();
    		}
    	    } else{
    		//ZZZ !!!
    		
    		//display error
    	    }
    	};
    }

    // if($$("span.coursedescription")){
    // 	var descLinks=$$("span.coursedescription");
    // 	for(var i=0; i<descLinks.length;i++){
    // 	    descLinks[i].onclick=toggleDiv;
    // 	}
    // }
	
    // if($$(".expandablel")){
    // 	var expLinks=$$(".expandablel");
    // 	for(var i=0; i<expLinks.length;i++){
    // 	    expLinks[i].onclick=toggleDiv;
    // 	}
    // }
	
    // if($$(".alltoggle")){
    // 	var expLinks=$$(".alltoggle");
    // 	for(var i=0; i<expLinks.length;i++){
    // 	    expLinks[i].onclick=toggleAllDivs;
    // 	}
    // }

}

