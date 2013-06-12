TRUE_THETA_PATH='';
OBSERVATION_PATH='';
INSTRUCTION_PATH='';
LESSON_SETTINGS_PATH='';
GLOBAL_SETTINGS_FILE='lessons/settings.json';
GLOBAL_SETTINGS={};
LESSON_SETTINGS={};

KNOWN_USER_ACTIONS={};

HISTORY={};

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
THETA_POSITION_BY_CONTEXT=[];
POSITION_BY_CONTEXT=[];
POSITIONS=[];
REVERSE_POSITIONS={};

//context_id -> associative array
DATA_BY_CONTEXT=[];

LAST_UPDATED_TOKEN_COUNT={}; //null;

USED_CONTEXTS={};
USED_FEATURES={};

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
MAX_THETA_ROWS=100; MAX_THETA_COLS=4;
FEATURE_POS_UNDEFINED=false;
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

TRUE_MODEL_COLOR='#077D0E'; //'#075C0E'; //'#11EE23';

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
		    if(x>this.amp) x=this.amp;
		return -1/this.sconst * Math.log(this.amp/x - 1) + this.hmove;
	    }});
}

var SLIDER_SIGMOID = get_sigmoid(slider_width-handle_width, 0, Math.sqrt(2), 7.0/8.0);
var LL_SIGMOID;

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

	FEATURE_POS_UNDEFINED=false;	
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
    jQuery('#show_how_many_previous_lessons').html(Math.max(1,CURRENT_LESSON-1));
    jQuery('#show_how_many_next_lessons').html(Math.min(CURRENT_LESSON+1,MAX_LESSONS));
    reset_data_structures(1);
    if(!INITIAL_LOAD){
	//remove a bunch of nodes...
	jQuery('#draw_area').empty();
	jQuery('#ll_area').empty();
	jQuery('#feature_table').empty();
	//redisplay some things...
	jQuery('#cheat_button').css('display',"none");
	jQuery('#new_counts').attr("disabled","disabled");
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
    HISTORY.pushState({CURRENT_LESSON:CURRENT_LESSON},'','#'+CURRENT_LESSON);
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
		jQuery('#solve_button').click();
	    }
	}
    }( times, 0, 0 );
    SOLVE_TIMEOUT_ID=window.setTimeout( internalCallback, init_time/Math.sqrt(10) );
};

window.onload = function(){
    KNOWN_USER_ACTIONS = createKnownUserActions();
    
    HISTORY = history;

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
	    console.log("Going to init....");
	    init();
	}
    });
}

