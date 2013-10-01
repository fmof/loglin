
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
	if(!isFinite(tz)) tz=Number.MAX_VALUE;
	ztheta[c]=tz;
    }
    return ztheta;
}

function recompute_expected_counts(){
    for(var c=0;c<CONTEXTS.length;c++){
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	//go through type IDs
	for(var i=0;i<obs_in_c.length;i++){
	    var id_num = obs_in_c[i];
	    var ecp=get_expected_count(c,id_num);
	    EXPECTED_COUNTS[c][id_num]=ecp;
	    var obs_count = COUNTS[c][id_num];
	    var color = determine_color(get_empirical_prob(c,id_num),get_prob(c,id_num)/Z_THETA[c], c);
	    jQuery('#exp_count_text_context_'+c+'_'+id_num).html(formatExpected(ecp))
		.css("color",color)
		.attr("dirty",0).val(ecp);
	}
    }
}

//returns [feature_index, new_feature_value] pair
//@param: grad_only : eval to true if new_feature_value should
//be the gradient step (i.e., not including the original 
//theta value). This is primarily useful for gradient-based convergence.
function get_corrected_step(tindex, solve_step,grad_only, mult_fact){
    mult_fact = typeof mult_fact !== 'undefined' ? mult_fact : 1.0;
    var grad_val = GRADIENT[tindex];
    //the next value *if* we followed gradient
    //proportional to solve_step, not taking into account
    //differentiability issues (with L1 regularization)
    var propval=THETA[tindex] + solve_step*grad_val;
    var retval=0;
    //L1 regularization is proving to be a bit of a pain...
    if(USE_REGULARIZATION && REGULARIZATION_EXPONENT==1){
	if(THETA[tindex]!=0){
	    //if moving causes us to go beyond zero
	    if(sign(THETA[tindex]*propval)<0){
		retval = grad_only?(-THETA[tindex]):0;
		//return [tindex,];
	    } else{
		retval = grad_only?(solve_step*grad_val):propval;
		//return [tindex,];
	    }
	} else{ //theta == 0
	    var g = OBS_FEAT_COUNT[tindex] - EXP_FEAT_COUNT[tindex];
	    if(Math.abs(g) <= REGULARIZATION_SIGMA2){
		retval = grad_only?(-THETA[tindex]):0;
	    }
	    else{
		retval = solve_step * ((g>REGULARIZATION_SIGMA2)?(g-REGULARIZATION_SIGMA2):(g+REGULARIZATION_SIGMA2));
	    }
	}
    } else{ //otherwise, normal L2 stuff/no regularization
	retval = grad_only?grad_val:propval;
    }
    if(!isFinite(retval)){
	if(isNaN(retval))
	    retval = grad_only?0:THETA[tindex];
	retval = retval>0? 100 : -100;
    }
    return [tindex, retval];
}

function step_gradient(solve_step,dont_complete){
    var solve_step=solve_step || SOLVE_STEP;
    var all_zero=0;
    var gs_sign = sign(jQuery('#gradient_step').val());
    var arr = jQuery('.feature_slider').map(function(x){
	var tindex = parseInt(this.parentNode.parentNode.childNodes[0].getAttribute('theta_index'));
	return [get_corrected_step(tindex, solve_step, false, gs_sign)];
    });
    if(!dont_complete){
	reset_sliders_manually(arr);
	redraw_all();
    }
    return arr;
}

//gradient-based criteria for convergence
function converged(step){
    var s=sum(GRADIENT.map(function(d,i){
	//need this for L1 regularization
	//set the third param to be 1 to only get 
	//the new gradient step
	var x =get_corrected_step(i,step,1, sign(jQuery('#gradient_step').val()))[1];
	return x*x;
    }));
    console.optimize_debug('convergence : ' + s + ' <=> ' + STOPPING_EPS);
    return s < STOPPING_EPS;
}

function scale_gamma_for_solve(gamma0, step_num){
    return gamma0;
}

