TRUE_THETA_PATH='';
OBSERVATION_PATH='';
INSTRUCTION_PATH='';
LESSON_SETTINGS_PATH='';
GLOBAL_SETTINGS_FILE='lessons/settings.json';
GLOBAL_SETTINGS={};
LESSON_SETTINGS={};

KNOWN_USER_ACTIONS={};

loader_bar_img='imgs/ajax-bar-loader.gif';
LOADING_TIME_DELAY = 200;
has_cheated=0;
SLIDER_DIV=1; //amount to scale slider by (for display)

SHAPE_DICTIONARY=createShapeDictionary();

CURRENT_LESSON=1;
MAX_LESSONS=18;
DIR_MAPPER={};

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

LAST_UPDATED_TOKEN_COUNT={}; //null;

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
    LAST_UPDATED_TOKEN_COUNT= {}; //null;
}

max_prob=1;

//load current lesson
function load_lesson(noskip_dropdown){
    loading_object = new do_all_loading().start_timer();
    show_text_portion();
    show_data_portion();
    console.log("loading " + CURRENT_LESSON + ' => ' + DIR_MAPPER[CURRENT_LESSON]);
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
    } else{
	INITIAL_LOAD=0;
    }

    var dmcl = DIR_MAPPER[CURRENT_LESSON];
    LESSON_SETTINGS_PATH = 'lessons/'+dmcl+'/settings.json';
    TRUE_THETA_PATH = 'lessons/'+dmcl+'/theta';
    OBSERVATION_PATH = 'lessons/'+dmcl+'/observations';    
    INSTRUCTION_PATH = 'lessons/'+dmcl+'/instructions.html';

    loading_object.start();
    document.title = 'Log-Linear Models: Lesson '+CURRENT_LESSON;

    history.pushState({CURRENT_LESSON:CURRENT_LESSON},'','#'+CURRENT_LESSON);
    var j_jump_to_lesson_select=jQuery('#jump_to_lesson_select');
    j_jump_to_lesson_select.val(CURRENT_LESSON);
    if(!noskip_dropdown && !j_jump_to_lesson_select.is(":visible")){
	safe_dropdown_view_change(jQuery(".dropdown dd ul li#dropdown_lessondrop_" + CURRENT_LESSON));
    }
    verify_prev_next();
}

function apply_settings(){
    KNOWN_USER_ACTIONS.revert_settings();
    var set = [GLOBAL_SETTINGS, LESSON_SETTINGS];
    var keyset = {};
    var listset = {};
    for(var si=0;si<set.length;si++){
	var currset = set[si];
	for(var key in currset){
	    if(!(key in KNOWN_USER_ACTIONS)){
		continue;
	    }
	    var tks = keyset[key];
	    if(!tks){ 
		tks=[];
	    }
	    if(!listset[key]){
		listset[key]={};
	    }
	    tks=[key,si];
	    keyset[key] = tks;
	    for(var k in currset[key].list){
		listset[key][""+k] = currset[key]['list'][k];
	    }
	}
    }
    for(var key in keyset){
	var val = keyset[key];
	var currset = set[val[1]];
	var cs_k_l = listset[key]; 
	for(var k in cs_k_l){
	    var jqobj = jQuery(k);
	    if("attr" in currset[key]){
		if(is_empty(jqobj.attr(currset[key]["attr"]))){
		    jqobj.attr(currset[key]["attr"]+"", ""+cs_k_l[k]);
		}
	    }
	    KNOWN_USER_ACTIONS.do_action(currset, key,jqobj);
	}
    }
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
    KNOWN_USER_ACTIONS = createKnownUserActions();
    jQuery.ajax({
	url:GLOBAL_SETTINGS_FILE,
	datatype:"json",
	success : function(settings){
	    var ord = settings["lesson_order"];
	    for(var i=0;i<ord.length;i++){
		DIR_MAPPER[i+1]=ord[i];
	    }
	    MAX_LESSONS=ord.length;
	    GLOBAL_SETTINGS=settings;
	},
	error : function(jqXHR, textStatus, errorThrown){
	    if(jqXHR.status == 404){
		console.error("But don't worry, this 404 is allowed.");
		LESSON_SETTINGS={};
	    } else{
		console.log(jqXHR);
		console.log(textStatus);
		console.log(errorThrown);
		console.log('--------------');
		print_loading_error(jqXHR, textStatus, errorThrown);
	    }
	    for(var i=1;i<=MAX_LESSONS;i++){
		DIR_MAPPER[i]=i;
	    }
	},
	complete : function(){
	    init();
	}
    });
}

