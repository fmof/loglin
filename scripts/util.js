//but new structure is
//that boxid is the actual slider range/text...
function load_html5_slider(boxid,val){
    val = val || slider_step;
    return function(batch){
	var actual_weight = boxid.value / val;
	var feature_info = boxid.parentNode.parentNode.childNodes[0];
	feature_info.setAttribute('dirty',1);
	if(svg_loaded){
	    //get feature index by boxid.parentVal.childNodes[0
	    var context =  parseInt(feature_info.getAttribute('context'));
	    var feature_name = feature_info.getAttribute('feature_name').split(',')[1];
	    var feat_name = INVERSE_FEATURE_LIST[ [CONTEXTS[context],feature_name] ];
	    var old_theta = THETA[feat_name];
	    //store THETA value
	    THETA[feat_name]=actual_weight;
	    redraw_all();
	} else{
	    feature_info.className+=' feature_name_box';
	}
    };
}

function get_handle(slider_value_box){
    return slider_value_box.parentNode.childNodes[0].childNodes[1];
}

//REQUIRES: svg_loaded=1
function redraw_all(){
    if(!svg_loaded){return;}
    recompute_partition_function();
    recompute_expected_counts();
    redrawAllExpected();
    compute_ll();
    compute_ll(TRUE_THETA,TRUE_Z_THETA,TRUE_LOG_LIKELIHOOD,TRUE_REGULARIZATION);
    updateLLBar();
    compute_gradient();   
}

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

function generate_new_observations(){
    TRUE_Z_THETA=TRUE_Z_THETA.map(function(d){
	    return d-d;});
    for(var l=0;l<FEATURE_LIST.length;l++){
	TRUE_THETA[l] = normal(0,0.5).sample();
    }
    console.log("TRUE THETA:: ");
    console.log(TRUE_THETA);
    recompute_partition_function(TRUE_THETA,TRUE_Z_THETA);
    sample_from_true();
}


function sample_from_true(num_times){
    var num_times=num_times || NUM_TOKENS || 500;
    //first lay-out each type along the unit interval
    var a=enumerate_possible_types();
    console.log(a);
    /*    var s = []; var prev=0; var ncounts = a[2];
    for(var i=0;i<a[0].length;i++){
	s[i]=a[0][i]+prev;
	prev=s[i];

    }
    var dtr=[];
    for(var i = 0;i<num_times;i++){
	var n=Math.random();
	var j=0;
	while(n > s[j] && (j++)<s.length){}
	var t=a[1][j];
	ncounts[t]++;
    }
    for(var type_tuple in ncounts){
	var o={};
	var sk = type_tuple.split(',');
	for(var i=0;i<sk.length;i++){
	    o[KEYS_TO_CARE_ABOUT[i]] = REVDIM[i][sk[i]];
	}
	o['count']=ncounts[type_tuple];
	dtr.push(o);
    }
    //clear various arrays...
    reset_data_structures();*/
    //handle_data(dtr,1);
}

function enumerate_possible_types(begin){
    var begin=begin || 0;
    var arr =[]; var l0, l1; var b=[]; var ncounts={};
    for(var i=0;i<REVDIM[0].length;i++){
	l0=TRUE_THETA[INVERSE_FEATURE_LIST[[0,i]]];
	for(var j=0;j<REVDIM[1].length;j++){
	    l1=TRUE_THETA[INVERSE_FEATURE_LIST[[1,j]]];;
	    for(var k=0;k<REVDIM[2].length;k++){
		arr.push(Math.exp(l0+l1+TRUE_THETA[INVERSE_FEATURE_LIST[[2,k]]]));
		var c=[]; c[0]=i; c[1]=j; c[2]=k;
		b.push(c);
		ncounts[c]=0;
	    }
	}
    }
    console.log(arr);
    var msum=sum(arr);
    return [arr.map(function(n){ return n/msum;}), b, ncounts];
}

function load_textfile(){
    //initially, this is null...
    for(var l=0;l<FEATURE_LIST.length;l++){
	THETA[l]=0; TRUE_THETA[l]=0;
    }
    d3.tsv(TRUE_THETA_PATH,function(rows){
	    rows.forEach(function(record){ 
		    var context_id;
		    if(REVERSE_CONTEXTS[record['context']] == undefined){
			CONTEXTS.push(record['context']);
			context_id = CONTEXTS.length-1;
			NUM_TOKENS_C[context_id]=0;
			NUM_OBSERVATIONS_C[context_id]=0;
			REVERSE_CONTEXTS[record['context']]=context_id;
			DATA_BY_CONTEXT[context_id]={};
			TYPE_OBSERVATIONS_IN_C[context_id]=[];
		    } else{
			context_id = REVERSE_CONTEXTS[record['context']];
		    }
		    //add record['feature'] to theta list
		    FEATURE_LIST.push([record['context'],record['feature']]);
		    var feature_number = FEATURE_LIST.length -1;
		    INVERSE_FEATURE_LIST[[record['context'],record['feature']]]=feature_number;
		    TRUE_THETA[feature_number]=parseFloat(record['value']);
		    THETA[feature_number]=initializeThetaValue();
		    GRADIENT[feature_number]=0;
		    OBS_FEAT_COUNT[feature_number]=0;
		    EXP_FEAT_COUNT[feature_number]=0;
		    REG_FOR_GRAD[feature_number]=0;
		});
	    d3.tsv(OBSERVATION_PATH,function(rows){
		    record_data(rows,0);
		});
});
}

