
function rescale_context_counts(context_id, old_val,n_val){
    //go through TYPE_OBSERVATIONS_IN_C[context_id]
    for(var i=0;i<TYPE_OBSERVATIONS_IN_C[context_id].length;i++){
	var tid = TYPE_OBSERVATIONS_IN_C[context_id][i];
	if(old_val!=0){
	    COUNTS[context_id][tid] *= n_val/old_val;
	}
    }
    updateObservedImages();
    redraw_all();
}

function generate_new_counts_context(context_id,ntimes){
    //let's keep our current weights
    recompute_partition_function();
    recompute_partition_function(TRUE_THETA,TRUE_Z_THETA);
    sample_from_true(context_id,ntimes);
    compute_max_prob(get_count, MAX_EMP_PROB, MAX_EMP_PROB_TYPE, MAX_EMP_AREA, get_num_tokens);
    $('num_tokens_context_'+context_id).value = NUM_TOKENS_C[context_id];
    updateObservedImages();
    svg_loaded=1;
    redraw_all();    
    //update buttons
    $('step_button').disabled='';
    $('solve_button').disabled='';
}

function generate_new_observations(ntimes){
    var n=normal(0,0.5);
    for(var l=0;l<FEATURE_LIST.length;l++){
	TRUE_THETA[l] = n.sample();
    }
    console.log(TRUE_THETA);
    //let's keep our current weights
    recompute_partition_function();
    //and because we have a true model now, compute the actual partition function
    recompute_partition_function(TRUE_THETA,TRUE_Z_THETA);
    
    for(var c=0;c<CONTEXTS.length;c++){
	if(USED_CONTEXTS[c]){
	    sample_from_true(c,ntimes);
	    $('num_tokens_context_'+c).value = NUM_TOKENS_C[c];
	}
    }
    compute_max_prob(get_count,MAX_EMP_PROB,MAX_EMP_PROB_TYPE,MAX_EMP_AREA, get_num_tokens);
    has_cheated=0;
    updateObservedImages();
    svg_loaded=1;
    redraw_all();
    $('cheat_button').style.display='block';
    $('step_button').disabled='';
    $('solve_button').disabled='';
    $("new_counts").disabled='';
    if(!is_empty(LAST_UPDATED_TOKEN_COUNT)){
	jQuery('#new_counts').css('background-color','#F6F5A2');
    }
}


function sample_from_true(context_id, num_times){
    //clear various arrays...
    var oldntokc=NUM_TOKENS_C.slice();
    var cstart=0, cend=CONTEXTS.length;
    if(context_id!=-1){
	cstart = context_id; cend=cstart+1;
    } else{
	reset_data_structures();
    }
    //enumerate possible types
    //for every context...
    for(var c=cstart;c<cend;c++){
	NUM_TOKENS-=NUM_TOKENS_C[c];
	NUM_TOKENS_C[c]=0;
	var a=enumerate_possible_types(c,VISUALS[c]);
	console.log(a);
	var num_times = num_times || oldntokc[c] || 50;	
	//first lay-out each type along the unit interval
	var s = []; var prev=0; var ncounts = a[1];
	for(var i in a[0]){
	    s[i]=a[0][i];
	}
	prev=0;
	//smooth it out, and use negation as a flag
	for(var i=0;i<s.length;i++){
	    if(s[i] == undefined){
		s[i]=-prev;
	    } else{
		s[i] += prev;
		prev=s[i];
	    }
	}
	console.log(s);
	for(var i = 0;i<num_times;i++){
	    var n=Math.random();
	    var j=0;
	    while(n > s[j] && (j++)<s.length){}
	    ncounts[j]++;
	}
	for(var type_id in ncounts){
	    var t=ncounts[type_id];
	    if(COUNTS[c]==undefined){
		continue;
	    }
	    COUNTS[c][type_id]=t;
	    NUM_TOKENS_C[c]+=t;
	    NUM_TOKENS += t;
	}
    }
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


function update_token_count(){
    var c = parseInt(this.getAttribute('context'));
    var old_val=NUM_TOKENS_C[c];
    if(is_int(this.value)){
	var nval=parseInt(this.value);
	NUM_TOKENS-= old_val;
	NUM_TOKENS += nval;
	console.log(NUM_TOKENS_C[c]+', '+old_val+', '+nval);
	NUM_TOKENS_C[c] = NUM_TOKENS_C[c] - old_val;
	console.log(NUM_TOKENS_C);
	NUM_TOKENS_C[c] = NUM_TOKENS_C[c] + nval;
	console.log(NUM_TOKENS_C);
    } else{
	this.value=old_val;
    }
}

function reset_manually_from_theta(slider,val){
    var h = get_handle(slider);
    slider.parentNode.parentNode.setAttribute('title',val);
    var x = SLIDER_SIGMOID.transform(parseFloat(val));
    x=Math.max(min_slider_val,Math.min(max_slider_val,x));
    if(x< 1e-10) x=1e-5;
    h.style['left'] = x+'px';
}

function reset_sliders_manually(arr){
    var group = $$('.feature_slider');
    for(var i=0;i<group.length;i++){
	group[i].value = formatSliderWeight(arr[i][1]);
	reset_manually_from_theta(group[i],arr[i][1]);
	THETA[arr[i][0]]=parseFloat(arr[i][1]);
    }
}
