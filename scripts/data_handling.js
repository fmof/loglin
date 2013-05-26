/**
   DATA HANDLING
**/

function createKnownUserActions(){
    var obj = {
	do_action : function(currset, key, jqobj){
	    var mykey = currset[key];
	    this[key].do_action(jqobj);
	    if("reverse" in mykey && mykey["reverse"]){
		var x = [key, jqobj];
		this._REVERSE_LIST.push(x);
	    }
	},
	_REVERSE_LIST : Array(),
	revert_settings : function(){
	    for(var i =0;i<this._REVERSE_LIST.length;i++){
		this[this._REVERSE_LIST[i][0]].do_inverse(this._REVERSE_LIST[i][1]);
	    }
	    this._REVERSE_LIST = [];
	},
	"tooltips" : {
	    do_action : function(jqobj){
		jqobj.qtip({
		    content: {
			text : jqobj.attr("title")
		    },
		    style : {
			classes : "ui-tooltip"
		    }
		});
	    }
	},
	"hide" : {
	    do_action : function(jqobj){
		jqobj.hide();
	    },
	    do_inverse : function(jqobj){
		jqobj.show();
	    }
	},
	"show" : {
	    do_action : function(jqobj){
	    },
	    do_inverse : function(jqobj){
		jqobj.hide();
	    }
	},
	"lesson_subtitle": {
	    do_action : function(jqobj){
		
	    }
	}
    };
    return obj;
}