//rows is array of associative arrays
function record_data(rows,already_created){
    if(already_created){
	console.log('adding new data!!!');
    }
    rows.forEach(function(record) {
	    if(already_created){
	    }
	    record_observation(record);
	});
    if(!already_created){
    	addFeaturesToList($("feature_table"),FEATURE_LIST);
    	addSliderEffects();
    } else{
    	$$(".feature_slider").forEach(function(t){t.onchange();});
    }
    recompute_partition_function(THETA,Z_THETA);
    console.log(Z_THETA);
    //draw the data here!
    if(!already_created){
    	drawSVGBoxes($("draw_area"));
    } else{
    	updateObservedImages();
    }
    svg_loaded=1;
    //compute the true partition function
    recompute_partition_function(TRUE_THETA,TRUE_Z_THETA);
    //compute expected counts
    recompute_expected_counts();
    //so that we can draw in the expected images
    redrawAllExpected();
    //and, more importantly, the loglikelihood score bar
    compute_ll();
    compute_ll(TRUE_THETA,TRUE_Z_THETA,TRUE_LOG_LIKELIHOOD, TRUE_REGULARIZATION);
    compute_gradient();
    /*console.log('gradient is ');
    console.log(GRADIENT);	 
    console.log(OBS_FEAT_COUNT);
    console.log(EXP_FEAT_COUNT);
    console.log(REG_FOR_GRAD);*/
    
    if(!already_created){
     	addLLBar();
    } else{
    	updateLLBar();
    }
}

function record_observation(record){
    var features = record['features'];
    var split_features =features.split(',');
    var type_index;
    if(TYPE_MAP[features]==undefined){
	TYPE_INDEX.push(split_features);
	type_index=TYPE_INDEX.length -1;
	TYPE_MAP[split_features]=type_index;
    } else{
	type_index = TYPE_MAP[features];
    }
    var context_id;
    if(REVERSE_CONTEXTS[record['context']] == undefined){
	CONTEXTS.push(record['context']);
	context_id = CONTEXTS.length-1;
	NUM_TOKENS_C[context_id]=0;
	NUM_OBSERVATIONS_C[context_id]=0;
	REVERSE_CONTEXTS[record['context']]=context_id;
	DATA_BY_CONTEXT[context_id]={};
	//ZZZ: how to deal with position vector
    } else{
	context_id = REVERSE_CONTEXTS[record['context']];
    }
    DATA_BY_CONTEXT[context_id][type_index]=split_features;
    //go through feature list and initialize any features not yet seen
    //ZZZ

    //updated USED_FEATURES list
    for(var sf=0;sf<split_features.length;sf++){
	var ifl=INVERSE_FEATURE_LOOKUP(context_id,split_features[sf]);
	if(ifl>=0){
	    USED_FEATURES[ifl]=1;
	}
    }

    //update counts, both observed and expected
    var temp_counts = COUNTS[context_id];
    if(!temp_counts){ temp_counts={};}
    var count=parseFloat(record['count']);
    temp_counts[type_index]=count;
    COUNTS[context_id]=temp_counts;
    var temp_ecounts = EXPECTED_COUNTS[context_id];
    if(!temp_ecounts){ temp_ecounts={};}
    temp_ecounts[type_index]=0;
    EXPECTED_COUNTS[context_id]=temp_ecounts;

    NUM_TOKENS+=count;
    NUM_TOKENS_C[context_id] += count;
    NUM_OBSERVATIONS++;
    NUM_OBSERVATIONS_C[context_id]++;
    TYPE_OBSERVATIONS_IN_C[context_id].push(type_index);

    //now deal with positions
    var temp_pos=(d3.csv.parseRows(record['position'])[0]).map(function(d){return parseInt(d);});
    //POSITION_BY_CONTEXT[context_id][
    REVERSE_POSITIONS[temp_pos] = features.split(',');
    POSITIONS.push(temp_pos);
    MAX_ROWS = temp_pos[0]>=MAX_ROWS?temp_pos[0]+1:MAX_ROWS;
    MAX_COLS = temp_pos[1]>=MAX_COLS?temp_pos[1]+1:MAX_COLS;
    var temp_vis = VISUALS[context_id];
    if(!temp_vis){ temp_vis={};}
    temp_vis[type_index]=
	(function(d){
	    var r={};
	    for(var i=0;i<d.length;i++){
		var sa=d[i].split('=');
		r[sa[0]]=sa[1];
	    }
	    return r;
	})(d3.csv.parseRows(record['visualization'])[0]);
    VISUALS[context_id]=temp_vis;
}


function initializeThetaValue(){
    if(initialize==-1){
	return normal(0,1).sample();
    } else if(initialize==-2){
	return ((Math.random()>.5)?1:-1)*10*Math.random();
    }else {
	return initialize;
    }
}


function addSliderEffects(){
    var group=jQuery(".feature_slider");
    group.rangeinput();
    if(group=$$(".feature_slider")){
	for(var i=0;i<group.length;i++){
	    var tmpfn=load_html5_slider(group[i],SLIDER_DIV);
	    group[i].onchange = tmpfn;
	    group[i].parentNode.childNodes[0].childNodes[1].ondrag=tmpfn;
	    group[i].onchange();
	    var theta_index = group[i].parentNode.parentNode.childNodes[0].getAttribute('theta_index');
	    if(USED_FEATURES[theta_index]==undefined){//is unused/unavailable
		group[i].parentNode.parentNode.style.display='none';
	    }
	}
    }
}


function recompute_partition_function(theta,ztheta){
    var ttheta=theta;
    theta=theta || THETA;
    ztheta=ztheta || Z_THETA;
    //iterate through contexts
    for(var c=0;c<CONTEXTS.length;c++){
	//iterate through type observations of context c
	var tz=0;
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	for(var i=0;i<obs_in_c.length;i++){
	    tz+=get_prob(c,obs_in_c[i],0,theta);
	}
	ztheta[c]=tz;
    }
    return ztheta;
}

