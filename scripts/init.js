TRUE_THETA_PATH='';
OBSERVATION_PATH='';
has_cheated=0;
SLIDER_DIV=1; //amount to scale slider by (for display)

CURRENT_LESSON=1;
MAX_LESSONS=4;

TYPE_INDEX=[]; //type-string -> type-id, e.g., "circle,solid" -> 12
TYPE_MAP={}; //reverse of above

CONTEXTS=[]; //ids -> names, e.g., 0 -> circle
REVERSE_CONTEXTS={};//reverse of above, e.g., circle -> 0

VISUALS=[];

//context-id -> Associative Array of counts, e.g., 0 -> {4=>3, 1=>12,..}
COUNTS=[];
POSITIONS=[];
REVERSE_POSITIONS={};

//context_id -> associative array
DATA_BY_CONTEXT=[];

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
INVERSE_THETA_MAP={};
TRUE_THETA=[];

//feature ID number -> float
GRADIENT=[];
OBS_FEAT_COUNT=[];
EXP_FEAT_COUNT=[];
REG_FOR_GRAD=[];

SOLVE_STEP=0.001;
ORIG_SOLVE_STEP=SOLVE_STEP;
SHOW_GRADIENTS=0;
DISPLAY_GRADIENT_COMPONENTS=0;
SOLVE_ITERATION=1;
SOLVE_TIMEOUT_ID={};
SOLVE_TIME_DELAY=750; //in milliseconds
STOPPING_EPS=0.001;
MAX_SOLVE_ITERATIONS = 10;

SVG_WIDTH=100; SVG_HEIGHT=100;

DIV_LL_WIDTH=800;
RESERVE_LL_WIDTH=100;
worst_ll=2;
LOG_LIKELIHOOD=[0];
REGULARIZATION=[0];
TRUE_LOG_LIKELIHOOD = [0];
TRUE_REGULARIZATION=[0];
USE_REGULARIZATION=0;
REGULARIZATION_EXPONENT=2;
REGULARIZATION_SIGMA2=1.0;

EXPECTED_TRANSPARENCY=0.4;
EXPECTED_STROKE_WIDTH=3;

COUNTS_TOO_LOW='red';
COUNTS_TOO_HIGH='blue';
COUNTS_EQUAL='gray';

slider_min= -2* Math.E;
slider_max= 2*Math.E;
slider_step = 0.00001;

gradients_drawn = 0;
GRAD_LOW_C='#334455';
GRAD_HIGH_C='#AA03FF';
slider_width = 155;
handle_width = 12;
sigmoid_y_define_constant = 7.0/8.0; //ratio
sigmoid_x_define_constant = 1.0; 
SIGMOID_CONSTANT = 1/sigmoid_x_define_constant * Math.log(sigmoid_y_define_constant/(1-sigmoid_y_define_constant));

initialize=1;
svg_loaded=0;

function isNumber(n) {
    return (n==null || n==undefined || !(n.length)) || 
	(!isNaN(parseFloat(n)) && isFinite(n));
}

function sigmoid_transform(x){
    return slider_width/(1+Math.pow(Math.E,-SIGMOID_CONSTANT*Math.E));
}
function inverse_sigmoid(x){
    var ret= -1/SIGMOID_CONSTANT * Math.log(slider_width/x - 1);
    return ret;
}

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
	NUM_TOKENS=0; //the number of *token* observations
	NUM_TOKENS_C=[];//the number of *tokens* observations by context		
    }
	//context-id -> Associative Array of counts, e.g., 0 -> {4=>3, 1=>12,..}
    COUNTS=[];
    POSITIONS=[];
    REVERSE_POSITIONS={};
    USED_FEATURES={};
    //context_id -> associative array
    DATA_BY_CONTEXT=[];

    Z_THETA=[];
    TRUE_Z_THETA=[];

    THETA=[];
    INVERSE_THETA_MAP={};
    TRUE_THETA=[];

    //feature ID number -> float
    GRADIENT=[];
    OBS_FEAT_COUNT=[];
    EXP_FEAT_COUNT=[];
    REG_FOR_GRAD=[];

    SOLVE_STEP=0.001;
    ORIG_SOLVE_STEP=SOLVE_STEP;
    SHOW_GRADIENTS=0;
    DISPLAY_GRADIENT_COMPONENTS=0;
    SOLVE_ITERATION=1;
    SOLVE_TIMEOUT_ID={};
    STOPPING_EPS=0.001;

    worst_ll=2;
    LOG_LIKELIHOOD=[0];
    REGULARIZATION=[0];
    TRUE_LOG_LIKELIHOOD = [0];
    TRUE_REGULARIZATION=[0];
    USE_REGULARIZATION=0;
    REGULARIZATION_EXPONENT=2;
    REGULARIZATION_SIGMA2=1.0;

    EXPECTED_TRANSPARENCY=0.4;
    EXPECTED_STROKE_WIDTH=3;

    gradients_drawn = 0;

    svg_loaded=0;
}