//auto-computes the step size
//makes the solver more robust; less confusing (hopefully) for users
function recompute_step_size(ostep,step_num,tol_low, tol_high){
    tol_low = typeof tol_low !== 'undefined' ? tol_low : 1e-8;
    tol_high = typeof tol_high !== 'undefined' ? tol_high : 1e3;
    if(step_num!=undefined){
	if(converged(ostep)){
	    return ostep;
	}
    }
    var step = ostep;
    var tztable = [];
    var signfact = sign(jQuery('#gradient_step').val());
    var tll = [LOG_LIKELIHOOD[0]*signfact];
    var tr=[0];
    var tth = [];
    var old_ll = LOG_LIKELIHOOD[0]*signfact;
    
    var f = function(s){
	var nt = step_gradient(s,1);
	tth=[];
	for(var i=0;i<nt.length;i++){
	    tth[nt[i][0]] = nt[i][1];
	}
	recompute_partition_function(tth,tztable);
	compute_ll(tth,tztable,tll,tr); 
	tll[0] *= signfact;
    };
    f(step);
    var di; var count=0; 
    var factors=[[1,2], [-1,0.5]];
    console.optimize_debug('init: oldll='+old_ll+', nll='+tll[0] + ", step="+ step);
    for(var i=0;i<factors.length;i++){
	while((di = improves_ll(tll[0],old_ll,0.01*sum(tth))) == factors[i][0]){
	    if(count % 10 == 0) {
		console.optimize_debug('factor='+factors[i]+', di='+di+', oldll='+old_ll+', nll='+tll[0] + ", step="+ step + ", new step ="+ step*factors[i][1]);
	    }
	    if(step < tol_low || step > tol_high) break;
	    step *= factors[i][1]; 
	    f(step);
	    count++;	
	    if(count > 1000){
		//should get here, but just in case...
		clearInterval(SOLVE_TIMEOUT_ID);
		jQuery('#solve_button').click();
		throw "infinite loop";
	    }
	}
	console.optimize_debug('last computed nll='+tll[0]);
    }
    console.optimize_debug('finally: oldll='+old_ll+', nll='+tll[0] + ", step="+ step);
    //if we haven't actually improved, then don't bother moving...
    return old_ll>tll[0] ? 0 : step;
}

function improves_ll(ll,oll,foo){
    return (ll>=oll)?1:-1;
}

//gamma is original gamma
function solve_puzzle(gamma, step_num, orig_step_size){
    var solve_button = jQuery('#solve_button');
    //this used to be converged(step_num)... why?
    var is_converged = converged(1);
    var gamma = gamma;
    if(gamma==0 || is_converged){
	console.optimize_debug('exiting because either gamma = '+ gamma + ' == 0 or is converged: '+ is_converged);
	solve_button.click();
	return;
    }
    console.optimize_debug('my gamma is ' + gamma);
    gamma = scale_gamma_for_solve(gamma,step_num);
    if(gamma==0){
	solve_button.click();
    }
    jQuery('#gradient_step').val(gamma.toPrecision(5));
    step_gradient(gamma);
    is_converged = converged(1);
    if(step_num==MAX_SOLVE_ITERATIONS || is_converged){
	console.optimize_debug('exiting because either step_num = '+ step_num + ' == ' + MAX_SOLVE_ITERATIONS + ' or is converged: '+ is_converged);
	solve_button.click();
    } else{
	console.optimize_debug('more to go...');
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
	    var lte=(REGULARIZATION_EXPONENT==1)?sign(local_theta):local_theta;
	    lte = lte * REGULARIZATION_EXPONENT*REGULARIZATION_SIGMA2;
	    REG_FOR_GRAD[l]=lte;
	    GRADIENT[l] = -lte;
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
	    var ittc=CONTEXTS[c]==''?['']:[CONTEXTS[c],''];
	    for(var i=0;i<stop_length;i++){
		for(var ci=0;ci<ittc.length;ci++){
		    //get the unique identifying key for this feature in the context
		    var feat_num = INVERSE_FEATURE_LIST[ [ittc[ci], data[i]]];
		    local_theta = THETA[feat_num];
		    //observed feature counts
		    tmp = (COUNTS[c][id_num]-0)*THETA_STRENGTH[feat_num];
		    OBS_FEAT_COUNT[feat_num] += tmp;
		    //expected feature counts
		    var tmp_e=NUM_TOKENS_C[c]*get_prob(c,id_num)/Z_THETA[c]*THETA_STRENGTH[feat_num];
		    EXP_FEAT_COUNT[feat_num]+=tmp_e;
		    tmp -= tmp_e;
		    //regularization has been taken care of...
		    GRADIENT[feat_num]= ((GRADIENT[feat_num]==undefined)?0:(GRADIENT[feat_num])) + tmp;
		}
	    }
	}
    }
    draw_gradient();
}