function formatExpected(ecp){
    return (ecp > 1.0)?Math.round(ecp):ecp.toFixed(2);
}

function recompute_expected_counts(){
    for(var c=0;c<CONTEXTS.length;c++){
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	//go through type IDs
	for(var i=0;i<obs_in_c.length;i++){
	    var id_num = obs_in_c[i];
	    var p=$('exp_count_text_'+id_num); var ecp=get_expected_count(c,id_num);
	    p.innerHTML =  formatExpected(ecp);
	    EXPECTED_COUNTS[c][id_num]=ecp;
	    var obs_count = COUNTS[c][id_num];
	    var color=obs_count>ecp?COUNTS_TOO_LOW:(obs_count<ecp?COUNTS_TOO_HIGH:COUNTS_EQUAL);
	    p.style.color=color;
	    p.setAttribute('dirty',0);
	    p.setAttribute('value',ecp);
	}
    }
}

function theta_to_pixel(theta){
    return slider_width/(slider_max-slider_min) * (theta - slider_min);
}

function reset_sliders_manually(arr){
    var group = $$('.feature_slider');
    for(var i=0;i<group.length;i++){
	group[i].value = arr[i][1];
	var val=theta_to_pixel(arr[i][1]);
	val=Math.max(0,Math.min(val,slider_width));
	get_handle(group[i]).style.left = val+'px';
	THETA[arr[i][0]]=parseFloat(arr[i][1]);
    }
}

function step_gradient(solve_step){
    var solve_step=solve_step || SOLVE_STEP;
    var all_zero=0;
    var group = $$('.feature_slider');
    var arr = group.map(function(d,i){
	    var tindex = group[i].parentNode.parentNode.childNodes[0].getAttribute('theta_index');
	    return [tindex,THETA[tindex] + solve_step*GRADIENT[tindex]];
	});
    reset_sliders_manually(arr);
    redraw_all();
}

function converged(prev_ll,step_size){
    var good=true;
    for(var i=0;i<prev_ll.length;i++){
	good = good && 
	    (Math.abs(LOG_LIKELIHOOD[i] - prev_ll[i])/step_size<STOPPING_EPS);
    }
    return good;
}
function scale_gamma_for_solve(gamma0,step_num){
    return gamma0/Math.sqrt(step_num/10);
}

//gamma is original gamma
function solve_puzzle(gamma, step_num, orig_step_size){
    //grab prev ll
    var prev_ll = LOG_LIKELIHOOD.slice();
    var gamma = scale_gamma_for_solve(gamma,step_num);
    //SOLVE_STEP=gamma;
    $('gradient_step').value = gamma.toPrecision(5);
    step_gradient(gamma);
    if(step_num==MAX_SOLVE_ITERATIONS || converged(prev_ll,gamma)){
	$('solve_button').disabled="";
	clearInterval(SOLVE_TIMEOUT_ID);
	$('gradient_step').value = orig_step_size.toPrecision(5);
	$('gradient_step').onchange();
    }
}

function compute_gradient(){
    var print=0;
    //zero out gradient by setting to regularization, if used
    var gl= GRADIENT.length;
    GRADIENT=[];
    OBS_FEAT_COUNT=[]; EXP_FEAT_COUNT=[]; REG_FOR_GRAD=[];
    for(var l=0;l < gl; l++) {
	if(USE_REGULARIZATION){
	    var local_theta = THETA[l];
	    var lte=(REGULARIZATION_EXPONENT==1)?1:local_theta;
	    lte *= REGULARIZATION_EXPONENT/(2*REGULARIZATION_SIGMA2);
	    REG_FOR_GRAD[l]=lte;
	    GRADIENT[l] = lte;
	} else{ GRADIENT[l]=0; REG_FOR_GRAD[l]=0;}	
	OBS_FEAT_COUNT[l]=EXP_FEAT_COUNT[l]=0;
    }
    //iterate through contexts
    for(var c=0;c<CONTEXTS.length;c++){
	//iterate through types in c
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	for(var j=0;j<obs_in_c.length;j++){
	    //type id is obs_in_c[j]
	    var id_num=obs_in_c[j];
	    //data *is* human readable, e.g., ['circle','solid']
	    var data = TYPE_INDEX[id_num];
	    var stop_length = data.length;
	    var tmp=0; var key; var local_theta;
	    for(var i=0;i<stop_length;i++){
		//get the unique identifying key for this feature in the context
		var feat_num = INVERSE_FEATURE_LIST[ [CONTEXTS[c], data[i]]];
		local_theta = THETA[feat_num];
		//observed feature counts
		tmp = COUNTS[c][id_num]-0;
		OBS_FEAT_COUNT[feat_num] += tmp;
		//expected feature counts
		var tmp_e=NUM_TOKENS_C[c]*get_prob(c,id_num)/Z_THETA[c];
		EXP_FEAT_COUNT[feat_num]+=tmp_e;
		tmp -= tmp_e;
		//regularization has been taken care of...
		GRADIENT[feat_num]= ((GRADIENT[feat_num]==undefined)?0:(GRADIENT[feat_num])) + tmp;
	    }
	}
    }
    draw_gradient();
}

function setComponentDisplay(){
    DISPLAY_GRADIENT_COMPONENTS=parseInt(this.value);
}

function fold_colors_percents(percents,colors){
    var ml = Math.min(percents.length,colors.length);
    var ret=[];
    for(var i=0;i<ml;i++){
	ret.push(colors[i]+" "+percents[i]+'%');
    }
    return ret.join(', ');
}

