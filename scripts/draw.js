function load_html5_slider(boxid,val){
    val = val || slider_step;
    var tmpval = boxid.value;
    if(!isFinite(tmpval)){
	if(!isNaN(tmpval)){
	    tmpval = SLIDER_SIGMOID.inverse(tmpval>0 ? max_slider_val : min_slider_val);
	}
    }
    var actual_weight = tmpval / val;
    var feature_info = boxid.parentNode.parentNode.childNodes[0];
    feature_info.setAttribute('dirty',1);
    if(svg_loaded){
	//get feature index by boxid.parentVal.childNodes[0]
	var context =  parseInt(feature_info.getAttribute('context'));
	var feature_name = feature_info.getAttribute('feature_name').split(',')[1];
	var feat_name = INVERSE_FEATURE_LIST[ [CONTEXTS[context],feature_name] ];
	if(isNaN(tmpval)){
	    boxid.value=Number.MAX_VALUE;
	    if(THETA[feat_name]>0){
		actual_weight=SLIDER_SIGMOID.inverse(max_slider_val) / val;
	    } else{
		actual_weight = SLIDER_SIGMOID.inverse(min_slider_val) / val;
		boxid.value *= -1;
	    }
	}
	//make boxid.value be sci notation if appropriate
	boxid.value = formatSliderWeight(actual_weight);
	//store THETA value
	THETA[feat_name]=isFinite(actual_weight)?actual_weight:(actual_weight>0? 100: -100);
	var jdiv = jQuery(boxid);
	var boxval = parseFloat(actual_weight).toFixed(8);

	if(jdiv.data("qtip")){
	    jdiv.qtip({content: {
		text: boxval
	    }});
	} else{
	    jdiv.attr("title", boxval);
	}
	redraw_all();
    } else{
	feature_info.className+=' feature_name_box';
	boxid.parentNode.parentNode.className += ' feature_box';
    }
}

//jhandle should be a jQuery object representing a slider handle
function update_qtip_count(jhandle){
    if(jhandle.data("qtip") || jhandle.data("hasqtip")){
	var fi = jhandle.parent().parent().parent().children(":first");
	var x = parseInt(fi.attr("theta_index"),10); 
	var e = EXP_FEAT_COUNT[x];
	var sub = OBS_FEAT_COUNT[x] - (!isFinite(e)?e:formatExpected(EXP_FEAT_COUNT[x]));
	jhandle.qtip({content:
		      "Observed Count: " + 
			  '<span class="bold" style="color:' + 
			  COUNTS_EQUAL + '">' + 
			  OBS_FEAT_COUNT[x]+ '</span>' +
		      "<br />" +
		      "Expected Count: " + 
			  '<span class="bold" style="color:' + 
			  (sub > 0 ? COUNTS_TOO_LOW : COUNTS_TOO_HIGH )+
			  ';">' + formatExpected(EXP_FEAT_COUNT[x]) +
			  '</span>'
		     });
    }
}

function update_all_qtip_counts(){
    jQuery('.handle').each(function(){ update_qtip_count(jQuery(this));});
}

//REQUIRES: svg_loaded=1
function redraw_all(){
    if(!svg_loaded){return;}
    recompute_partition_function();
    recompute_expected_counts();    
    compute_max_prob(get_prob,MAX_EXP_EMP_PROB,MAX_EXP_EMP_PROB_TYPE,MAX_EXP_EMP_AREA, get_model_partition_function, true);
    redrawAllExpected();
    update_all_qtip_counts();
    updateSVGTitles();
    //ensure correct order of observed and expected images
    jQuery('.observed_image').each(function(){
	jQuery(this).before(jQuery(this).siblings(".expected_image").get());})
    compute_ll();
    compute_ll(TRUE_THETA,TRUE_Z_THETA,TRUE_LOG_LIKELIHOOD,TRUE_REGULARIZATION);
    updateLLBar();
    compute_gradient();   
}