function get_empirical_prob(context,id_num, as_num){
    return (typeof(as_num)==="undefined" || as_num) ? 
	(NUM_TOKENS_C[context]==0?0:COUNTS[context][id_num]/NUM_TOKENS_C[context]) : 
    (NUM_TOKENS_C[context]==0 ? "--" : COUNTS[context][id_num]/NUM_TOKENS_C[context]);
}

//return the empirical count (unnormalized emp. prob.)
function get_count(context, id_num){
    return COUNTS[context][id_num];
}

//return the normalizing constant for the context, under 
//empirical observations
function get_num_tokens(context){
    return NUM_TOKENS_C[context];
}

//return the normalizing constant for the context, under the current
//model (assumes partition_function is uptodate)
function get_model_partition_function(context){
    return Z_THETA[context];
}

//return the *unnormalized* probability under the model
//given by theta (defaults to THETA)
//id_num is type_id!!!
function get_prob(context,id_num,log,theta){
    var ret = 0; var print=0;
    var theta = theta || THETA;
    var data= DATA_BY_CONTEXT[context][id_num];
    for(var i=0;i<data.length;i++){
	//for conditional models, first try to include ``bigram'' features
	var ifl=INVERSE_FEATURE_LOOKUP(context,data[i]);
	if(ifl>=0){
	    ret += theta[ifl]*THETA_STRENGTH[ifl];
	} 
	//then unigram features
	if(CONTEXTS[context]!='' && (ifl=INVERSE_FEATURE_LIST[['',data[i]]])!=undefined){
	    ret += theta[ifl]*THETA_STRENGTH[ifl];
	}
	//and backoff
	if((ifl=INVERSE_FEATURE_LIST[[CONTEXTS[context],'']])!=undefined){
	    ret += theta[ifl]*THETA_STRENGTH[ifl];
	}
    }
    return log?ret:Math.exp(ret);
}

function compute_max_prob(unnormalized,mep,mept,mea,norm, is_for_expected){
    var minmaxareas=[];
    is_for_expected = is_for_expected || false;
    //first, find the maximum probability per context
    for(var c=0;c<CONTEXTS.length;c++){
	minmaxareas[c]=SVG_WIDTH*SVG_HEIGHT;
	if(!is_for_expected && NUM_TOKENS_C[c]==0){
	    mep[c]=1;
	    continue;
	}
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	var max_prob=0; mep[c]=0;
	//go through type IDs
	for(var i=0;i<obs_in_c.length;i++){
	    var id_num=obs_in_c[i];
	    var p = unnormalized(c,id_num)/norm(c);
	    if(p>mep[c]){
		mep[c]=p;
		mept[c]=id_num;
	    }
	    if(VISUALS[c]!=undefined){
		minmaxareas[c] = Math.min(minmaxareas[c], getMaxAreaByShape(VISUALS[c][id_num]['shape']));
	    }
	}
    }
    //now go through and compute/store the area
    for(var c=0;c<CONTEXTS.length;c++){
	if(VISUALS[c]==undefined) continue;
	var index = mept[c];
	if(index==undefined){
	    mea[c]=1;
	    continue;
	}
	var mp = mep[c];
	var vis=VISUALS[c][index];
	var shape=vis['shape'];
	mea[c]=mp*minmaxareas[c];
    }
}


function compute_ll(theta, ztable, ll, reg){
    var theta = theta || THETA;
    var ztable = ztable || Z_THETA;
    var ll = ll || LOG_LIKELIHOOD;
    var reg = reg || REGULARIZATION;
    var sum=0; var altsum=0;
    for(var c = 0; c<CONTEXTS.length;c++){
	if(ztable[c]==0){continue;}
	//iterate through type observations
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	for(var i=0;i<obs_in_c.length;i++){
	    var id_num=obs_in_c[i];
	    sum += COUNTS[c][id_num] * get_prob(c,id_num,1,theta);
	    
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
	sum = sum*REGULARIZATION_SIGMA2;
	reg[0]=sum;
	ll[0] = ll[0] - sum;
    } 

    if(ll[0]>0 || isNaN(ll[0])){
	ll[0]=-Number.MAX_VALUE;
    }
}

function get_expected_count(context,id_num){
    var prob = get_prob(context,id_num)/Z_THETA[context];
    return prob*NUM_TOKENS_C[context];
}