//load current lesson
function load_lesson(initial){
    $('header_lesson_number').innerHTML=CURRENT_LESSON;
    $('show_how_many_previous_lessons').innerHTML = Math.max(1,CURRENT_LESSON-1);
    $('show_how_many_next_lessons').innerHTML = Math.min(CURRENT_LESSON+1,MAX_LESSONS);
    reset_data_structures(1);
    if(!initial){
	//remove a bunch of nodes...
	jQuery('#draw_area').empty();
	jQuery('#ll_area').empty();
	jQuery('#feature_table').empty();
	//redisplay some things...
	$('cheat_button').style.display="block";
    }
    TRUE_THETA_PATH = 'lessons/'+CURRENT_LESSON+'/theta';
    OBSERVATION_PATH = 'lessons/'+CURRENT_LESSON+'/observations';
    //huge function that loads data
    //and features
    load_textfile();
}

window.onload = function(){
    var group;
    $('ll_area').style.width = (DIV_LL_WIDTH+RESERVE_LL_WIDTH)+'px';
    $$('.of_total_lessons').forEach(function(e){e.innerHTML=MAX_LESSONS;});
    load_lesson(1);

    if($('new_challenge')){
    	$('new_challenge').onclick = function(){
    	    var gs=$('gradient_step');
    	    gs.value = ORIG_SOLVE_STEP;
    	    gs.onchange();
    	    SOLVE_ITERATION=1;
    	    generate_new_observations();
    	};
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
    		var th=llb.getAttribute('height');
    		console.log(th);
    		llb.setAttribute('height',2*th+1);
    		has_cheated=1;
    		$('cheat_button').style.display='none';
    	    }
    	};
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
    	}
    }	

    if($('step_button')){
    	$('step_button').onclick = function(){
    	    step_gradient();
    	};
    }

    if($('solve_button')){
    	$('solve_button').onclick = function(){
    	    SOLVE_ITERATION=0;
    	    $('solve_button').disabled="disabled";
	    $('gradient_step').value=scale_gamma_for_solve(SOLVE_STEP,1).toPrecision(5);
    	    SOLVE_TIMEOUT_ID = setInterval(function(){
    		    solve_puzzle(SOLVE_STEP,++SOLVE_ITERATION, SOLVE_STEP);
    		}, SOLVE_TIME_DELAY);
    	};
    }

    if($('show_gradients')){
    	$('show_gradients').onclick = function(){
    	    $('gradient_fieldset_div').style.display= this.checked ? 'block' : 'none';
    	    SHOW_GRADIENTS=this.checked;
    	    if(SHOW_GRADIENTS){
    		group=$$('.component_radio'); var t;
    		for(var i=0;i<group.length;i++){
    		    if(group[i].checked){
    			t=group[i];
    			break;
    		    }
    		}
    		t.onclick();
    		recompute_partition_function();
    		compute_gradient();
    		draw_gradient();
    	    } else{
    		recompute_partition_function();
    		compute_gradient();
    		draw_gradient();
    	    }
    	};
    }

    if(group=$$('.component_radio')){
    	for(var i=0;i<group.length;i++){
    	    group[i].onclick = setComponentDisplay;
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

    if($('sigma2text')){
    	$('sigma2text').onchange = function(){
    	    if(isNumber(this.value)){
    		REGULARIZATION_SIGMA2=(this.value - 0);		
    		if(svg_loaded){
    		    redraw_all();
    		    console.log(REGULARIZATION);
    		    console.log(TRUE_REGULARIZATION);
    		} else{
    		    recompute_partition_function_single();
    		    compute_gradient();
    		    draw_gradient();
    		}
    	    } else{
    		//ZZZ !!!
    		alert('not a proper number. yell at creator for making this an alert');
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