function addSliderEffects(){
    jQuery(".feature_slider").rangeinput();
    var lb = SLIDER_SIGMOID.inverse(min_slider_val);
    var ub = SLIDER_SIGMOID.inverse(max_slider_val);
    jQuery(".feature_slider").each(function(){
	var jthis=jQuery(this);
	jthis.attr('readonly','readonly');
	var theta_index = jthis.parent().parent().children()[0].getAttribute('theta_index');
	var handle_trigger=function(){
	    //handle 
	    var t = parseFloat(this.getAttribute("moving_to"));
	    t=Math.min(slider_width-handle_width,Math.max(0,t));
	    this.parentNode.parentNode.childNodes[1].value= SLIDER_SIGMOID.inverse(t);
	    load_html5_slider(this.parentNode.parentNode.childNodes[1],SLIDER_DIV);
	};
	var tmpfn=function(e){
	    if(jQuery(this).is("[ueditted]")){
		var pv=parseFloat(jQuery(this).attr("prev_val"));
		if(!isNumber(jQuery(this).val())){
		    this.value = pv;
		    return;
		}
		var cv = parseFloat(jQuery(this).val());		
		if(Math.abs(cv-pv) < 1e-4) return;
		jQuery(this.parentNode.childNodes[0].childNodes[1]).animate({left: SLIDER_SIGMOID.transform(cv)}, 100);
		
	    } else{
		this.value = formatSliderWeight(SLIDER_SIGMOID.inverse(parseFloat(this.parentNode.childNodes[0].childNodes[1].getAttribute("moving_to"))));
	    }
	    load_html5_slider(this,SLIDER_DIV);
	};

	//save the "previous" blur event...
	var prevblur = jQuery._data(jthis[0]).events.blur[0].handler;
	//so we can remove it
	jthis.unbind('blur');
	jthis.unbind('change');
	jthis.change(tmpfn);
	jthis.parent().children().first().children()[1].ondrag=handle_trigger;

	jthis.click(function(){
	    if(in_solving) return;
	    jQuery(this).removeAttr("readonly")
		.attr("prev_val",jQuery(this).val())
		.attr("ueditted","true");
	});
	jthis.blur(function(){
	    jQuery(this).attr("readonly","readonly")
		.removeAttr("ueditted");
	});
	
	var prevkeydown = jthis.data("events").keydown[0].handler;
	jthis.unbind("keydown");

	/*if(USED_FEATURES[theta_index]==undefined){//is unused/unavailable
	  group[i].parentNode.parentNode.style.display='none';
	  group[i].parentNode.parentNode.className += ' unused_feature';
	  group[i].disabled='disabled';
	  }*/
    });

    
    var originalAnimate = jQuery.fn.animate;
    jQuery.fn.animate = function(a,b,c,d){
	if(this.hasClass('handle')){
	    this.attr("moving_to", a.left);
	}
	return originalAnimate.call(this, a,b,c,d);
    };

    var originalVal = jQuery.fn.val;
    //there's a weird click event happening, so try to override it
    jQuery('.slider').each(function(){
	var clickfn = jQuery(this).data("events").click[0].handler;
	jQuery(this).unbind("click").click(function(e){
	    //first, reset the .val() function to do nothing!
	    jQuery.fn.val = function(value) {
		if (typeof value != 'undefined') {
		    return this;
		} else{
		    return originalVal.call(this, value);
		}
	    };
	    //do the original processing
	    clickfn(e);
	    //reset the original val
	    jQuery.fn.val = originalVal;

	    this.parentNode.childNodes[1].value = formatSliderWeight(SLIDER_SIGMOID.inverse(parseFloat(this.childNodes[1].getAttribute("moving_to"))));
	});
	
    });
    
    jQuery('[theta_index]').mouseover(function(){
    }).mouseout(function(){
    });

}

function formatSliderWeight(w){
    return Math.abs(w)<0.1 && w!=0 ? w.toExponential(2) : parseFloat(w.toFixed(4));
}

function formatExpected(ecp){
    if(!isFinite(ecp)) return (sign(ecp)==1?"+":"-") + "&infin;";
    var ret= (ecp >= 1.0)?Math.round(ecp):ecp.toFixed(2);
    if(ret==0.0) return 0;
    else return ret;
}

function determine_color(p_emp,p_mod, context){
    if(p_emp == 0){ return COUNTS_EQUAL;}
    if(p_mod ==0){ return COUNTS_TOO_LOW;}
    var arg = p_emp * Math.log(p_emp/p_mod);
    var thresh = 0.01;
    if(context != undefined){
	if(NUM_TOKENS_C[context] > 100)
	    thresh = Math.pow(10,-Math.log(NUM_TOKENS_C[context])/Math.log(10));
    }
    if(Math.abs(arg)<thresh)
	return COUNTS_EQUAL;
    if(arg>0)
	return COUNTS_TOO_LOW;
    return COUNTS_TOO_HIGH;
}


/*
function setComponentDisplay(){
    DISPLAY_GRADIENT_COMPONENTS=parseInt(this.value);
}*/

function fold_colors_percents(pcs){
    var ret=[];
    for(var i=0;i<pcs.length;i++){
	ret.push(pcs[i][1]+" "+pcs[i][0]+'%');
    }
    return ret.join(', ');
}

function generate_gradient_style(npcs){
    var ret='';
    var names = {'-ms-linear-gradient':'left',
		 '-moz-linear-gradient':'left',
		 '-o-linear-gradient':'left',
		 '-webkit-linear-gradient':'left',
		 'linear-gradient':'to right'};
    for(var name in names){
	ret+='background-image: '+name+'('+names[name]+ ', #FFFFFF 0%, '+ fold_colors_percents(npcs) +', #FFFFFF 100%); ';
    }
    ret += ' height:9px; position:relative; cursor:pointer; border:1px solid #333; width:155px; float:left; clear:right; margin-top:10px; -moz-border-radius:5px; -webkit-border-radius:5px; -moz-box-shadow:inset 0 0 8px #000;';
    return ret;
}