function generate_gradient_style(percents,colors){
    var ret='';
    var names = {'-ms-linear-gradient':'left',
		 '-moz-linear-gradient':'left',
		 '-o-linear-gradient':'left',
		 '-webkit-linear-gradient':'left',
		 'linear-gradient':'to right'};
    for(var name in names){
	ret+='background-image: '+name+'('+names[name]+ ', #FFFFFF 0%, '+ fold_colors_percents(percents,colors) +', #FFFFFF 100%); ';
    }//    ret+="background-image: -moz-linear-gradient(left, #FFFFFF 0%, #FFFFFF 50%, #FF32EF 50%, #FFFFFF 100%);";
    ret += ' height:9px; position:relative; cursor:pointer; border:1px solid #333; width:155px; float:left; clear:right; margin-top:10px; -moz-border-radius:5px; -webkit-border-radius:5px; -moz-box-shadow:inset 0 0 8px #000;';
    return ret;
}

function clear_gradient_color(){
    return 'height:9px; position:relative; cursor:pointer; border:1px solid #333; width:155px; float:left; clear:right; margin-top:10px; -moz-border-radius:5px; -webkit-border-radius:5px; -moz-box-shadow:inset 0 0 8px #000;';
}


function draw_gradient(){
    if(!SHOW_GRADIENTS){
	var slds = $$(".slider");
	if(slds && gradients_drawn){
	    for(var i=0;i<slds.length;i++){
		slds[i].setAttribute('style',clear_gradient_color());
	    }
	}
	gradients_drawn = 0;
	return;
    }
    gradients_drawn = 1;
    //iterate through sliders
    var fn; var colors;
    switch(DISPLAY_GRADIENT_COMPONENTS){
    case 1:
	fn = function(grad_val, maxabs_grad, cent, M){
	    //if g>0, then have first point be current mid-point
	    //and second be mid +
	    var g_e; var points; var colors; var g_b;
	    if(grad_val > 0){
		g_b = (cent + handle_width/2);
		g_e = (g_b + (M * grad_val / maxabs_grad))*100/slider_width;
		g_b = g_b *100/slider_width;
		points = [g_b, g_b, g_e, g_e];
		colors = ['#FFFFFF',GRAD_LOW_C,GRAD_HIGH_C, '#FFFFFF'];
		
	    } else if(grad_val < 0){
		g_b = (cent - handle_width/2);
		g_e = (g_b + (M * grad_val / maxabs_grad))*100/slider_width;
		g_b *= 100/slider_width;
		points = [g_e, g_e, g_b, g_b];
		colors = ['#FFFFFF',GRAD_HIGH_C,GRAD_LOW_C, '#FFFFFF'];
	    } else{
		g_b=(cent-handle_width/2)*100/slider_width; 
		g_e=(cent+handle_width/2)*100/slider_width;
		points = [g_b,g_b,g_e,g_e];
		colors = ['#FFFFFF',GRAD_HIGH_C,GRAD_HIGH_C,'#FFFFFF'];
	    }
	    return [points,colors];
	};
	break;
    case 2:
	break;
    case 3:
	break;
    default:
	break;
    }
    var group=$$(".slider");
    //scale gradient
    var abs_max_val = GRADIENT.reduce(function(x,y){
	    return Math.max(Math.abs(x),Math.abs(y));
	}, 0);
    abs_max_val = Math.log(abs_max_val)/Math.log(10);
    var scaled_grad = GRADIENT.map(function(g){ return g/Math.pow(10,Math.floor(abs_max_val)+1); });
    var M = $$(".slider").reduce(function(x,y){ 
	    var g = y.parentNode.parentNode.childNodes[0];
	    var theta_id = parseInt(g.getAttribute('theta_index'));
	    var slider = y.childNodes[1]; var sl = parseFloat(slider.style.left);
	    var gg = scaled_grad[theta_id];
	    if(gg>=0){
		return Math.min(x,slider_width - sl+handle_width);
	    } else{
		return Math.min(x,sl);
	    }
	}, 1000000000);
    for(var i=0;i<group.length;i++){
	//to get percents 
	var g = group[i].parentNode.parentNode.childNodes[0];
	var handle = group[i].childNodes[1];
	var hand_left =parseFloat(handle.style.left);
	//get the THETA id
	var theta_id = parseInt(g.getAttribute('theta_index'));
	var npcs=fn(scaled_grad[theta_id],abs_max_val,hand_left+handle_width/2, M);
	group[i].setAttribute('style',generate_gradient_style(npcs[0],npcs[1]));
    }
}

function compute_ll(theta, ztable, ll, reg){
    var theta = theta || THETA;
    var ztable = ztable || Z_THETA;
    var ll = ll || LOG_LIKELIHOOD;
    var reg = reg || REGULARIZATION;
    var sum=0; var altsum=0;
    for(var c = 0; c<CONTEXTS.length;c++){
	//iterate through type observations
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	for(var id_num=0;id_num<obs_in_c.length;id_num++){
	    sum += COUNTS[c][id_num] * get_prob(c,obs_in_c[id_num],1,theta);
	}
	sum -= NUM_TOKENS_C[c]*Math.log(ztable[c]);
    }
    ll[0] = sum;
    
    if(USE_REGULARIZATION){
	var fn;
	switch(REGULARIZATION_EXPONENT){
	case 1:
	    fn=function(d){ return Math.abs(d);};
	    break;
	case 2:
	default:
	    fn=function(d){ return d*d;};
	    break;
	}
	sum=0;
	for(var i=0;i<theta.length;i++){
		sum += fn(theta[i]);
	}
	sum = sum/(2*REGULARIZATION_SIGMA2);
	reg[0]=sum;
	ll = ll.map(function(d){
		return d - sum;
	    });
    } 
    //console.log("LOG LIKELIHOOD: "+ ll);
}