do_all_loading = function(){
    this.num_callbacks = 0;
    this.expected_callbacks = 2;
    this.show_text = 1;
    this.show_data = 1;
    this.timer_started = 0;

    this.start_timer = function(){
	var data_loader = this;	
	var ia=jQuery('#loading_area');
	ia.html('');
	data_loader.timer_started=1;
	show_loading_bar = setTimeout(function(){
	    show_loader(ia, 'instruction_loader');
	}, LOADING_TIME_DELAY);
	return data_loader;
    }

    this.start = function(){
	var data_loader = this;
	if(!data_loader.timer_started){
	    data_loader.start_timer();
	}
	data_loader.load_settings(data_loader);
	return data_loader;
    };

    //the common callback
    this.callback = function(jqXHR, textStatus){
	this.num_callbacks++;
	if(this.num_callbacks == this.expected_callbacks){
	    clearInterval(show_loading_bar);
	    jQuery('#instruction_loader').remove();
	    if(this.show_data==0){
		jQuery('#instruction_area').css('height','').css('border','none');		
	    } else{
		jQuery('#instruction_area').css('border', '1px solid gray');
	    }
	    apply_settings();
	    redraw_all();
	}
    };

    this.load_settings = function(obj){
	jQuery.ajax({
	    url:LESSON_SETTINGS_PATH,
	    dataType:"json",
	    success : function(settings){
		LESSON_SETTINGS=settings;
	    },
	    error : function(jqXHR, textStatus, errorThrown){
		if(jqXHR.status == 404){
		    console.error("But don't worry, this 404 is allowed.");
		    LESSON_SETTINGS={};
		} else{
		    console.log(jqXHR);
		    console.log(textStatus);
		    console.log(errorThrown);
		    console.log("--------------");
		    print_loading_error(jqXHR, textStatus, errorThrown);
		}
	    },
	    complete : function(){
		obj.load_instructions(jQuery('#instruction_area'));
		obj.load_textfile();
	    }
	});
    };

    this.load_instructions = function (ia){
	var data_loader = this;
	jQuery.ajax({
	    url:INSTRUCTION_PATH,
	    dataType:"html",
	    success : function(txt){
		ia.html('');
		ia.html(txt).scrollTop(0);
		set_instructions_height(ia);
	    },
	    complete: function(){
		data_loader.callback();
	    }
	});
    }

    this.load_textfile = function (){
	//initially, this is null...
	for(var l=0;l<FEATURE_LIST.length;l++){
	    THETA[l]=0; TRUE_THETA[l]=0;
	}
	var data_loader = this;
	jQuery.ajax({
	    url:TRUE_THETA_PATH,
	    dataType:"text",
	    error : function(jqXHR, textStatus, errorThrown){
		data_loader.show_data = 0;
		if(jqXHR.status == 404){
		    console.error("But don't worry, this 404 is allowed.");
		    data_loader.callback();
		} else{
		    print_loading_error(jqXHR, textStatus, errorThrown);
		}		
		hide_data_portion();
	    },
	    success : function(response){
		(function(rows){
		    rows.forEach(function(record){ 
			var good=true;
			for(var t in record){
			    good = good && (record[t]!=undefined);
			}
			if(!good){
			    return;
			}
			var context_id;
			if(REVERSE_CONTEXTS[record['context']] == undefined){
			    CONTEXTS.push(record['context']);
			    context_id = CONTEXTS.length-1;
			    NUM_TOKENS_C[context_id]=0;
			    NUM_OBSERVATIONS_C[context_id]=0;
			    REVERSE_CONTEXTS[record['context']]=context_id;
			    DATA_BY_CONTEXT[context_id]={};
			    TYPE_OBSERVATIONS_IN_C[context_id]=[];
			    POSITION_BY_CONTEXT[context_id]={};
			    THETA_POSITION_BY_CONTEXT[context_id]={};
			} else{
			    context_id = REVERSE_CONTEXTS[record['context']];
			}
			//add record['feature'] to theta list
			FEATURE_LIST.push([record['context'],record['feature']]);
			var feature_number = FEATURE_LIST.length -1;
			INVERSE_FEATURE_LIST[[record['context'],record['feature']]]=feature_number;
			TRUE_THETA[feature_number]=parseFloat(record['value']);
			if(isNaN(TRUE_THETA[feature_number])){
			    TRUE_THETA[feature_number] = 0.0;
			}
			THETA[feature_number]=initializeThetaValue();
			GRADIENT[feature_number]=0;
			OBS_FEAT_COUNT[feature_number]=0;
			EXP_FEAT_COUNT[feature_number]=0;
			REG_FOR_GRAD[feature_number]=0;
			//check for 'weight' --- how strongly the feature fires
			if(record.hasOwnProperty('weight')){
			    var ts=parseFloat(record['weight']);
			    if(! isFinite(ts)){
				ts=1;
			    }
			    THETA_STRENGTH[feature_number] = ts;
			} else{
			    THETA_STRENGTH[feature_number] = 1;
			}

			//now deal with positions
			if(record['position']==undefined){
			    FEATURE_POS_UNDEFINED=true;
			}
			var temp_pos = [FEATURE_POS_UNDEFINED ? [0,feature_number] : (d3.csv.parseRows(record['position'])[0]).map(function(d){return parseInt(d);})];
			THETA_POSITION_BY_CONTEXT[context_id][temp_pos] = feature_number;
			MAX_THETA_ROWS = temp_pos[0]>=MAX_THETA_ROWS?temp_pos[0]+1:MAX_THETA_ROWS;
			MAX_THETA_COLS = temp_pos[1]>=MAX_THETA_COLS?temp_pos[1]+1:MAX_THETA_COLS;
		    });
		    //now load the actual data
		    data_loader.request_data_load();
		})(d3.tsv.parse(response))} // end ajax success
	}); //end ajax request
    }

    
    this.request_data_load = function (){
	var data_loader = this;
	jQuery.ajax({
	    url:OBSERVATION_PATH,
	    dataType:"text",
	    success : function(response){
		(function(rows){
		    record_data(rows,0);
		    jQuery("#zero_weights_button").click();
		})(d3.tsv.parse(response))},
	    complete : function(jqXHR, textStatus){
		data_loader.callback(jqXHR);
	    }
	});
    }
};