//coi = color of interest
function sort_slider_color_points(arr, coi){
    arr=arr.sort(function(x,y){return x[0]-y[0];});
    var first=0; var def_color='#FFFFFF'; var tt_seen=0;
    var prev_col='#FFFFFF'; var prev_col1='#FFFFFF';
    for(var i=0;i<arr.length;i++){
	if(arr[i][1]==''){
	    arr[i][1]=prev_col;
	} else{
	    if(arr[i][1]==coi){
		tt_seen = tt_seen + (tt_seen>0 ? -1:1);
	    }
	    if(prev_col!=arr[i][1]){
		prev_col1=prev_col;
		prev_col=arr[i][1];
	    } else{
		prev_col=prev_col1;
	    }
	}
    }
    arr[arr.length-1][1]='#FFFFFF';
    return arr;
}

function draw_true_theta_on_slider(tt){
    var t=[[tt-1.0001,'#FFFFFF'],[tt-1, col_for_true_theta],
      [tt+1, col_for_true_theta],[tt+1.0001,'#FFFFFF']];
    var sh=50.5;
    var th = get_slider_zero_positions(sh,1);
    for(var i=0;i<th.length;i++){
	t.push(th[i]);
    }
    return generate_gradient_style(sort_slider_color_points(t, col_for_true_theta));
}

function clear_gradient_color(){
    var sh=50.5;
    var t = get_slider_zero_positions(sh,1);
    return generate_gradient_style(t);
}


function draw_gradient(){
    if(!SHOW_GRADIENTS){
	jQuery('.slider').each(function(){
		var g = this.parentNode.parentNode.childNodes[0];
		var theta_id = parseInt(g.getAttribute('theta_index'));
		var sattribute=has_cheated?draw_true_theta_on_slider(bound_dom_range(TRUE_THETA[theta_id])):clear_gradient_color();
		this.setAttribute('style',sattribute);
	});
	gradients_drawn = 0;
	return;
    }
    gradients_drawn = 1;
    //iterate through sliders
    var fn; var colors;
    switch(DISPLAY_GRADIENT_COMPONENTS){
    case 1:
	fn = function(theta,ntheta,true_theta){
	    //var ntheta = theta + grad;
	    var grad = ntheta-theta;
	    var st = bound_dom_range(theta); var snt = bound_dom_range(ntheta); 
	    //handle the infinities (hackily...)
	    if(Math.abs(theta)>10 && Math.abs(snt-st)< 1e-2){
		if(grad<0) 
		    snt -= 5.5;
		else
		    snt += 5.5;
	    }
	    var sh = 50.5; 
	    var t = get_slider_zero_positions(sh);
	    //though there could be some bad interactions between the midpoint and grad
	    if(st>=t[0][0] && st<=t[3][0]){
		if(grad>0) st=t[3][0]+0.00001;
		else if(grad<0) st=t[0][0]-0.00001;
	    }
	    if(snt>=t[0][0] && snt<=t[3][0]){
		if(grad<0) snt=t[3][0]+0.0001;
		else if(grad>0) snt=t[0][0]-0.0001;
	    }
	    var tt = bound_dom_range(true_theta); 
	    var st1=st; var snt1=snt; var grad_color;
	    var seen={};
	    //determine the gradient color
	    if(grad>=0){
		if(st1==snt){
		    snt+= 2*0.000001;
		    snt1=snt;
		}
		st1+=0.000001; 
		snt1+=0.000001;
		grad_color=grad==0?COUNTS_EQUAL:'#EE4455';
	    } else {
		if(st1==snt){
		    snt-= 2*0.000001;
		    snt1=snt;
		}
		st1-=0.000001; 
		snt1-=0.000001;
		grad_color='#4455EE';
	    } 
	    if(st>=t[0][0] && st<=t[3][0]){
		if(grad>0) st=t[3][0]+0.00001;
		else if(grad<0) st=t[0][0]-0.00001;
	    }
	    if(snt>=t[0][0] && snt<=t[3][0]){
		if(grad<0) snt=t[3][0]+0.0001;
		else if(grad>0) snt=t[0][0]-0.0001;
	    }
	    t.push([st,'#FFFFFF']);
	    t.push([st1,grad_color]);
	    t.push([snt,grad_color]);
	    t.push([snt1,'#FFFFFF']);
	    if(has_cheated){
		t.push([tt-1.000001,'']);
		t.push([tt-1, col_for_true_theta]);
		t.push([tt+1, col_for_true_theta]);
		t.push([tt+1.000001,'']);
	    }
	    t=sort_slider_color_points(t, grad_color);
	    return t;
	};
	break;
    case 2:
	break;
    case 3:
	break;
    default:
	break;
    }
    //scale gradient
    var abs_max_val = SOLVE_STEP;
    var scaled_grad = GRADIENT.map(function(g,i){ 
	    var x=get_corrected_step(i,SOLVE_STEP)[1];
	    return x;
    });
    jQuery('.slider').each(function(i){
	//to get percents 
	var g = this.parentNode.parentNode.childNodes[0];
	var handle = this.childNodes[1];
	var hand_left =parseFloat(handle.style.left);
	//get the THETA id
	var theta_id = parseInt(g.getAttribute('theta_index'));
	var npcs = fn(THETA[theta_id],scaled_grad[theta_id],TRUE_THETA[theta_id]);
	this.setAttribute('style',generate_gradient_style(npcs));
    });
}