function createSlider(val,isUnused){
    var d=document.createElement('div');
    var input=document.createElement('input');
    input.type="range"; 
    input.className += ' feature_slider';
    input.setAttribute('min',slider_min); 
    input.setAttribute('max',slider_max);
    input.setAttribute('step',slider_step);
    input.setAttribute('value',val);
    d.appendChild(input);
    d.className += ' html5slider';
    return d;
}

function addFeaturesToList(selectObj, array){
    var nf=0;
    var num_rows = Math.ceil(Math.sqrt(FEATURE_LIST.length)); 
    var num_cols = Math.ceil(FEATURE_LIST.length / num_rows); 
    var feature_index=0;
    var num_columns=array.length;
    for(var i=0;i<num_rows;i++){
	var tr=document.createElement('tr');
	tr.id='row'+i;
	for(var j=0;j<num_cols && feature_index<FEATURE_LIST.length;j++){
	    var td=document.createElement('td');
	    td.className+=' feature_cell';
	    var d=document.createElement('div');
	    var p=document.createElement('p');
	    var split_fl = FEATURE_LIST[feature_index];
	    var cont_id = REVERSE_CONTEXTS[split_fl[0]];
	    p.innerHTML=split_fl[1];
	    p.setAttribute('feature_dimension',i);
	    p.setAttribute('context',cont_id);
	    p.setAttribute('feature_name',FEATURE_LIST[feature_index]);
	    //theta_index is UNIQUE across all features!
	    p.setAttribute('theta_index',feature_index);
	    GRADIENT[feature_index]=0;
	    d.appendChild(p);
	    d.appendChild(createSlider(THETA[feature_index]));
	    td.appendChild(d);
	    tr.appendChild(td);
	    feature_index++;
	}
	selectObj.appendChild(tr);
	if(feature_index>=FEATURE_LIST.length){
	    break;
	}
    }
}

function ll_resizer(min,max){
    var m = (.95-.25)*DIV_LL_WIDTH / (max-min);
    return function(l){
	return m * (l - max) + (.95*DIV_LL_WIDTH);
    };
};

function addLLBar(){
    var svg = d3.select("#ll_area").append("svg").attr('height',20*LOG_LIKELIHOOD.length - 1).attr('width',DIV_LL_WIDTH+RESERVE_LL_WIDTH);
    svg.attr('id','ll_bars');
    var ll = LOG_LIKELIHOOD.map(function(d,i){return d+REGULARIZATION[i];});
    var tll=TRUE_LOG_LIKELIHOOD.map(function(d,i){return d+TRUE_REGULARIZATION[i];});
    //the user distribution LL
    max = function(x,y){return Math.max(x,y);};
    var max_u_ll = ll.reduce(max,-10000000);
    var max_t_ll = tll.reduce(max, -10000000);
    min = function(x,y){return Math.min(x,y);};    
    var min_u_ll = ll.reduce(min, 0);  
    var min_t_ll = tll.reduce(min, 0);
    var overall_max = Math.max(max_u_ll,max_t_ll);
    var overall_min = Math.min(min_u_ll,min_t_ll);
    worst_ll = Math.min(worst_ll,overall_min);
    var resizer = ll_resizer(worst_ll,overall_max);
    if(max_t_ll >= max_u_ll){
    } else{
    }
    //    console.log(TRUE_LOG_LIKELIHOOD.map(resizer));
    //console.log(LOG_LIKELIHOOD.map(resizer));
    var llrects=svg.selectAll(".ll_bar").data(ll).enter().append("rect");
    llrects.attr('x',0)
	.attr('width',function(d,i){
		return resizer(d);
	    })
	.attr('height',15)
	.attr('y',function(d,i){
		return 2*i*20;
	    })
	.attr('stroke','gray')
	.attr('fill',function(d){
		return "gray";
	    })
	.attr('class','ll_bar');
    var tllrects=svg.selectAll(".true_ll_bar").data(tll).enter().append("rect");
    tllrects.attr('x',0)
	.attr('width',function(d,i){
		return resizer(d);
	    })
	.attr('height',15)
	.attr('y',function(d,i){
		return (2*i + 1)*20;
	    })
	.attr('stroke','#A043BF')
	.attr('fill',function(d){
		return "#A043BF";
	    })
	.attr('class','true_ll_bar');
    //now see about regularization...
    var regrects=svg.selectAll(".reg_bar");
    var regdata;
    if(USE_REGULARIZATION){
	regdata=REGULARIZATION;
    } else{
	regdata=REGULARIZATION.map(function(d){return d-d;});
    }
    addLLRegBars(svg,LOG_LIKELIHOOD,ll,'reg_bar',regdata,function(d,i){return (2*i)*20;},resizer);
    if(USE_REGULARIZATION){
	regdata=TRUE_REGULARIZATION;
    } else{
	regdata=TRUE_REGULARIZATION.map(function(d){return d-d;});
    }
    addLLRegBars(svg,TRUE_LOG_LIKELIHOOD,tll,'true_reg_bar',regdata,function(d,i){return (2*i+1)*20;},resizer);

    //add the text LAST!!!
     var lltext=svg.selectAll(".ll_text").data(LOG_LIKELIHOOD).enter().append("text");
     lltext.text(function(d){
	     return d.toFixed(3);
	 })
	 .attr('x',function(d){
	     return resizer(d)+10;
	 })
	.attr('y',function(d,i){
		return (2*i+1)*20 - 7;
	    })
	.attr('stroke','gray')
	.attr('fill',function(d){
		return "gray";
	    });
     lltext.attr('class','ll_text');
    var tlltext=svg.selectAll("#true_ll_text").data(TRUE_LOG_LIKELIHOOD).enter().append("text");
    tlltext.text(function(d){
	    return d.toFixed(3);
	})
	.attr('x',function(d){
		return resizer(d)+10;
	    })
	.attr('y',function(d,i){
		return (2*i+2)*20 - 7;
	    })
	.attr('stroke',"#A043BF")
	.attr('fill',function(d){
		return "#A043BF";
	    })
	.attr('class','true_ll_text');

}