//rows is array of associative arrays
function record_data(rows,already_created){
    rows.forEach(function(record) {
	record_observation(record);
    });
    if(!already_created){
    	addFeaturesToList(jQuery("#feature_table"),FEATURE_LIST);
    	addSliderEffects();
    } else{
    	jQuery(".feature_slider").each(function(i){jQuery(this).change();});
    }
    recompute_partition_function(THETA,Z_THETA);
    compute_max_prob(get_count,MAX_EMP_PROB,MAX_EMP_PROB_TYPE,MAX_EMP_AREA, get_num_tokens);
    //compute the true partition function
    recompute_partition_function(TRUE_THETA,TRUE_Z_THETA);
    //draw the data here!
    if(!already_created){
    	drawSVGBoxes(jQuery("#draw_area"));
    } else{
    	updateObservedImages();
    }
    svg_loaded=1;
    //compute expected counts
    recompute_expected_counts(); 
    compute_max_prob(get_prob, MAX_EXP_EMP_PROB, MAX_EXP_EMP_PROB_TYPE, MAX_EXP_EMP_AREA, get_model_partition_function);
    //so that we can draw in the expected images
    redrawAllExpected();
    //and, more importantly, the loglikelihood score bar
    compute_ll();
    compute_ll(TRUE_THETA,TRUE_Z_THETA,TRUE_LOG_LIKELIHOOD, TRUE_REGULARIZATION);
    compute_gradient();
    
    if(!already_created){
	//calculate LL(0)
	//compute the partition function, and LL, under a uniform distr.
	make_LL_SIGMOID();
     	addLLBar();
    } else{
    	updateLLBar();
    }
}

function make_LL_SIGMOID(){
    var zerotheta = THETA.map(function(d){return 0;});
    var zerotab=new Array(zerotheta.length);
    var zeroll=[0]; var zeroreg=[0];
    recompute_partition_function(zerotheta,zerotab);
    compute_ll(zerotheta,zerotab,zeroll,zeroreg);
    LL_SIGMOID = get_sigmoid(DIV_LL_WIDTH, zeroll[0], 0.0, .99- 70.0/DIV_LL_WIDTH);
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
	POSITION_BY_CONTEXT[context_id]={};
	THETA_POSITION_BY_CONTEXT[context_id]={};
	TYPE_OBSERVATIONS_IN_C[context_id]=[];
	//console.log('seeing new context '+record['context']);
    } else{
	context_id = REVERSE_CONTEXTS[record['context']];
    }
    DATA_BY_CONTEXT[context_id][type_index]=split_features;
    USED_CONTEXTS[context_id]=1;
    
    //updated USED_FEATURES list
    /*for(var sf=0;sf<split_features.length;sf++){
      var ifl=INVERSE_FEATURE_LOOKUP(context_id,split_features[sf]);
      if(ifl>=0){
      USED_FEATURES[ifl]=1;
      }
      }*/

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
    POSITION_BY_CONTEXT[context_id][temp_pos] = type_index;
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

function createSlider(val,isUnused){
    var d=document.createElement('div');
    jQuery('<input/>', {
	type : "range",
	min: slider_min,
	max: slider_max,
	step: slider_step,
	value : val
    }).addClass("feature_slider")
    .appendTo(jQuery(d));
    d.className += ' html5slider';
    return d;
}