function addLLBar(){
    var svg = d3.select("#ll_area").append("svg")
	.attr('height',20*LOG_LIKELIHOOD.length - 1)
	.attr('width',DIV_LL_WIDTH+RESERVE_LL_WIDTH)
	.attr('id','ll_bars');
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
    var resizer = ll_resizer();
    var llrects=svg.append("g").selectAll(".ll_bar").data(ll).enter().append("rect");
    llrects.attr('x',70)
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
    var tllrects=svg.append("g").selectAll(".true_ll_bar").data(tll).enter().append("rect");
    tllrects.attr('x',70)
	.attr('width',function(d,i){
		return resizer(d);
	    })
	.attr('height',15)
	.attr('y',function(d,i){
		return (2*i + 1)*20;
	    })
	.attr('stroke',TRUE_MODEL_COLOR)
	.attr('fill',function(d){
		return TRUE_MODEL_COLOR;
	    })
	.attr('class','true_ll_bar');
    jQuery('.ll_bar').parent().attr('id','group_ll_bars');
    jQuery('.true_ll_bar').parent().attr('id','group_true_ll_bars');
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
    var lllegend=svg.selectAll("#ll_legend").data([0]).enter().append("text");
    lllegend.text('Current LL: ')
	.attr('x',0)
	.attr('y',function(d,i){
	    return (2*i+1)*20 - 7;
	})
	.attr('stroke','gray')
	.attr('stroke-width', .5)
	.attr('fill',function(d){
	    return "gray";
	});
    lllegend.attr('id','ll_legend');
    var tlllegend=svg.selectAll("#true_ll_legend").data(['True LL: ']).enter().append("text");
    tlllegend.text(function(d){
	return d;
    })
	.attr('x',0)
	.attr('y',function(d,i){
	    return (2*i+2)*20 - 7;
	})
	.attr('stroke',TRUE_MODEL_COLOR)
	.attr('stroke-width', .5)
	.attr('fill',function(d){
	    return TRUE_MODEL_COLOR;
	})
	.attr('id','true_ll_legend');
    
    var lltext=svg.selectAll(".ll_text").data(LOG_LIKELIHOOD).enter().append("text");
    lltext.text(function(d){
	return d.toFixed(3);
    })
	.attr('x',function(d){
	    return resizer(d)+80;
	})
	.attr('y',function(d,i){
	    return (2*i+1)*20 - 7;
	})
	.attr('stroke','gray')
	.attr('stroke-width', .5)
	.attr('fill',function(d){
	    return "gray";
	});
    lltext.attr('class','ll_text');
    var tlltext=svg.selectAll(".true_ll_text").data(TRUE_LOG_LIKELIHOOD).enter().append("text");
    tlltext.text(function(d){
	    return d.toFixed(3);
	})
	.attr('x',function(d){
		return resizer(d)+80;
	    })
	.attr('y',function(d,i){
		return (2*i+2)*20 - 7;
	    })
	.attr('stroke',TRUE_MODEL_COLOR)
	.attr('stroke-width', .5)
	.attr('fill',function(d){
		return TRUE_MODEL_COLOR;
	    })
	.attr('class','true_ll_text');
}