function addLLRegBars(svg,ll,unregged,cname,regdata,yfn,resizer){
    var regrects=svg.selectAll('.'+cname+'_overlay').data(regdata).enter().append("rect");
    regrects.attr('x',function(d,i){
	    return resizer(ll[i]);
	})
	.attr('width',function(d,i){
		return resizer(unregged[i]) - resizer(ll[i]);
	    })
	.attr('height',15)
	.attr('y',yfn)
	.attr('stroke','white')
	.attr('fill','white')
	.attr('class',cname+'_overlay');
    regrects=svg.selectAll('.'+cname).data(regdata).enter().append("rect");
    regrects.attr('x',function(d,i){
	    return resizer(ll[i]);
	})
	.attr('width',function(d,i){
		return resizer(unregged[i]) - resizer(ll[i]);
	    })
	.attr('height',15)
	.attr('y',yfn)
	.attr('stroke','red')
	.attr('stroke-width','2')
	.attr('fill','white')
	.attr('fill-opacity',0.1) //make transparent
	.attr('class',cname);
}
//ll : regularized LL
//unregged : LL + reg
function updateLLRegBars(svg,ll,unregged,cname,regdata,resizer){
    var regrects=svg.selectAll('.'+cname+'_overlay').data(regdata);
    regrects.attr('x',function(d,i){
	    return resizer(ll[i]);
	})
	.attr('width',function(d,i){
		return resizer(unregged[i]) - resizer(ll[i]);
	    });
    regrects=svg.selectAll('.'+cname).data(regdata);
    regrects.attr('x',function(d,i){
	    return resizer(ll[i]);
	})
	.attr('width',function(d,i){
		return resizer(unregged[i]) - resizer(ll[i]);
	    });
}

function updateLLBar(){
    var svg = d3.select("#ll_bars");
    //we need to "unregularize" the data in order to draw the bars (and show
    //how much regularization affects LL)
    var ll = LOG_LIKELIHOOD.map(function(d,i){return d+REGULARIZATION[i];});
    var tll=TRUE_LOG_LIKELIHOOD.map(function(d,i){return d+TRUE_REGULARIZATION[i];});
    max = function(x,y){return Math.max(x,y);};
    var max_u_ll = ll.reduce(max,-10000000);
    var max_t_ll = tll.reduce(max, -10000000);
    min = function(x,y){return Math.min(x,y);};    
    var min_u_ll = ll.reduce(min, 0);  
    var min_t_ll = tll.reduce(min, 0);
    var overall_max = Math.max(max_u_ll,max_t_ll); 
    var overall_min = Math.min(min_u_ll,min_t_ll);
    worst_ll = Math.min(worst_ll,overall_min);
    var resizer = ll_resizer(worst_ll,overall_max);

    var llrects=svg.selectAll(".ll_bar").data(ll);
    llrects.attr('x',0)
	.attr('width',function(d,i){
		return resizer(d);
	    })
	.attr('y',function(d,i){
		return 2*i*20;
	    });
    var lltext=svg.selectAll(".ll_text").data(LOG_LIKELIHOOD);
    lltext.text(function(d){
	    return d.toFixed(3);
	})
	.attr('x',function(d,i){
		return resizer(d)+10;
	    })
	.attr('y',function(d,i){
		return (2*i+1)*20 - 7;
	    });
    var tllrects=svg.selectAll(".true_ll_bar").data(tll);
    tllrects.attr('x',0)
	.attr('width',function(d,i){
		return resizer(d);
	    })
	.attr('y',function(d,i){
		return (2*i + 1)*20;
	    });
    var tlltext=svg.selectAll(".true_ll_text").data(TRUE_LOG_LIKELIHOOD);
    tlltext.text(function(d){
	    return d.toFixed(3);
	})
	.attr('x',function(d,i){
		return resizer(d)+10;
	    })
	.attr('y',function(d,i){
		return (2*i+2)*20 - 7;
	    });

    //now see about regularization...
    var regrects=svg.selectAll(".reg_bar");
    var regdata;
    if(USE_REGULARIZATION){
	regdata=REGULARIZATION;
    } else{
	regdata=REGULARIZATION.map(function(d){return 0;});
    }
    updateLLRegBars(svg,LOG_LIKELIHOOD,ll,'reg_bar',regdata,resizer);
    if(USE_REGULARIZATION){
	regdata=TRUE_REGULARIZATION;
    } else{
	regdata=TRUE_REGULARIZATION.map(function(d){return 0;});
    }
    updateLLRegBars(svg,TRUE_LOG_LIKELIHOOD,tll,'true_reg_bar',regdata,resizer);
}


function createStar(){
    var s = document.createElement('polygon');
    s.setAttribute("points","100,10 40,180 190,60 10,60 160,180");
    return s;
}


function createCircleRadius(count,max_count,scale){
    //when maximal, I want radius to be half of height
    //I need to absorb the 1/Math.sqrt(Math.PI) into the scale...
    //so don't even bother including it
    return Math.sqrt(count/max_count)*(scale-1);
}