function init(){
    var group;
    $('ll_area').style.width = (DIV_LL_WIDTH+RESERVE_LL_WIDTH)+'px';
    $$('.of_total_lessons').forEach(function(e){e.innerHTML=MAX_LESSONS;});
    // if(parseInt($('header_lesson_number').getAttribute('lesson')) != 0){
    // 	CURRENT_LESSON=parseInt($('header_lesson_number').getAttribute('lesson'));
    // }

    if($('next_lesson') && $('prev_lesson')){
	$('next_lesson').onclick=function(){
	    CURRENT_LESSON++;
	    load_lesson();
	    this.verify();
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
    }

    if(window.onhashchange()<0){
	load_lesson();
    }

    //add listeners for "jump to lesson" select
    jQuery('#lesson_title_words').click(function(){
	jQuery('#jump_to_lesson_select').trigger('mousedown');
	jQuery('#jump_to_lesson_select').trigger('click');
    });

    create_lesson_dropdown();
    

    /*if($('change_num_tokens_form')){
	$('change_num_tokens_form').style.display='none';
	$('done_changing_counts_button').onclick=function(){
	    $('change_num_tokens_form').style.display='none';
	    $('slider_area').style.display='block';
	    $('change_num_tokens').disabled='';
	    generate_new_observations();
	};
	}*/

    jQuery('#new_counts').click(function(){
	//disable a bunch of buttons...
	for(var c=0;c<CONTEXTS.length;c++){
	    if(USED_CONTEXTS[c]){
		var v = $('num_tokens_context_'+c).value;
		v= isNumber(v)?parseFloat(v):-1;
		//don't do the following when v == NUM_TOKENS_C[c]
		console.log("v = "+v);
		if(LAST_UPDATED_TOKEN_COUNT[c] || 
		   LAST_UPDATED_TOKEN_COUNT == {})
		    generate_new_counts_context(c,v);
	    }
	}
	jQuery('.num_tokens_context_input').css('background-color','');
	jQuery(this).css('background-color','');
    });
    $('new_counts').disabled='disabled';


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

    

    jQuery('#new_challenge').click(function(){
	jQuery('#step_button').attr('disabled','disabled');
	jQuery('#solve_button').attr("disabled",'disabled');
    	var gs=jQuery('#gradient_step');
    	gs.val(ORIG_SOLVE_STEP);
    	gs.change();
    	SOLVE_ITERATION=1;
	LAST_UPDATED_TOKEN_COUNT={};//null;
    	generate_new_observations();
	this.blur();
	if(has_cheated){
	    $('cheat_button').style.display='block';
	    jQuery.each(jQuery('.unused_feature'), function(x){
		x.style.display='none';
	    });
    	    var llb=jQuery('#ll_bars');
    	    var th=parseFloat(llb.attr('height'));
    	    llb.attr('height',(th-1)/2);
	    has_cheated=0;
	}
    });


    if($$('.expected_counts_text')){
	$$('.expected_counts_text').forEach(function(e){
		e.style.color = EXPECTED_COUNT_COLOR;
	    });
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

    jQuery("#zero_weights_button").click(function(){  
    	var group = $$('.feature_slider');
    	var arr = group.map(function(d,i){
    	    var tindex = group[i].parentNode.parentNode.childNodes[0].getAttribute('theta_index');
    	    return [tindex,0];
    	});
    	reset_sliders_manually(arr);
    	redraw_all();
    });

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
}