function addLLRegBars(svg,ll,unregged,cname,regdata,yfn,resizer){
    var regrects=svg.selectAll('.'+cname+'_overlay').data(regdata).enter().append("rect");
    regrects.attr('x',function(d,i){
	    return resizer(ll[i])+70;
	})
	.attr('width',function(d,i){
		return Math.abs(resizer(unregged[i]) - resizer(ll[i]));
	    })
	.attr('height',15)
	.attr('y',yfn)
	.attr('stroke','white')
	.attr('fill','white')
	.attr('class',cname+'_overlay');
    regrects=svg.selectAll('.'+cname).data(regdata).enter().append("rect");
    regrects.attr('x',function(d,i){
	    return resizer(ll[i])+70;
	})
	.attr('width',function(d,i){
		return Math.abs(resizer(unregged[i]) - resizer(ll[i]));
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
    ['.'+cname+'_overlay', '.'+cname].forEach(function(id){
	svg.selectAll(id).data(regdata).attr('x',function(d,i){
	    return resizer(ll[i])+70;
	})
	    .attr('width',function(d,i){
		return Math.abs(resizer(unregged[i]) - resizer(ll[i]));
	    });
    });
}

function updateLLBar(){
    var svg = d3.select("#ll_bars");
    //we need to "unregularize" the data in order to draw the bars (and show
    //how much regularization affects LL)
    var ll = LOG_LIKELIHOOD.map(function(d,i){return d+ sign(REGULARIZATION_SIGMA2)*REGULARIZATION[i];});
    var tll=TRUE_LOG_LIKELIHOOD.map(function(d,i){return d+ sign(REGULARIZATION_SIGMA2)*TRUE_REGULARIZATION[i];});
    var max_u_ll = ll.reduce(Math.max,-10000000);
    var max_t_ll = tll.reduce(Math.max, -10000000);
    var min_u_ll = ll.reduce(Math.min, 0);  
    var min_t_ll = tll.reduce(Math.min, 0);
    var overall_max = Math.max(max_u_ll,max_t_ll); 
    var overall_min = Math.min(min_u_ll,min_t_ll);
    worst_ll = Math.min(worst_ll,overall_min);
    var resizer = ll_resizer();//worst_ll,overall_max);

    var llrects=svg.selectAll(".ll_bar").data(ll);
    llrects.attr('width',function(d,i){
		return resizer(d);
	    })
	.attr('y',function(d,i){
		return 2*i*20;
	    });
    var lltext=svg.selectAll(".ll_text").data(sign(REGULARIZATION_SIGMA2)>0?LOG_LIKELIHOOD:ll);
    lltext.text(function(d){
	    return d.toFixed(3);
	})
	.attr('x',function(d,i){
		return resizer(d)+80;
	    })
	.attr('y',function(d,i){
		return (2*i+1)*20 - 7;
	    });
    var tllrects=svg.selectAll(".true_ll_bar").data(tll);
    tllrects.attr('width',function(d,i){
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
		return resizer(d)+80;
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

function prettifyShape(shape, id_name, color, fill, set_sw_opacity, opacity){
    shape.attr('stroke',color);
    if(set_sw_opacity){	
	shape.attr('stroke-width',EXPECTED_STROKE_WIDTH);
	shape.attr('opacity',opacity || EXPECTED_TRANSPARENCY);
    }
    if(fill=='solid'){
	shape.attr('fill',color);
    } else if(fill=='hollow'){
	shape.attr('fill','white');
    } else if(fill=='striped'){
	jQuery('#stripe_path_'+id_name).css('stroke',color);
	shape.attr('style','fill: url(#stripe_'+ id_name +'); stroke: '+color+'; opacity:'+EXPECTED_TRANSPARENCY+';');
    }
}


function updateD3Shape(container, id_num, id_name, width,height,visuals,color,count,max_count,hack_observed){
    var s;
    var scale=Math.min(width/2,height/2);
    s=container.selectAll('#'+id_name).data([count]);
    max_count = parseFloat(max_count);
    count = parseFloat(count);
    //hack
    if(!isFinite(count)) count = .5;
    //reset sizes
    var shape_params={
	width : width,
	height : height,
	count : isFinite(max_count) ? count: 0,
	max_count : isFinite(max_count) ? max_count : 1,
	scale : scale,
	value : visuals['value'],
	is_observed : (typeof(hack_observed)!=="undefined" || hack_observed)
    };
    var sdshape = SHAPE_DICTIONARY[visuals['shape']];
    sdshape.draw(s, shape_params);
    //and colors
    prettifyShape(s, id_name, color, visuals['fill'],! sdshape.skip_opacity);
    return s;
}

function createD3Shape(container, id_num, id_name, width,height, visuals, color, count,max_count,opacity){
    if(visuals['fill']=='striped'){
	var cloned=jQuery('#stripe_def').clone()
	    .attr('id','stripe_def_'+id_name);
	cloned.children().eq(0).attr('id','stripe_'+id_name);
	cloned.children().eq(0).children().eq(0).attr('id','stripe_path_'+id_name)
	    .css('stroke',color);
	container[0][0].appendChild(cloned[0]);
    }
    var s;
    var scale=Math.min(width/2,height/2);
    s=container.selectAll('#'+id_name).data([count]).enter().append(SHAPE_DICTIONARY[visuals['shape']]["svg"]);
    var	is_observed = id_name.indexOf("obs_count_pic")!=-1;
    var shape_params={
	width : width,
	height : height,
	count : isFinite(max_count) ? count: 0,
	max_count : isFinite(max_count) ? max_count : 1,
	scale : scale,
	first_draw : true,
	value : visuals['value'],
	opacity : opacity,
	is_observed : is_observed,
	hide : {
	    'text' : is_observed,
	    'image' : is_observed
	}
    };
    var sdshape = SHAPE_DICTIONARY[visuals['shape']];
    sdshape.draw(s, shape_params);
    prettifyShape(s, id_name, color, visuals['fill'], !sdshape.skip_opacity, opacity);
    return s;
}

function createInstructionableD3Shape(container, c_name, shape_params){
    var tid='#'+c_name+'_'+shape_params.shape+'_'+shape_params.fill;
    if(shape_params['fill']=='striped'){
	var cloned=jQuery('#stripe_def').clone()
	    .attr('id','stripe_def_'+tid);
	cloned.children().eq(0).attr('id','stripe_'+tid);
	cloned.children().eq(0).children().eq(0).attr('id','stripe_path_'+tid)
	    .css('stroke',shape_params.color);
	container[0][0].appendChild(cloned[0]);
    }
    var s;
    s=container.selectAll(tid).data([shape_params.count]).enter().append(SHAPE_DICTIONARY[shape_params['shape']]["svg"]);
    var sdshape = SHAPE_DICTIONARY[shape_params['shape']];
    sdshape.draw(s, shape_params);
    prettifyShape(s, tid, shape_params.color, shape_params['fill']);
    return s;
}


function redrawAllExpected(){
    for(var c=0;c<CONTEXTS.length;c++){
	var obs_in_c=TYPE_OBSERVATIONS_IN_C[c];
	//go through type IDs
	for(var i=0;i<obs_in_c.length;i++){
	    var id_num=obs_in_c[i];
	    drawExpectedData(c,id_num, d3.select('#observed_point_context_'+c+'_'+id_num));
	}
    }
}

function updateSVGTitles(){
    jQuery('.observed_count').each(function(){
	var jthis=jQuery(this);
	var spid=this.id.split("_");
	var context = spid[3], typeid=spid[4];
	var emp_prob = get_empirical_prob(context, typeid, false);
	if(isNumber(emp_prob)) emp_prob=emp_prob.toPrecision(4);
	var model_prob = (get_prob(context,typeid)/Z_THETA[context]).toPrecision(4);
	//var tooltipcolor = determine_color(emp_prob, model_prob,context);
	if(jthis.data("qtip")){
	    jQuery(this).qtip({content:
			       'Empirical Probability: ' + 
				   '<span class="bold" style="color:'+ COUNTS_EQUAL +';">' +
				   emp_prob +"</span><br/>"+
			       'Model Probability: ' +
				   '<span class="bold" style="color:'+ 
				   determine_color(emp_prob, model_prob,context) +';">' + model_prob + '</span>'
			      });
	} else{
	    jQuery(this).attr('title','Empirical Probability: ' + emp_prob +"<br/>"+
			      'Model Probability: ' + model_prob);
	}
			  
    });
}

//container needs to be acquired via a d3.select operation!!
function drawExpectedData(context, i, container){
    var group;
    var vis = VISUALS[context][i];
    var fill=vis['fill'];
    var shapen = vis['shape'];
    var obs_count = COUNTS[context][i];
    var exp_count = EXPECTED_COUNTS[context][i];	    
    var color = determine_color(get_empirical_prob(context,i),get_prob(context,i)/Z_THETA[context], context);
    //scale by the max observed count...
    var max_count=-1;
    for(var other in COUNTS[context]){
	if(COUNTS[context][other] > max_count){
	    max_count=COUNTS[context][other];
	}
    }
    var ntc=NUM_TOKENS_C[context]==0?1:NUM_TOKENS_C[context];
    if(! jQuery("#exp_count_pic_"+context+'_'+i).length){
	var exp_count_pic = createD3Shape(container,i,'exp_count_pic_'+context+'_'+i,SVG_WIDTH,SVG_HEIGHT, vis, color, get_prob(context,i)/Z_THETA[context],MAX_EXP_EMP_PROB[context]/MAX_EXP_EMP_AREA[context],EXPECTED_TRANSPARENCY);
	exp_count_pic.attr('id','exp_count_pic_'+context+'_'+i)
	    .classed('expected_image',true);
    } else{
	//otherwise, update it..
	updateD3Shape(container,i,'exp_count_pic_'+context+'_'+i,SVG_WIDTH,SVG_HEIGHT, vis, color, get_prob(context,i)/Z_THETA[context], MAX_EXP_EMP_PROB[context]/MAX_EXP_EMP_AREA[context]);
    }
}

function updateObservedImages(){
    var mcpc = [];
    jQuery('.observed_count').each(function(i){
	//#observed_point_context_X_Y
	var gi=this.id.split('_');
	var c = gi[3] ; //get context -- X
	var j = gi[4] ; //get type_id -- Y
	var count = COUNTS[c][j];
	var x = VISUALS[c][j];
	var tfi = x['fill'];
	x['fill'] = 'hollow';
	var s=updateD3Shape(d3.select('#observed_point_context_'+c+'_'+j),j,'obs_count_pic_'+c+'_'+j,SVG_WIDTH,SVG_HEIGHT, VISUALS[c][j], '#B8B8B8', get_empirical_prob(c,j),MAX_EMP_PROB[c]/MAX_EMP_AREA[c], true);
	x['fill']=tfi;
	s.attr('stroke-opacity',1).attr('stroke-width',3);
	jQuery('#obs_count_text_'+c+'_'+j).html(formatExpected(count));
    });
    make_LL_SIGMOID();
}


function drawSVGBoxes(selectObj){
    var nf=0;
    var max_num_rows=-1;
    var id=0;
    var width=SVG_WIDTH; var height=SVG_HEIGHT;
    var svg_offset=8; var offset=2*svg_offset + 3;
    var num_axes=0;
    var tab = document.createElement('div'); //ul //table
    tab.id= 'observations_list';
    var tr;
    if(CONTEXTS.length>1 || CONTEXTS[0]!=''){
	tr= document.createElement('div'); //tr
	var th=document.createElement('div'); //th
	th.innerHTML='Context';
	tr.appendChild(th);
	tab.appendChild(tr);
    }
    selectObj.append(jQuery(tab));

    var highest_row_cols=[-1,-1];
    for(var c=0;c<CONTEXTS.length;c++){
	for(var position_pair in POSITION_BY_CONTEXT[c]){
	    var pp = position_pair.split(',').map(function(d){return parseInt(d);});
	    for(var i=0;i<pp.length;i++){
		highest_row_cols[i]= (pp[i]>highest_row_cols[i])?pp[i]:highest_row_cols[i];
	    }
	}
    }
    var num_cols = highest_row_cols[1]+1;
    var npr=num_cols;

    var context_list=[];
    var num_contexts=0;
    for(var c=0;c<CONTEXTS.length;c++){
	if(USED_CONTEXTS[c]!=1){
	    continue;
	}
	num_contexts+=1;
	tr=document.createElement('div');//li //tr
	tr.className += ' observation_row_num_context';
	tab.appendChild(tr);
	//context_list.push(tr);
	var td_tok = document.createElement('div'); //td
	jQuery(td_tok).css({'display':'table-cell',
			    'text-align':'center',
			    'vertical-align':'middle'
			   })
	tr.appendChild(td_tok);
	//handle number of tokens in context
	var div_token_input=document.createElement('div');
	div_token_input.className+=' floatleft num_tokens_context_div';
	var ntoksp = document.createElement('span');
	ntoksp.innerHTML = '<i>N</i><sub>'+ CONTEXTS[c] +'</sub> = ';
	var ntok=document.createElement('input');
	ntok.setAttribute('id','num_tokens_context_'+c);
	ntok.className += ' num_tokens_context_input';
	ntok.setAttribute('context_id',c);
	ntok.setAttribute('value',NUM_TOKENS_C[c]);
	ntok.setAttribute('size',6);
	ntok.onchange = function(){
	    var v = this.value; var cc = parseInt(this.getAttribute('context_id'));
	    if(isNumber(v) /* && NUM_TOKENS_C[cc]!=0*/ ){
		v=parseFloat(v);
		var ov = NUM_TOKENS_C[cc];
		NUM_TOKENS = NUM_TOKENS - ov + v;
		NUM_TOKENS_C[cc]=v;
		rescale_context_counts(cc,ov,v);
		LAST_UPDATED_TOKEN_COUNT[cc]=1;
		this.style['background-color']='#F6F5A2';
		var ncount_button = jQuery('#new_counts');
		if(! ncount_button.is(":disabled")){
		    ncount_button.css('background-color','#F6F5A2');
		}
	    } else{
		this.value=NUM_TOKENS_C[cc];
	    }
	};
	div_token_input.appendChild(ntoksp);

	div_token_input.appendChild(ntok);
	td_tok.appendChild(div_token_input);
	
	var vis_in_c=VISUALS[c];
	var axes={}; var place_in_axis={};
	var td_context=document.createElement('div'); //td
	var div_context=document.createElement('div');
	td_context.appendChild(div_context);
	tr.appendChild(td_context);
	td_context.style.display = 'table-cell';
	div_context.id='context_draw_area_'+c;

	//set the number of items per row (npr)
	highest_row_cols=[-1,-1];
	for(var position_pair in POSITION_BY_CONTEXT[c]){
	    var pp = position_pair.split(',').map(function(d){return parseInt(d);});
	    for(var i=0;i<pp.length;i++){
		highest_row_cols[i]= (pp[i]>highest_row_cols[i])?pp[i]:highest_row_cols[i];
	    }
	}
	var num_rows = highest_row_cols[0]+1;
	
	var rowwidth = (npr) * width + (npr*offset);
	div_context.style.width=(rowwidth+0)+'px';
	div_context.style['float']='left';
	div_context.className+=' cdrawrow';
	//set the width of each to be the max width + the num_tokens width
	tr.style.width=(rowwidth+100)+'px';
	//selectObj.css("width",rowwidth+100);
	selectObj.css("overflow",'hidden');
	for(var i=0;i<num_rows;i++){
	    var divi=document.createElement('div');
	    divi.style.width=rowwidth+'px';
	    div_context.appendChild(divi);
	    for(var j=0;j<npr; j++){
		//get type id
		var type_id = POSITION_BY_CONTEXT[c][[i,j]];
		//always make a div, no matter what
		var divj=document.createElement('div');
		divj.style.overflow='hidden';
		divi.appendChild(divj);
		divj.style.padding = '2px 4px 0px 4px';
		divj.style.border = '1px solid gray';
		if(j+1 < npr || (j==0 && npr==1)){
		    divj.style.cssFloat='left';
		}
		divj.style.width = (width+svg_offset)+'px';
		//but then we may not have actually observed anything for this type id
		//that is, we may not have observed the full joint
		if(type_id==undefined){
		    divj.style.border='';
		    continue;
		} 
		var features_for_type_id = TYPE_INDEX[type_id];
		//create the count text reps
		var obs_count_p = document.createElement('p');
		var obs_count= COUNTS[c][type_id];
		obs_count_p.innerHTML = formatExpected(obs_count);
		obs_count_p.style.display='inline';
		obs_count_p.id = 'obs_count_text_'+c+'_'+type_id;
		obs_count_p.className += ' count_text observed_count_text';
		var divk=document.createElement('div');
		divk.appendChild(obs_count_p);

		var exp_count_p = document.createElement('p');
		
		var ecp=get_expected_count(c,type_id);
		exp_count_p.innerHTML = ecp.toFixed(2);
		exp_count_p.setAttribute('value',ecp);
		exp_count_p.style.display='inline';
		exp_count_p.setAttribute('dirty',1);
		exp_count_p.id = 'exp_count_text_context_'+c+'_'+type_id;
		exp_count_p.className += ' count_text expected_count_text';
		var color = determine_color(get_empirical_prob(c,type_id),get_prob(c,type_id)/Z_THETA[c]);
		var vis = VISUALS[c][type_id];
		var fill=vis['fill'];
		exp_count_p.style.color=color;
		var shapen = vis['shape'];
		divk.appendChild(exp_count_p);
		divj.appendChild(divk);

		//and now the image
		var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
		svg.setAttribute('class',svg.className+' observed_count '+ ['fill','shape'].map(function(e,i){ return "feature_"+e+"_"+vis[e];}).join(' '));
		svg.setAttribute('id','observed_point_context_'+c+'_'+type_id);
		svg.setAttribute('width',width);
		svg.setAttribute('height',height);
		svg.setAttribute("xmlns","http://www.w3.org/2000/svg");
		svg.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");
		divj.appendChild(svg);
		svg = d3.select('#observed_point_context_'+c+'_'+type_id);
		var max_count=-1;
		for(var other in COUNTS[c]){
		    if(COUNTS[c][other] > max_count){
			max_count=COUNTS[c][other];
		    }
		}
		var tfi = vis['fill'];
		vis['fill']='hollow';
		var shape = createD3Shape(svg, type_id, 'obs_count_pic_'+c+'_'+type_id, width,height, vis, '#B8B8B8',get_empirical_prob(c,type_id),MAX_EMP_PROB[c]/MAX_EMP_AREA[c],1);
		vis['fill']=tfi;
		shape.attr('fill-opacity',0)
		    .attr('stroke-opacity',1)
		    .attr('stroke-width',3)
		    .attr('id','obs_count_pic_'+c+'_'+type_id)
		    .classed('observed_image',true);
	    } //end for over columns
	    divi.className += ' drawrow';
	}
    }
    jQuery('.observation_row_num_context').css({
	'display':'inline',
	'float':'left'});
    var max_context_width = jQuery('.observation_row_num_context')
	.get().map(function(x){return parseInt(jQuery(x).css('width'),10);})
	.reduce(function(a,b){return Math.max(a,b);},-1000);
    //dynamically set the number of contexts available
    if(num_contexts==1){
	selectObj.css('width',rowwidth+100);
    } else{
	selectObj.css('width',Math.floor(parseFloat(jQuery('#draw_area_fieldset').css('width'))/max_context_width)* (rowwidth+100));
    }
    //now get the width of selectObj: in order to center it
}