function createTrianglePoints(cx,width,cy,height,count,max_count,scale){
    var points=[];
    //var side=Math.sqrt(4*count/(Math.sqrt(3)*max_count));
    //check this...
    var r = Math.sqrt(count/max_count * 8/(3*Math.sqrt(3)))*2*scale/3;
    //var r=side/Math.sqrt(3) * scale;
    points.push([cx,height/2 - r]);
    points.push([cx - r * Math.sqrt(3)/2, cy + r/2]);
    points.push([cx + r * Math.sqrt(3)/2, cy + r/2]);
    return points;
}

function updateD3Shape(container, id_num, id_name, width,height,shape,color,fill,count,max_count){
    var s;
    var scale=Math.min(width/2,height/2);
    if(shape=="circle"){
	s=container.selectAll('#'+id_name).data([count]);
	s.attr('cx',width/2)
	    .attr('cy',height/2)
	    .attr('r', createCircleRadius(count,max_count,scale))
    } else if(shape=="rect"){
	s=container.selectAll('#'+id_name).data([count]);
	var rwid, rhei;
	rwid = Math.sqrt(count/max_count)*2*scale;
	rhei=rwid;
	s.attr('x',(width-rwid)/2)
	    .attr("y",(height-rhei)/2)
	    .attr("width",rwid)
	    .attr("height",rhei);
    } else if(shape=="tri" || shape=="triangle"){
	s=container.selectAll('#'+id_name).data([count]);
	s.attr('points',createTrianglePoints(width/2,width,height/2,height,count,max_count,scale).map(function(d){return d.join(",");}).join(" "));
    }
    s.attr('stroke',color);
    if(fill=='solid'){
	s.attr('fill',color);
    } else if(fill=='hollow'){
	s.attr('fill','white');
    } else if(fill=='striped'){
	$('stripe_path_'+id_name).style['stroke']=color;
	s.attr('style','fill: url(#stripe_'+ id_name +'); stroke: '+color+'; opacity:'+EXPECTED_TRANSPARENCY+';');
    }
    return s;
}