function init(){
    detect_support();
    var group;
    jQuery('#ll_area').css("width", DIV_LL_WIDTH+RESERVE_LL_WIDTH);
    jQuery('.of_total_lessons').each(function(i){jQuery(this).html(MAX_LESSONS);});

    jQuery('#next_lesson').click(function(){
	CURRENT_LESSON++;
	load_lesson();
	jQuery(this).trigger('verify');
    })
	.bind('verify',function(){
	    if(CURRENT_LESSON==MAX_LESSONS){
		this.disabled="disabled";
	    }
	    if(CURRENT_LESSON<MAX_LESSONS){
		jQuery('#next_lesson').removeAttr("disabled");
	    }
	});
    jQuery('#prev_lesson').click(function(){
	CURRENT_LESSON--;
	jQuery('#next_lesson').trigger('verify');
	load_lesson();
    }).bind('verify',function(){
	if(CURRENT_LESSON!=1){
	    this.disabled="";
	}
	if(CURRENT_LESSON==1){
	    this.disabled='disabled';
	}
    });

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
		var v = jQuery('#num_tokens_context_'+c).val();
		v= isNumber(v)?parseFloat(v):-1;
		console.log("v = " + v);
		//don't do the following when v == NUM_TOKENS_C[c]
		//why again?
		// if(LAST_UPDATED_TOKEN_COUNT[c] || 
		//    LAST_UPDATED_TOKEN_COUNT == {})
		generate_new_counts_context(c,v);
	    }
	}
	jQuery('.num_tokens_context_input').css('background-color','');
	jQuery(this).css('background-color','');
    });
    jQuery('#new_counts').attr("disabled",'disabled');

    //I'm pretty sure this is dead code, but let me test it some...
    jQuery('#change_num_tokens').click(function(){
	//should it be eq(0)?
	var form=jQuery('#change_num_tokens_form').css('display','block').children().eq(1);
	jQuery('#slider_area').css('display','none');
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
		form.append(jQuery(d));
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
		    form.append(jQuery(d));
		    i.onchange=update_token_count;
		}
	    }
	    user_input_tokens_added=1;
	}
	jQuery('#done_changing_counts_button').css('display','block');
    });

    jQuery('#new_challenge').click(function(){
	var old_hc=has_cheated;
	jQuery('#step_button').attr('disabled','disabled');
	jQuery('#solve_button').attr("disabled",'disabled');
    	var gs=jQuery('#gradient_step');
    	gs.val(ORIG_SOLVE_STEP);
    	gs.change();
    	SOLVE_ITERATION=1;
	LAST_UPDATED_TOKEN_COUNT={};//null;
    	generate_new_observations();
	this.blur();
	if(old_hc){
	    jQuery('#cheat_button').css('display','block');
	    jQuery('.unused_feature').each(function(i){
		this.style.display='none';
	    });
    	    var llb=jQuery('#ll_bars');
    	    var th=parseFloat(llb.attr('height'));
    	    llb.attr('height',(th-1)/2);
	    has_cheated=0;
	}
    });

    jQuery('.expected_counts_text').each(function(i){
	this.style.color = EXPECTED_COUNT_COLOR;
    });
    
    jQuery('#cheat_button').click(function(){
    	if(!has_cheated){
    	    var llb=jQuery('#ll_bars');
    	    var th=parseFloat(llb.attr('height'));
    	    llb.attr('height',2*th+1);
    	    has_cheated=1;
    	    jQuery('#cheat_button').css('display','none');
	    draw_gradient();
	    jQuery('.unused_feature').each(function(i){
		this.style.display='block';
	    });
    	}
    }).css('display','none');

    jQuery('#delay_normalization').click(function(){
    	//this.disabled = this.disabled=="disabled"?"":"disabled";
    	//this.checked=false
    });

    jQuery("#zero_weights_button").click(function(){  
    	var arr = jQuery('.feature_slider').map(function(i){
    	    var tindex = this.parentNode.parentNode.childNodes[0].getAttribute('theta_index');
    	    return [[tindex,0]];
    	});
    	reset_sliders_manually(arr);
    	redraw_all();
    });

    jQuery('input.regularization_radio').each(function(i){
    	if(this.value != "0"){
    	    jQuery(this).click(function(){
    		jQuery('#sigma2area').css('display','block');
    		REGULARIZATION_EXPONENT=parseFloat(this.value);
    		USE_REGULARIZATION=1;
    		if(svg_loaded){
    		    redraw_all();
    		}
    	    });		    
    	} else{
    	    jQuery(this).click(function(i){
    		jQuery('#sigma2area').css('display','none');
    		USE_REGULARIZATION=0;
    		for(var i=0;i<REGULARIZATION.length;i++){
    		    REGULARIZATION[i]=TRUE_REGULARIZATION[i]=0;
    		}
    		if(svg_loaded){
    		    redraw_all();
    		}
    	    });
    	}
	if(this.checked){
	    jQuery(this).click();
	}
    });

    jQuery('#step_button').click(function(){
    	step_gradient();
    });

    jQuery('#stop_solving').click(function(){
	clearInterval(SOLVE_TIMEOUT_ID);
	jQuery('#stop_solving_div').css('display','none');
	jQuery('#solve_button,#step_button').removeAttr('disabled');
	jQuery('#next_lesson,#prev_lesson').removeAttr("disabled")
	    .trigger('verify');
	//$('change_num_tokens').disabled="";
	jQuery('#gradient_step').val(orig_step_size.toPrecision(5))
	    .change();
	jQuery(this).blur();
    });
    jQuery('#stop_solving_div').css('display','none');

    jQuery('#solve_button').click(function(){
    	SOLVE_ITERATION=0;
	if(in_solving){
	    clearInterval(SOLVE_TIMEOUT_ID);
	    in_solving=0;
	    this.style.backgroundColor=button_color;
	    //orig_solve_step
	    jQuery('#gradient_step').val(SOLVE_STEP.toPrecision(5));
	    this.innerHTML="Solve";
	    jQuery('#step_button,#next_lesson,#prev_lesson').removeAttr("disabled");
	    jQuery('#next_lesson,#prev_lesson').trigger('verify');
	    //$('change_num_tokens').disabled="";
	    jQuery('#gradient_step').change();
	} else{
	    if(USE_REGULARIZATION){
		jQuery('#regularization_constant').change();
	    }
	    if(SOLVE_STEP==0)
		return;
	    in_solving=1;
	    button_color=this.style.backgroundColor;
	    this.style.backgroundColor='red';
	    this.innerHTML="Stop";
	    jQuery('#step_button,#next_lesson,#prev_lesson').attr("disabled","disabled");
	    jQuery('#gradient_step').val(scale_gamma_for_solve(SOLVE_STEP,1).toPrecision(5));
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
	    jQuery(this).blur();
	}
    });

    jQuery('#show_gradient').click(function(){
    	SHOW_GRADIENTS=this.checked;
	display_gradient_hints_portions();
	if(!in_solving){
    	    if(SHOW_GRADIENTS){
    		recompute_partition_function();
    		compute_gradient();
    	    } else{
    		recompute_partition_function();
    		compute_gradient();
    	    }
	}
    });
    jQuery('#show_gradient:checked').click();


    jQuery('#gradient_step')
	.focus(function(){
	    jQuery(this).attr("previous",this.value-0);
	})
	.change(function(){
    	    if(isNumber(this.value)){	
		this.setAttribute("previous", this.value-0);
    		SOLVE_STEP=(this.value - 0);		
    	    } else{
    		this.value = getAttribute("previous");
    		//display error
    	    }
	})
	.val(SOLVE_STEP);
    
    
    jQuery('#regularization_constant')
	.focus(function(){
	    jQuery(this).attr("previous",this.value-0);
	})
	.change(function(){
    	    if(isNumber(this.value)){
    		REGULARIZATION_SIGMA2=(this.value - 0);		
		this.setAttribute("previous", this.value-0);
    		if(svg_loaded){
    		    redraw_all();
		} else{
    		    recompute_partition_function_single();
    		    compute_gradient();
    		    draw_gradient();
    		}
    	    } else{
    		this.value = getAttribute("previous");    		
    		//display error
    	    }
	});
}