function addFeaturesToList(selectObj, array){
    var nf=0;
    var tfl=[];
    for(var feature_index=0;feature_index<FEATURE_LIST.length;feature_index++){
	var td=document.createElement('td');//div
	td.className+=' feature_cell';
	var d=document.createElement('div');
	var p=document.createElement('p');
	var split_fl = FEATURE_LIST[feature_index];
	var cont_id = REVERSE_CONTEXTS[split_fl[0]];
	if(split_fl[0]==''){
	    p.innerHTML=split_fl[1];
	} else{
	    p.innerHTML=split_fl[1]+', given '+split_fl[0];
	}
	p.setAttribute('feature_dimension',i);
	p.setAttribute('context',cont_id);
	p.setAttribute('feature_name',FEATURE_LIST[feature_index]);
	//theta_index is UNIQUE across all features!
	p.setAttribute('theta_index',feature_index);
	GRADIENT[feature_index]=0;
	d.appendChild(p);
	d.appendChild(createSlider(THETA[feature_index]));
	td.appendChild(d);
	tfl.push(td);
    }
    var maxwidth=parseInt(jQuery('#feature_slider_area')[0].offsetWidth,10);
    var highest_row_cols=[-1,-1];
    for(var c=0; c<THETA_POSITION_BY_CONTEXT.length; c++){
	for(var position_pair in THETA_POSITION_BY_CONTEXT[c]){
	    var pp = position_pair.split(',').map(function(d){return parseInt(d);});
	    for(var i=0;i<pp.length;i++){
		highest_row_cols[i]= (pp[i]>highest_row_cols[i])?pp[i]:highest_row_cols[i];
	    }
	}
    }
    var num_rows = 0; var num_cols = 0;
    var width_slider = jQuery('.feature_cell')
	.get().map(function(x){return parseInt(jQuery(x).css('width'),10);})
	.reduce(function(a,b){return Math.max(a,b);},-1000);
    if(FEATURE_POS_UNDEFINED || highest_row_cols[0]==-1 || highest_row_cols[1]==-1 ||
       highest_row_cols[0] > MAX_THETA_ROWS ||
       highest_row_cols[1] > MAX_THETA_COLS){
	if(FEATURE_LIST.length <= MAX_THETA_COLS &&
	  FEATURE_LIST.length * width_slider < maxwidth){
	    num_cols = FEATURE_LIST.length;
	    num_rows = 1;
	} else{
	    num_rows = Math.ceil(Math.sqrt(FEATURE_LIST.length)); 
	    num_cols = Math.ceil(FEATURE_LIST.length / num_rows); 
	}
	var feature_index=0;
	for(var i=0;i<num_rows;i++){
	    var tr=document.createElement('tr'); //div
	    tr.id='row'+i;
	    selectObj.append(jQuery(tr));
	    for(var j=0;j<num_cols && feature_index<tfl.length;j++){
		tr.appendChild(tfl[feature_index++]);
		//selectObj.append(jQuery(tfl[feature_index++]));
	    }
	    if(feature_index>=tfl.length) break;
	}
    } else{
	num_rows = highest_row_cols[0]+1;
	num_cols = highest_row_cols[1]+1;
	for(var c = 0; c< THETA_POSITION_BY_CONTEXT.length; c++){
	    for(var i =0; i< num_rows;i++){
		var tr=document.createElement('tr'); //div
		tr.id='row'+i;
		selectObj.append(jQuery(tr));
		for(var j=0; j<num_cols;j++){
		    var tid = THETA_POSITION_BY_CONTEXT[c][[i,j]];
		    if(tid == undefined) {
			var td = document.createElement('td'); //div
			td.className += " feature_cell";
		    	tr.appendChild(td); 
			//selectObj.append(jQuery(td));
		    }
		    else
			//selectObj.append(jQuery(tfl[tid]));
			tr.appendChild(tfl[tid]);
		}
		//jQuery(tr).css('max-width',width_slider*num_cols);
	    }
	}
    }
    //selectObj.css('width',width_slider*num_cols);

}

function enumerate_possible_types(context, types_for_context){
    var arr={}; var msum=0; var ncounts={};
    for(var type_id in types_for_context){
	//get the probability of that type
	var t=get_prob(context,type_id,0,TRUE_THETA);
	msum+=t;
	arr[type_id]=t;
	ncounts[type_id]=0;
    }
    for(var tid in arr){
	arr[tid]=arr[tid]/msum;
    }
    return [arr,ncounts];
}