function createD3Shape(container, id_num, id_name, width,height,shape,color,fill,count,max_count,opacity){
    if(fill=='striped'){
	var cloned=$('stripe_def').cloneNode(true);
	cloned.setAttribute('id','stripe_def_'+id_name);
	cloned.childNodes[1].setAttribute('id','stripe_'+id_name);
	cloned.childNodes[1].childNodes[1].setAttribute('id','stripe_path_'+id_name);
	cloned.childNodes[1].childNodes[1].style['stroke']=color;
	container[0][0].appendChild(cloned);
    }
    var s;
    var scale=Math.min(width/2,height/2);
    if(shape=="circle"){
	s=container.selectAll('#'+id_name).data([count]).enter().append("circle");
	s.attr('cx',width/2)
	    .attr('cy',height/2)
	    .attr('r', createCircleRadius(count,max_count,scale));
    } else if(shape=="rect"){
	s=container.selectAll('#'+id_name).data([count]).enter().append("rect");
	var rwid, rhei;
	rwid = Math.sqrt(count/max_count)*2*scale;
	rhei=rwid;
	s.attr('x',(width-rwid)/2)
	    .attr("y",(height-rhei)/2)
	    .attr("width",rwid)
	    .attr("height",rhei);
    } else if(shape=="tri" || shape=="triangle"){
	s=container.selectAll('#'+id_name).data([count]).enter().append("polygon");
	s.attr('points',createTrianglePoints(width/2,width,height/2,height,count,max_count,scale).map(function(d){return d.join(",");}).join(" "));
    }
    s.attr('stroke',color);
    s.attr('stroke-width',EXPECTED_STROKE_WIDTH);
    s.attr('opacity',opacity || EXPECTED_TRANSPARENCY);
    if(fill=='solid'){
	s.attr('fill',color);
    } else if(fill=='hollow'){
	s.attr('fill','white');
    } else if(fill=='striped'){
	s.attr('style','fill: url(#stripe_'+ id_name +'); stroke: '+color+'; opacity:'+EXPECTED_TRANSPARENCY+';');
    }

    return s;
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

function add(x, y) {
    return x+y;
}

function sum(numbers) {
    return numbers.reduce(add,0);
}

function INVERSE_FEATURE_LOOKUP(context,val){
    var ret = INVERSE_FEATURE_LIST[[CONTEXTS[context],val]];
    return isNumber(ret)?ret:-1;
}

//id_num is type_id!!!
function get_prob(context,id_num,log,theta){
    var ret = 0; var print=0;
    var theta = theta || THETA;
    var data= DATA_BY_CONTEXT[context][id_num];
    if(print){
	console.log(DATA_BY_CONTEXT[context]);
	console.log(id_num);
	console.log(data);
    }
    for(var i=0;i<data.length;i++){
	var ifl=INVERSE_FEATURE_LOOKUP(context,data[i]);
	if(ifl>=0){
	    ret += theta[ifl];
	}
    }
    if(print){
	console.log('------------');
    }
    return log?ret:Math.exp(ret);
}

function get_expected_count(context,id_num){
    var prob = get_prob(context,id_num)/Z_THETA[context];
    return prob*NUM_TOKENS_C[context];
}

function redrawAllExpected(){
    for(var c=0;c<CONTEXTS.length;c++){
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	//go through type IDs
	for(var id_num=0;id_num<obs_in_c.length;id_num++){
	    drawExpectedData(c,id_num, d3.select('#observed_point_context_'+c+'_'+id_num));
	}
    }
}

//container needs to be acquired via a d3.select operation!!
function drawExpectedData(context, i, container){
    var group;		
    var vis = VISUALS[context][i];
    var fill=vis['fill'];
    var shapen = vis['shape'];
    var obs_count = COUNTS[context][i];
    var exp_count = EXPECTED_COUNTS[context][i];
    var color=obs_count>exp_count?COUNTS_TOO_LOW:(obs_count<exp_count?COUNTS_TOO_HIGH:COUNTS_EQUAL);
    //scale by the max observed count...
    var max_count=-1;
    for(var other in COUNTS[context]){
	if(COUNTS[context][other] > max_count){
	    max_count=COUNTS[context][other];
	}
    }
    if(! $("exp_count_pic_"+context+'_'+i)){
	var exp_count_pic = createD3Shape(container,i,'exp_count_pic_'+context+'_'+i,SVG_WIDTH,SVG_HEIGHT,shapen,color,fill,exp_count,max_count);
	exp_count_pic.attr('id','exp_count_pic_'+context+'_'+i);
    } else{
	//otherwise, update it...
	updateD3Shape(container,i,'exp_count_pic_'+context+'_'+i,SVG_WIDTH,SVG_HEIGHT,shapen,color,fill,exp_count,max_count);
    }
}


//ZZZ CHANGE from  DATA_BY_POINT...
function updateObservedImages(){
    for(var i=0;i<NUM_OBSERVATIONS;i++){
	var rev=DATA_BY_POINT[i];
	var color = rev[1]; var fill=rev[2]; var shapen = rev[0];
	var count = SORT_COUNT_INDICES[MAP_COUNT_INDICES[i]][0];
	//scale by the max observed count...
	var max_obs_count = SORT_COUNT_INDICES[SORT_COUNT_INDICES.length-1][0];
	//otherwise, update it...
	var s=updateD3Shape(d3.select('#observed_point_'+i),i,'obs_count_pic_'+i,SVG_WIDTH,SVG_HEIGHT,shapen,'gray','hollow',count,max_obs_count);
	s.attr('stroke-opacity',1).attr('stroke-width',3);
	$('obs_count_text_'+i).innerHTML=count;
    }
}


function drawSVGBoxes(selectObj){
    var nf=0;
    var max_num_rows=-1;
    var id=0;
    var width=SVG_WIDTH; var height=SVG_HEIGHT;
    var svg_offset=1; var offset=2*svg_offset + 3;
    for(var c=0;c<CONTEXTS.length;c++){
	var num_rows=Math.ceil(NUM_OBSERVATIONS_C[c]/NUM_PER_ROW);
	if(selectObj.style.width == undefined || selectObj.style.width == null ||
	   selectObj.style.width.length == 0){
	    selectObj.style.width = NUM_PER_ROW * width + (NUM_PER_ROW*offset)+'px';
	    selectObj.style.overflow='hidden';
	}
	for(var i=0;i<num_rows;i++){
	    var divi=document.createElement('div');
	    selectObj.appendChild(divi);
	    for(var j=0;j<NUM_PER_ROW && id<TYPE_INDEX.length;j++){
		var features_for_type_id = TYPE_INDEX[id];
		var divj=document.createElement('div');
		divj.style.overflow='hidden';
		divi.appendChild(divj);
		divj.style.border = '1px dashed gray';
		if(j+1 < NUM_PER_ROW){
		    divj.style.cssFloat='left';
		}
		divj.style.width = (width+svg_offset)+'px';
		//create the count text reps
		var obs_count_p = document.createElement('p');
		var obs_count= COUNTS[c][id];
		obs_count_p.innerHTML = obs_count;
		obs_count_p.style.display='inline';
		obs_count_p.id = 'obs_count_text_'+id;
		obs_count_p.className += ' count_text observed_count_text';
		var divk=document.createElement('div');
		divk.appendChild(obs_count_p);

		var exp_count_p = document.createElement('p');
		console.log(i+', '+j+', '+id);
		console.log(features_for_type_id);
		
		var ecp=get_expected_count(c,id);
		exp_count_p.innerHTML = ecp.toFixed(2);
		exp_count_p.setAttribute('value',ecp);
		exp_count_p.style.display='inline';
		exp_count_p.setAttribute('dirty',1);
		exp_count_p.id = 'exp_count_text_'+id;
		exp_count_p.className += ' count_text expected_count_text';
		var color=obs_count>ecp?COUNTS_TOO_LOW:(obs_count<ecp?COUNTS_TOO_HIGH:COUNTS_EQUAL);
		var vis = VISUALS[c][id];
		var fill=vis['fill'];
		exp_count_p.style.color=color;
		var shapen = vis['shape'];
		divk.appendChild(exp_count_p);
		divj.appendChild(divk);

		//and now the image
		var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
		svg.setAttribute('class',svg.className+' observed_count '+ ['fill','shape'].map(function(e,i){ return "feature_"+e+"_"+vis[e];}).join(' '));
		svg.setAttribute('id','observed_point_context_'+c+'_'+id);
		svg.setAttribute('width',width);
		svg.setAttribute('height',height);
		divj.appendChild(svg);
		svg = d3.select('#observed_point_context_'+c+'_'+id);
		var max_count=-1;
		for(var other in COUNTS[c]){
		    if(COUNTS[c][other] > max_count){
			max_count=COUNTS[c][other];
		    }
		}
		var shape = createD3Shape(svg, id, 'obs_count_pic_'+c+'_'+id, width,height,shapen,'gray','hollow',obs_count,max_count,1);
		shape.attr('stroke-opacity',1).attr('stroke-width',3);
		shape.attr('id','obs_count_pic_'+c+'_'+id);
		id++
		    }
	    divi.className += ' drawrow';
	}
    }
}


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



