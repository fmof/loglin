/**
   TRELLIS: support for the lessons on tagging.

   A lesson may provide lessons/<dir>/trellis.json.  It lists one or more
   input sequences ("sentences" of words) and, for
   each one, the trellis of its possible taggings: for each position, the
   list of edges from the previous position's tags to this position's tags.
   The last list holds the edges into the stop state.  Each edge carries
     "f": [feature names]   the features that fire on the edge, so that
                            edge weight = exp(sum of their weights).
   A path's weight is the product of its edge weights.

   Other fields:
     tags            the trellis rows, top to bottom
     start, stop     names of the start and stop states
     structured      if true, each sentence is a context of the main model
                     whose outcomes are ALL its taggings: Z and the
                     expected counts come from the trellis, and the
                     observation file need only list some taggings
     x_name, y_name  what to call a sentence and a tagging in the text
     given_name      what an edge's probability is conditioned on, as in
                     p(edge | words) (default: x_name)
     transition_sep  what to write between the two tags of an edge's name
                     (default: an arrow)
     hide_best_summary  don't write the best path above the trellis
     hide_ab         don't mention alpha and beta
     z_beside        show the number of paths and Z to the right of the
                     trellis, rather than above it
     highlight_ties  if some but not all paths tie for best, mark them all
     best_tie        paths whose log weights are this close to the best count
                     as tied.  (Solve stops before an exact tie can appear.)
                     Only for sentences short enough to list their paths.
     tag_tie         tags whose probabilities are this close to the top one
                     at a position count as tied
     tag_labels      show the most probable tags under each word, colored by
                     whether they're the most observed tag there, instead of
                     writing them above the trellis
     compare_counts  hovering gives counts, in place of the other details;
                     color each state and edge by comparing its expected and
                     observed counts in its own sentence, instead of drawing
                     the observed taggings
     best_color      the color that marks the best paths
     best_outline    the color of a thin outline around that mark
     step_size       the starting step size, for data where the usual one
                     makes "Step" overshoot and lower the log-likelihood
     hint_step       the step that gradient hints are drawn for (default:
                     the current step size)
     best_off        start with "Show best path" unchecked
     show_gradient   start with the gradient hints on.  Other lessons get
                     back the setting they had, since in lessons 1-5 the
                     checkbox also reveals the "Step" and "Solve" buttons.
     position_label  e.g. "day": label column i as "day i"
     datasets        the choices of a "Training data" menu, with the first
                     one matching the observation file:
                       [{"name":..., "counts":{context:{tagging:count}}}]
                     Every tagging named here must be listed in the
                     observation file (with any count).

   A sentence may also set "disaggregate": k, to offer a button that splits
   its paths into groups by how they tag the first k words, and draws each
   group separately.  (Use the sentence's length to draw every path.)
**/

TRELLIS=null;
TRELLIS_UI=null;
TRELLIS_TIE=1e-9; //log weights or probabilities this close count as tied
TRELLIS_COLORS={observed:'#B8B8B8', expected:'#A043BF', best:'#E07B00', ink:'#333',
		too_low:'#EE4455', too_high:'#4455EE', equal:'#9E9E9E', tag_fine:'#777'};
TRELLIS_COUNT_TOL=0.1; //counts this close match ("Solve" stops short of an exact match)
TRELLIS_TIP_TARGET=null; //the state or edge whose counts are showing

function trellis_reset(){
    TRELLIS=null;
    TRELLIS_UI={sel:0, show_ab:false, show_best:true,
		show_edge_probs:false, show_tags:false, disaggregate:false, message:''};
    jQuery('#trellis_area').hide();
    jQuery('#trellis_dataset_dt,#trellis_dataset_dd').hide();
    jQuery('#data_options_area').prependTo('#data_area');
}
trellis_reset();

function trellis_load(loader, path, done){
    loader.ajax({
	url:path,
	dataType:"json",
	success : function(cfg){
	    TRELLIS = trellis_prepare(cfg);
	},
	error : function(jqXHR, textStatus, errorThrown){
	    TRELLIS = null;
	    if(jqXHR.status != 404){
		console.log("could not load " + path + ": " + textStatus + " " + errorThrown);
	    }
	},
	complete : function(){
	    done();
	}
    });
}

//index the trellis description; feature names are resolved to feature ids
//now (the weights file has been loaded)
function trellis_prepare(cfg){
    cfg.start = cfg.start || 'Start';
    cfg.stop = cfg.stop || 'Stop';
    cfg.x_name = cfg.x_name || 'sentence';
    cfg.y_name = cfg.y_name || 'tagging';
    cfg.byContext = {};
    cfg.ready = false;
    cfg.sentences.forEach(function(s, si){
	var n = s.words.length;
	s.index = si;
	s.tagsAt = [[cfg.start]];
	for(var p=1;p<=n;p++){
	    var seen={};
	    s.edges[p-1].forEach(function(a){ seen[a.to]=1; });
	    s.tagsAt.push(cfg.tags.filter(function(t){ return seen[t]; }));
	}
	s.tagsAt.push([cfg.stop]);
	//only the tags this sentence can use get a row
	var used={};
	s.tagsAt.slice(1,n+1).forEach(function(l){ l.forEach(function(t){ used[t]=1; }); });
	s.rows = cfg.tags.filter(function(t){ return used[t]; });
	s.edgeMap = s.edges.map(function(list){
	    var m={};
	    list.forEach(function(a){ m[a.from+'|'+a.to]=a; });
	    return m;
	});
	s.edges.forEach(function(list){
	    list.forEach(function(a){
		if(a.f){
		    a.fid = [];
		    a.f.forEach(function(name){
			var k = (s.context!=undefined && s.context!='') ? INVERSE_FEATURE_LIST[[s.context,name]] : undefined;
			if(k!==undefined) a.fid.push(k);
			k = INVERSE_FEATURE_LIST[['',name]];
			if(k!==undefined) a.fid.push(k);
		    });
		}
	    });
	});
	if(s.context!=undefined) cfg.byContext[s.context]=s;
    });
    return cfg;
}

function trellis_sentence_for_context(c){
    if(!TRELLIS) return null;
    return TRELLIS.byContext[CONTEXTS[c]] || null;
}

function trellis_is_structured(c){
    return !!(TRELLIS && TRELLIS.structured && trellis_sentence_for_context(c));
}

/*** arithmetic ***/

function logadd(a,b){
    if(a===-Infinity) return b;
    if(b===-Infinity) return a;
    return a>b ? a+Math.log1p(Math.exp(b-a)) : b+Math.log1p(Math.exp(a-b));
}

//log of an edge's weight under feature weights theta
function trellis_edge_logweight(a, theta){
    var lw=0;
    for(var i=0;i<a.fid.length;i++){
	lw += theta[a.fid[i]]*THETA_STRENGTH[a.fid[i]];
    }
    return lw;
}

//forward-backward and Viterbi on sentence s.  Positions are 0 (start
//state), 1..n (the words), n+1 (stop state).
function trellis_run(s, theta){
    theta = theta || THETA;
    var P = s.words.length+2;
    var la=[], lb=[], lv=[], back=[], lw=[];
    for(var p=0;p<P;p++){
	la[p]={}; lb[p]={}; lv[p]={}; back[p]={};
	s.tagsAt[p].forEach(function(t){ la[p][t]=-Infinity; lb[p][t]=-Infinity; lv[p][t]=-Infinity; });
    }
    la[0][TRELLIS.start]=0; lv[0][TRELLIS.start]=0;
    for(var p=1;p<P;p++){
	lw[p] = s.edges[p-1].map(function(a){ return trellis_edge_logweight(a,theta); });
	s.edges[p-1].forEach(function(a,k){
	    if(la[p-1][a.from]===undefined) return;
	    la[p][a.to] = logadd(la[p][a.to], la[p-1][a.from]+lw[p][k]);
	    var v = lv[p-1][a.from]+lw[p][k];
	    if(v > lv[p][a.to]){ lv[p][a.to]=v; back[p][a.to]=a.from; }
	});
    }
    lb[P-1][TRELLIS.stop]=0;
    for(var p=P-1;p>=1;p--){
	s.edges[p-1].forEach(function(a,k){
	    if(lb[p][a.to]===undefined || lb[p-1][a.from]===undefined) return;
	    lb[p-1][a.from] = logadd(lb[p-1][a.from], lw[p][k]+lb[p][a.to]);
	});
    }
    var logZ = la[P-1][TRELLIS.stop];
    var post=[], edgePost=[];
    for(var p=0;p<P;p++){
	post[p]={};
	s.tagsAt[p].forEach(function(t){ post[p][t]=Math.exp(la[p][t]+lb[p][t]-logZ); });
	if(p>0){
	    edgePost[p] = s.edges[p-1].map(function(a,k){
		return Math.exp(la[p-1][a.from]+lw[p][k]+lb[p][a.to]-logZ);
	    });
	}
    }
    //best path, read off the back pointers
    var best=[], t=TRELLIS.stop;
    for(var p=P-1;p>=2;p--){ t=back[p][t]; best.unshift(t); }
    //everything on any path that ties for best: its best score up to here
    //plus its best score from here on reaches the overall best.  Any path
    //made only of such edges is itself a best path.
    var bestWeight=lv[P-1][TRELLIS.stop], lvb=[];
    for(var p=0;p<P;p++){
	lvb[p]={};
	s.tagsAt[p].forEach(function(t){ lvb[p][t]=-Infinity; });
    }
    lvb[P-1][TRELLIS.stop]=0;
    for(var p=P-1;p>=1;p--){
	s.edges[p-1].forEach(function(a,k){
	    lvb[p-1][a.from]=Math.max(lvb[p-1][a.from], lw[p][k]+lvb[p][a.to]);
	});
    }
    var bestEdges=[], bestStates=[], nbest={};
    nbest[TRELLIS.start]=1;
    for(var p=1;p<P;p++){
	var nnext={};
	bestEdges[p]=s.edges[p-1].map(function(a,k){
	    var on = lv[p-1][a.from]+lw[p][k]+lvb[p][a.to] > bestWeight-TRELLIS_TIE;
	    if(on) nnext[a.to]=(nnext[a.to]||0)+(nbest[a.from]||0);
	    return on;
	});
	bestStates[p]={};
	s.tagsAt[p].forEach(function(t){ bestStates[p][t]=!!nnext[t]; });
	nbest=nnext;
    }
    //most probable tag at each position (each chosen separately)
    //(maxpost breaks ties; maxpostLabels shows them, as in "N/V")
    var maxpost=[], maxpostLabels=[];
    for(var p=1;p<P-1;p++){
	var bt=null;
	s.tagsAt[p].forEach(function(t){ if(bt===null || post[p][t]>post[p][bt]) bt=t; });
	maxpost.push(bt);
	maxpostLabels.push(s.tagsAt[p].filter(function(t){
	    return post[p][t] > post[p][bt]-(TRELLIS.tag_tie || TRELLIS_TIE);
	}).join('/'));
    }
    return {logZ:logZ, la:la, lb:lb, lw:lw, post:post, edgePost:edgePost,
	    best:best, bestCount:nbest[TRELLIS.stop], bestEdges:bestEdges, bestStates:bestStates,
	    bestTied:nbest[TRELLIS.stop]>1, bestLogWeight:bestWeight,
	    maxpost:maxpost, maxpostLabels:maxpostLabels,
	    npaths:trellis_count_paths(s)};
}

function trellis_count_paths(s){
    var cnt={}; cnt[TRELLIS.start]=1;
    for(var p=1;p<s.tagsAt.length;p++){
	var nc={};
	s.edges[p-1].forEach(function(a){ nc[a.to]=(nc[a.to]||0)+(cnt[a.from]||0); });
	cnt=nc;
    }
    return cnt[TRELLIS.stop];
}

//the edges along a tagging (list of tags, one per word)
function trellis_path_edges(s, tags){
    var full=[TRELLIS.start].concat(tags).concat([TRELLIS.stop]);
    var edges=[];
    for(var p=1;p<full.length;p++){
	var a = s.edgeMap[p-1][full[p-1]+'|'+full[p]];
	if(!a) return null;
	edges.push(a);
    }
    return edges;
}

/*** hooks used by compute.js ***/

function trellis_partition_function(c, theta){
    var z = Math.exp(trellis_run(trellis_sentence_for_context(c), theta).logZ);
    return isFinite(z) ? z : Number.MAX_VALUE;
}

//add scale * (expected feature counts under the current model) to
//expcounts, and subtract the same from gradient
function trellis_add_expected_counts(c, scale, expcounts, gradient){
    if(!scale) return;
    var s = trellis_sentence_for_context(c);
    var r = trellis_run(s);
    for(var p=1;p<s.tagsAt.length;p++){
	s.edges[p-1].forEach(function(a,k){
	    var e = scale*r.edgePost[p][k];
	    a.fid.forEach(function(f){
		expcounts[f] += e*THETA_STRENGTH[f];
		gradient[f] -= e*THETA_STRENGTH[f];
	    });
	});
    }
}

/*** taggings recorded in the main model's data ***/

//the observed taggings of sentence s, as [[tags, count], ...]
function trellis_observed_taggings(s){
    var c = REVERSE_CONTEXTS[s.context];
    if(c===undefined) return [];
    return TYPE_OBSERVATIONS_IN_C[c].map(function(t){
	var v = (VISUALS[c][t] && VISUALS[c][t]['value']) || '';
	return [v.split(' ').filter(function(x){return x!=='';}), COUNTS[c][t]];
    });
}

/*** drawing ***/

function trellis_fmt(x){
    if(x===0) return '0';
    if(!isFinite(x)) return x>0 ? '∞' : '-∞';
    var ax=Math.abs(x);
    if(ax>=0.001 && ax<10000) return parseFloat(x.toPrecision(3)).toString();
    return x.toExponential(1).replace('e','×10^').replace('+','');
}

//a tag sequence for display: "H H C", or "HHCCCHHH" when long
function trellis_seq(tags){
    var short = tags.every(function(t){ return t.length==1; });
    return tags.join(short && tags.length>8 ? '' : ' ');
}

function trellis_fmt_html(x){
    var t = trellis_fmt(x);
    var m = t.match(/^(.*)×10\^(.*)$/);
    return m ? m[1]+'&times;10<sup>'+m[2]+'</sup>' : t;
}

//the "Show gradient" setting from before a lesson that turns it on
TRELLIS_SAVED_SHOW_GRADIENT=null;

function trellis_set_show_gradient(on){
    jQuery('#show_gradient').prop('checked',on);
    SHOW_GRADIENTS=on;
    display_gradient_hints_portions();
    if(FEATURE_LIST.length){
	recompute_partition_function();
	compute_gradient();
    }
}

function trellis_setup_show_gradient(){
    if(TRELLIS && TRELLIS.show_gradient){
	if(TRELLIS_SAVED_SHOW_GRADIENT===null){
	    TRELLIS_SAVED_SHOW_GRADIENT = !!SHOW_GRADIENTS;
	}
	trellis_set_show_gradient(true);
    } else if(TRELLIS_SAVED_SHOW_GRADIENT!==null){
	trellis_set_show_gradient(TRELLIS_SAVED_SHOW_GRADIENT);
	TRELLIS_SAVED_SHOW_GRADIENT=null;
    }
}

function trellis_setup(){
    trellis_setup_show_gradient();
    if(TRELLIS && TRELLIS.step_size){
	SOLVE_STEP = ORIG_SOLVE_STEP = TRELLIS.step_size;
    }
    jQuery('#gradient_step').val(SOLVE_STEP);
    if(!TRELLIS){
	jQuery('#trellis_area').hide();
	return;
    }
    TRELLIS.ready = true;
    var sel = jQuery('#trellis_select').empty();
    TRELLIS.sentences.forEach(function(s,i){
	var label = s.label || s.context || s.words.join(' ');
	sel.append(jQuery('<option/>').attr('value',i).text(label));
    });
    TRELLIS_UI.sel = 0;
    sel.val(0);
    jQuery('#trellis_select_span').toggle(TRELLIS.sentences.length>1);
    jQuery('#trellis_x_name').text(TRELLIS.x_name);
    jQuery('#trellis_show_tags_span').toggle(!!TRELLIS.tag_labels);
    jQuery('#trellis_show_ab_span').toggle(!TRELLIS.hide_ab);
    jQuery('#trellis_key_observed_text').text(TRELLIS.observed_name || 'observed in the training data');
    if(TRELLIS.best_off) TRELLIS_UI.show_best = false;
    jQuery('#trellis_show_ab').prop('checked', TRELLIS_UI.show_ab);
    jQuery('#trellis_show_best').prop('checked', TRELLIS_UI.show_best);
    jQuery('#trellis_show_edge_probs').prop('checked', TRELLIS_UI.show_edge_probs);
    jQuery('#trellis_show_tags').prop('checked', TRELLIS_UI.show_tags);
    jQuery('.trellis_key_plain').toggle(!TRELLIS.compare_counts);
    jQuery('.trellis_key_compare').toggle(!!TRELLIS.compare_counts);
    jQuery('#trellis_key .trellis_hint').text('Hover over a state or an edge for '+(TRELLIS.compare_counts ? 'its counts.' : 'details.'));
    jQuery('#trellis_key_best_main').css('stroke', trellis_best_color());
    jQuery('#trellis_key_best_outline').css('stroke', TRELLIS.best_outline || 'none');
    trellis_setup_datasets();
    jQuery('#trellis_area').show();
    trellis_redraw();
    if(TRELLIS.compare_counts) update_all_qtip_counts();
}

//replace the exact ties that trellis_run found with near ties.  This lists the
//paths, since near ties don't have the property that exact ones do: a route
//made only of marked edges isn't always a near-tied path.
function trellis_apply_near_ties(s, r){
    var count=0, near=false, edges=[], states=[];
    for(var p=1;p<s.tagsAt.length;p++){
	edges[p]=s.edges[p-1].map(function(){ return false; });
	states[p]={};
    }
    trellis_all_taggings(s).forEach(function(tags){
	var path=trellis_path_edges(s,tags);
	var lw=path.reduce(function(sum,a){ return sum+trellis_edge_logweight(a,THETA); },0);
	if(lw <= r.bestLogWeight-TRELLIS.best_tie) return;
	count++;
	if(lw < r.bestLogWeight-TRELLIS_TIE) near=true;
	path.forEach(function(a,i){
	    edges[i+1][s.edges[i].indexOf(a)]=true;
	    states[i+1][a.to]=true;
	});
    });
    r.bestCount=count; r.bestTied=count>1; r.bestEdges=edges; r.bestStates=states; r.bestNear=near;
}

function trellis_redraw(){
    if(!TRELLIS || !TRELLIS.ready || !svg_loaded) return;
    trellis_hide_count_tip(); //the state or edge under it is about to be replaced
    var s = TRELLIS.sentences[TRELLIS_UI.sel];
    var r = trellis_run(s);
    if(TRELLIS.best_tie) trellis_apply_near_ties(s, r);
    trellis_draw_svg(s, r);
    trellis_draw_components(s, r);
    trellis_write_summary(s, r);
}

//frequency of each edge among the observed taggings: p -> "from|to" -> freq
function trellis_observed_edge_freqs(s){
    var taggings = trellis_observed_taggings(s);
    var total = taggings.reduce(function(a,d){ return a+d[1]; },0);
    var freq = [];
    if(!total) return freq;
    taggings.forEach(function(d){
	var full=[TRELLIS.start].concat(d[0]).concat([TRELLIS.stop]);
	for(var p=1;p<full.length;p++){
	    freq[p] = freq[p] || {};
	    var key = full[p-1]+'|'+full[p];
	    freq[p][key] = (freq[p][key]||0) + d[1]/total;
	}
    });
    return freq;
}

function trellis_best_color(){
    return TRELLIS.best_color || TRELLIS_COLORS.best;
}

//one dashed segment of a best path, with its outline if the lesson has one.
//The outline's dashes start 1px earlier and end 1px later, so that it also
//closes off each dash, and its gaps let the edge's own color show through.
function trellis_best_segment(parent, x1, y1, x2, y2, width, dash, gap, cls){
    var line = function(){
	return parent.append('line').attr('x1',x1).attr('y1',y1).attr('x2',x2).attr('y2',y2);
    };
    if(TRELLIS.best_outline){
	line().style('stroke',TRELLIS.best_outline).attr('stroke-width',width+1.6)
	    .attr('stroke-dasharray',(dash+2)+','+(gap-2)).attr('stroke-dashoffset',1)
	    .attr('class','trellis_best_outline');
    }
    line().style('stroke',trellis_best_color()).attr('stroke-width',width)
	.attr('stroke-dasharray',dash+','+gap).attr('class',cls||'');
}

//red, blue or gray, as in the other lessons: is the expected count too low,
//too high, or about right?  (Unlike determine_color, an outcome that was
//never observed can still be too high.)
function trellis_count_color(expected, observed){
    if(Math.abs(expected-observed) < TRELLIS_COUNT_TOL) return TRELLIS_COLORS.equal;
    return expected<observed ? TRELLIS_COLORS.too_low : TRELLIS_COLORS.too_high;
}

/*** the counts in tooltips ***/

function trellis_count_text_color(expected, observed){
    if(Math.abs(expected-observed) < TRELLIS_COUNT_TOL) return COUNTS_EQUAL;
    return expected<observed ? COUNTS_TOO_LOW : COUNTS_TOO_HIGH;
}

function trellis_count_html(text, color){
    return '<span class="bold" style="color:'+color+';">'+text+'</span>';
}

function trellis_observed_html(observed){
    return trellis_count_html(observed, COUNTS_EQUAL);
}

//expected counts are fractions, so they always show their decimals
function trellis_expected_html(expected, observed){
    return trellis_count_html(expected.toFixed(2), trellis_count_text_color(expected,observed));
}

function trellis_count_tip(c){
    return 'Observed Count: '+trellis_observed_html(c.observed)+
	'<br />Expected Count: '+trellis_expected_html(c.expected,c.observed);
}

//each feature's counts in the selected sentence (all 0 if it's held out)
function trellis_sentence_feature_counts(){
    if(!TRELLIS.ready) return null;
    var s = TRELLIS.sentences[TRELLIS_UI.sel], counts = trellis_observed_counts(s);
    var r = trellis_run(s), out = {observed:{}, expected:{}};
    for(var p=1;p<s.tagsAt.length;p++){
	s.edges[p-1].forEach(function(a,k){
	    a.f.forEach(function(name){
		var x = INVERSE_FEATURE_LIST[['',name]];
		out.observed[x] = (out.observed[x]||0) + (counts.edges[p+'|'+a.from+'|'+a.to]||0);
		out.expected[x] = (out.expected[x]||0) + counts.N*r.edgePost[p][k];
	    });
	});
    }
    return out;
}

function trellis_feature_tip(x, sentence){
    var o = OBS_FEAT_COUNT[x], e = EXP_FEAT_COUNT[x];
    var line = function(label, total, part){
	return '<tr><td>'+label+' Count:</td><td class="trellis_tip_number">'+total+'</td>'+
	    (sentence ? '<td>this sentence:</td><td class="trellis_tip_number">'+part+'</td>' : '')+'</tr>';
    };
    var so = sentence ? (sentence.observed[x]||0) : 0, se = sentence ? (sentence.expected[x]||0) : 0;
    return '<table class="trellis_tip_table">'+
	line('Observed', trellis_observed_html(o), trellis_observed_html(so))+
	line('Expected', trellis_expected_html(e,o), trellis_expected_html(se,so))+'</table>';
}

//One tooltip serves the whole trellis, since redrawing replaces every state and edge.
function trellis_init_count_tips(){
    var area = jQuery('#trellis_draw');
    area.qtip({
	content:{text:' '},
	position:{target:'mouse', viewport:jQuery(window), adjust:{x:14, y:14, mouse:true, method:'flip shift'}},
	show:{event:false},
	hide:{event:false},
	style:{classes:'ui-tooltip'}
    });
    var find = function(e){
	for(var el=e.target; el && el!==area[0]; el=el.parentNode){
	    if(el.getAttribute('count_tip')) return el;
	}
	return null;
    };
    area.bind('mouseover', function(e){
	var el = find(e);
	if(!el || el===TRELLIS_TIP_TARGET) return;
	trellis_hide_count_tip();
	TRELLIS_TIP_TARGET = el;
	el.setAttribute('class', (el.getAttribute('class')||'')+' trellis_hovered');
	area.qtip('api').set('content.text', el.getAttribute('count_tip'));
	area.qtip('api').show(e);
    }).bind('mouseout', function(e){
	if(find(e)) trellis_hide_count_tip();
    });
}

function trellis_hide_count_tip(){
    if(!TRELLIS_TIP_TARGET) return;
    var cls = TRELLIS_TIP_TARGET.getAttribute('class')||'';
    TRELLIS_TIP_TARGET.setAttribute('class', cls.replace(' trellis_hovered',''));
    TRELLIS_TIP_TARGET = null;
    jQuery('#trellis_draw').qtip('api').hide();
}

//this sentence's observed counts, for each edge (p|from|to) and state (p|tag)
function trellis_observed_counts(s){
    var counts={N:NUM_TOKENS_C[REVERSE_CONTEXTS[s.context]]||0, edges:{}, states:{}};
    trellis_observed_taggings(s).forEach(function(d){
	if(!d[1]) return;
	var full=[TRELLIS.start].concat(d[0]).concat([TRELLIS.stop]);
	for(var p=1;p<full.length;p++){
	    var ek=p+'|'+full[p-1]+'|'+full[p], sk=p+'|'+full[p];
	    counts.edges[ek]=(counts.edges[ek]||0)+d[1];
	    counts.states[sk]=(counts.states[sk]||0)+d[1];
	}
    });
    return counts;
}

//whether to mark the best paths: a single winner, or (in lessons that ask for
//it) a tie among some paths.  When all the paths tie, marking them says nothing.
function trellis_mark_best(r){
    if(!TRELLIS_UI.show_best) return false;
    return !r.bestTied || (!!TRELLIS.highlight_ties && r.bestCount<r.npaths);
}

function trellis_best_note(r){
    if(!r.bestTied) return '';
    var tie = r.bestNear ? 'nearly tie' : 'tie';
    if(r.bestCount==r.npaths) return 'all paths '+tie+', so none is marked';
    return TRELLIS.highlight_ties ? r.bestCount+' paths '+tie : 'several tie, so none is marked';
}

//the most probable tags at position p, each with its color:
//blue if it isn't a most-observed tag here (it's too probable);
//red if it is one, but a tag shown beside it isn't (it's not probable enough);
//gray otherwise (fine for decoding)
function trellis_tag_labels(s, r, p, counts){
    var top=0;
    s.tagsAt[p].forEach(function(t){ top=Math.max(top, counts.states[p+'|'+t]||0); });
    var tags=r.maxpostLabels[p-1].split('/');
    var is_top=function(t){ return (counts.states[p+'|'+t]||0)==top; };
    var any_wrong=tags.some(function(t){ return !is_top(t); });
    return tags.map(function(t){
	return {tag:t, color: !is_top(t) ? TRELLIS_COLORS.too_high : (any_wrong ? TRELLIS_COLORS.too_low : TRELLIS_COLORS.tag_fine)};
    });
}

function trellis_draw_svg(s, r){
    var area = jQuery('#trellis_draw');
    area.empty();
    var tags = s.rows, K = tags.length, n = s.words.length, P = n+2;
    area.toggleClass('trellis_draw_beside', !!TRELLIS.z_beside);
    var avail = Math.max(420, area.width() - (TRELLIS.z_beside ? 200 : 0));
    var left = 46, right = 46;
    var colW = Math.min(132, (avail-left-right)/(P-1));
    var compact = colW < 76;
    var rad = compact ? 10 : 17;
    var rowH = compact ? 40 : 66;
    var top = compact ? 34 : ((TRELLIS.position_label || TRELLIS.tag_labels) ? 66 : 52);
    var width = left + (P-1)*colW + right;
    var height = top + K*rowH + (compact ? 6 : 16);
    var xs = function(p){ return left + p*colW; };
    var ys = function(p,t){
	if(p==0 || p==P-1) return top + K*rowH/2;
	return top + tags.indexOf(t)*rowH + rowH/2;
    };
    var nodeR = function(p){ return (p==0 || p==P-1) ? 6 : rad; };
    var svg = d3.select('#trellis_draw').append('svg')
	.attr('width', width).attr('height', height)
	.attr('id','trellis_svg');
    if(TRELLIS.z_beside){
	jQuery('<div id="trellis_z_beside"/>').appendTo(area)
	    .html(r.npaths+' paths<br/>total weight <i>Z</i> = '+trellis_fmt_html(Math.exp(r.logZ)));
    }

    //column headings: the words (and "day i")
    for(var p=1;p<P-1;p++){
	svg.append('text').text(s.words[p-1])
	    .attr('x',xs(p)).attr('y', compact ? 16 : 22)
	    .attr('text-anchor','middle').attr('class','trellis_word');
	if(TRELLIS.tag_labels && TRELLIS_UI.show_tags){
	    var label = svg.append('text').attr('x',xs(p)).attr('y',40)
		.attr('text-anchor','middle').attr('class','trellis_tag_label');
	    trellis_tag_labels(s,r,p,trellis_observed_counts(s)).forEach(function(d,i){
		if(i>0) label.append('tspan').text('/').style('fill',TRELLIS_COLORS.tag_fine);
		label.append('tspan').text(d.tag).style('fill',d.color);
	    });
	}
	if(TRELLIS.position_label && !compact){
	    svg.append('text').text(TRELLIS.position_label+' '+p)
		.attr('x',xs(p)).attr('y',38)
		.attr('text-anchor','middle').attr('class','trellis_poslabel');
	}
    }
    //row labels: the tags
    tags.forEach(function(t){
	svg.append('text').text(t)
	    .attr('x', 14).attr('y', ys(1,t)+5)
	    .attr('text-anchor','middle').attr('class','trellis_taglabel');
    });

    //a segment between two nodes, trimmed so it meets their edges
    var seg = function(p,a){
	var x1=xs(p-1), y1=ys(p-1,a.from), x2=xs(p), y2=ys(p,a.to);
	var dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
	var r1=nodeR(p-1)+1, r2=nodeR(p)+1;
	return {x1:x1+dx*r1/len, y1:y1+dy*r1/len, x2:x2-dx*r2/len, y2:y2-dy*r2/len};
    };
    var obsf = trellis_observed_edge_freqs(s);
    var counts = TRELLIS.compare_counts ? trellis_observed_counts(s) : null;
    var gEdges = svg.append('g');
    var gHover = svg.append('g');
    for(var p=1;p<P;p++){
	s.edges[p-1].forEach(function(a,k){
	    var g = seg(p,a), key=a.from+'|'+a.to;
	    var of = obsf[p] ? (obsf[p][key]||0) : 0;
	    var ap = r.edgePost[p][k];
	    var edge_counts = counts ? {observed:counts.edges[p+'|'+key]||0, expected:counts.N*ap} : null;
	    if(of>0 && !counts){
		gEdges.append('line').attr('x1',g.x1).attr('y1',g.y1).attr('x2',g.x2).attr('y2',g.y2)
		    .style('stroke',TRELLIS_COLORS.observed).attr('stroke-width',3+8*of)
		    .attr('stroke-linecap','round').attr('class','trellis_obs_edge');
	    }
	    gEdges.append('line').attr('x1',g.x1).attr('y1',g.y1).attr('x2',g.x2).attr('y2',g.y2)
		.style('stroke',counts ? trellis_count_color(edge_counts.expected,edge_counts.observed) : TRELLIS_COLORS.expected)
		.attr('stroke-width',0.75+8*ap)
		.attr('stroke-opacity', ap<0.005 ? 0.3 : 0.8)
		.attr('class','trellis_exp_edge');
	    //a wide invisible line, so that thin edges are easy to point at
	    var hover = gHover.append('line').attr('x1',g.x1).attr('y1',g.y1).attr('x2',g.x2).attr('y2',g.y2)
		.style('stroke','white').attr('stroke-opacity',0).attr('stroke-width',10);
	    if(!counts) hover.append('title').text(trellis_edge_tooltip(s,p,a,r.lw[p][k],ap,of));
	    else hover.attr('count_tip',trellis_count_tip(edge_counts));
	});
    }

    //nodes
    var gNodes = svg.append('g');
    for(var p=0;p<P;p++){
	s.tagsAt[p].forEach(function(t){
	    var x=xs(p), y=ys(p,t), pr=r.post[p][t];
	    var state_counts = counts ? {observed:counts.states[p+'|'+t]||0, expected:counts.N*pr} : null;
	    var title = trellis_node_tooltip(s,p,t,r);
	    if(p==0 || p==P-1){
		var end = gNodes.append('circle').attr('cx',x).attr('cy',y).attr('r',6).attr('fill','#666');
		if(!counts) end.append('title').text(title);
		gNodes.append('text').text(t).attr('x',x).attr('y',y+20)
		    .attr('text-anchor','middle').attr('class','trellis_endlabel');
	    } else{
		var node = gNodes.append('g');
		node.append('circle').attr('cx',x).attr('cy',y).attr('r',rad)
		    .attr('fill','white').style('stroke','#999');
		node.append('circle').attr('cx',x).attr('cy',y).attr('r',rad)
		    .attr('fill',counts ? trellis_count_color(state_counts.expected,state_counts.observed) : TRELLIS_COLORS.expected)
		    .attr('fill-opacity',Math.max(pr,0))
		    .style('stroke','#999');
		if(!compact){
		    node.append('text').text(pr.toFixed(2))
			.attr('x',x).attr('y',y+4).attr('text-anchor','middle')
			.attr('class','trellis_nodeprob')
			.attr('fill', pr>(counts ? 0.7 : 0.5) ? 'white' : TRELLIS_COLORS.ink);
		}
		if(!counts) node.append('title').text(title);
		else node.attr('count_tip',trellis_count_tip(state_counts));
	    }
	    if(TRELLIS_UI.show_ab && !compact){
		var ab = [];
		if(p<P-1) ab.push(['α = '+trellis_fmt(Math.exp(r.la[p][t])), -1]);
		if(p>0) ab.push(['β = '+trellis_fmt(Math.exp(r.lb[p][t])), 1]);
		if(p==P-1) ab = [['α = '+trellis_fmt(Math.exp(r.la[p][t])), 1]];
		if(p==0) ab = [['β = '+trellis_fmt(Math.exp(r.lb[p][t])), 1]];
		ab.forEach(function(d){
		    var off = (p==0 || p==P-1) ? 32 : rad+(d[1]<0 ? 6 : 15);
		    gNodes.append('text').text(d[0]).attr('x',x).attr('y',y+d[1]*off)
			.attr('text-anchor','middle').attr('class','trellis_ab');
		});
	    }
	});
    }

    //best path, drawn on top
    var note = trellis_best_note(r);
    jQuery('#trellis_best_tied').text(note ? '('+note+')' : '').toggle(TRELLIS_UI.show_best && note!=='');
    jQuery('#trellis_key_best').toggle(TRELLIS_UI.show_best);
    //a held-out sentence is all gray, so these colors say nothing about it
    var trained = !!counts && counts.N>0;
    jQuery('.trellis_key_counts').toggle(trained);
    jQuery('#trellis_key_tags').toggle(!!TRELLIS.tag_labels && TRELLIS_UI.show_tags && trained);
    if(trellis_mark_best(r)){
	var gBest = svg.append('g').attr('class','trellis_best');
	if(counts) gBest.style('pointer-events','none'); //or it blocks the count tooltips under it
	for(var p=1;p<P;p++){
	    s.edges[p-1].forEach(function(a,k){
		if(!r.bestEdges[p][k]) return;
		var g = seg(p,a);
		trellis_best_segment(gBest, g.x1, g.y1, g.x2, g.y2, 3, 7, 5);
	    });
	    if(p<P-1){
		s.tagsAt[p].forEach(function(t){
		    if(!r.bestStates[p][t]) return;
		    if(TRELLIS.best_outline){
			gBest.append('circle').attr('cx',xs(p)).attr('cy',ys(p,t)).attr('r',rad+3)
			    .attr('fill','none').style('stroke',TRELLIS.best_outline).attr('stroke-width',3.6);
		    }
		    gBest.append('circle').attr('cx',xs(p)).attr('cy',ys(p,t)).attr('r',rad+3)
			.attr('fill','none').style('stroke',trellis_best_color()).attr('stroke-width',2);
		});
	    }
	}
    }

    //edge probabilities, on a white backing so that no line crosses the digits.
    //They sit nearer the edge's start than its middle, because two edges can
    //cross at their middles.
    if(TRELLIS_UI.show_edge_probs && !compact){
	var gEdgeProbs = svg.append('g').style('pointer-events','none');
	for(var p=1;p<P;p++){
	    s.edges[p-1].forEach(function(a,k){
		var g = seg(p,a), f = 0.3;
		var lx = g.x1+(g.x2-g.x1)*f, ly = g.y1+(g.y2-g.y1)*f;
		gEdgeProbs.append('rect').attr('x',lx-12).attr('y',ly-6.5).attr('width',24).attr('height',13)
		    .attr('fill','white').attr('fill-opacity',0.92);
		gEdgeProbs.append('text').text(r.edgePost[p][k].toFixed(2))
		    .attr('x',lx).attr('y',ly+3.5)
		    .attr('text-anchor','middle').attr('class','trellis_edgeprob')
		    .style('fill',counts ? TRELLIS_COLORS.ink : null);
	    });
	}
    }
}

/*** the paths of a sentence, drawn separately ***/

function trellis_all_taggings(s){
    var out=[[]];
    for(var p=1;p<s.tagsAt.length-1;p++){
	var next=[];
	out.forEach(function(prefix){
	    s.tagsAt[p].forEach(function(t){ next.push(prefix.concat([t])); });
	});
	out=next;
    }
    return out.filter(function(tags){ return trellis_path_edges(s,tags)!==null; });
}

//the sentence's paths, grouped by how they tag its first k words
function trellis_path_groups(s, r, k){
    var groups=[], byKey={};
    trellis_all_taggings(s).forEach(function(tags){
	var edges = trellis_path_edges(s,tags);
	var lw = edges.reduce(function(sum,a){ return sum+trellis_edge_logweight(a,THETA); },0);
	var prob = Math.exp(lw-r.logZ);
	var key = tags.slice(0,k).join(' ');
	if(!byKey[key]){
	    byKey[key] = {prefix:tags.slice(0,k), prob:0, nodes:{}, edges:{}, bestEdges:{},
			  observed:{N:0, edges:{}, states:{}}};
	    groups.push(byKey[key]);
	}
	var g = byKey[key];
	g.prob += prob;
	var full=[TRELLIS.start].concat(tags).concat([TRELLIS.stop]);
	for(var p=1;p<full.length;p++){
	    g.edges[p+'|'+full[p-1]+'|'+full[p]] = (g.edges[p+'|'+full[p-1]+'|'+full[p]]||0)+prob;
	    g.nodes[p+'|'+full[p]] = (g.nodes[p+'|'+full[p]]||0)+prob;
	    if(lw > r.bestLogWeight-(TRELLIS.best_tie || TRELLIS_TIE)) g.bestEdges[p+'|'+full[p-1]+'|'+full[p]] = true;
	}
    });
    //each group's share of the sentence's observed counts
    if(TRELLIS.compare_counts){
	trellis_observed_taggings(s).forEach(function(d){
	    if(!d[1]) return;
	    var o = byKey[d[0].slice(0,k).join(' ')].observed;
	    var full=[TRELLIS.start].concat(d[0]).concat([TRELLIS.stop]);
	    for(var p=1;p<full.length;p++){
		var ek=p+'|'+full[p-1]+'|'+full[p], sk=p+'|'+full[p];
		o.edges[ek]=(o.edges[ek]||0)+d[1];
		o.states[sk]=(o.states[sk]||0)+d[1];
	    }
	});
	var N = NUM_TOKENS_C[REVERSE_CONTEXTS[s.context]]||0;
	groups.forEach(function(g){ g.observed.N=N; });
    }
    return groups;
}

function trellis_set_disaggregate_button(on){
    var b = jQuery('#trellis_disaggregate').text(on ? 'Aggregate' : 'Disaggregate');
    if(!b.data('qtip')) return;
    //the tooltip for splitting comes from the lesson settings, so keep it to put back
    if(on && !TRELLIS_UI.split_tip){
	TRELLIS_UI.split_tip = b.qtip('option','content.text');
	b.qtip('option','content.text','Hide the disaggregated view');
    } else if(!on && TRELLIS_UI.split_tip){
	b.qtip('option','content.text',TRELLIS_UI.split_tip);
	TRELLIS_UI.split_tip = null;
    }
}

function trellis_draw_components(s, r){
    var button = jQuery('#trellis_disaggregate_span');
    var area = jQuery('#trellis_components');
    area.empty();
    button.toggle(!!s.disaggregate);
    if(!s.disaggregate || !TRELLIS_UI.disaggregate){
	area.hide();
	trellis_set_disaggregate_button(false);
	return;
    }
    trellis_set_disaggregate_button(true);
    area.show();
    var given = TRELLIS.given_name || TRELLIS.x_name;
    var k = s.disaggregate;
    var groups = trellis_path_groups(s, r, k);
    var mark = trellis_mark_best(r);
    var each = Math.min(groups.length, 4);
    var width = area.width()/each - 16;
    groups.forEach(function(g){
	var key = g.prefix.join(' ');
	var box = jQuery('<div class="trellis_component"/>').appendTo(area);
	trellis_draw_component(box[0], s, g, width, mark);
	//one label per word, showing any choices left within the group, as in "N N V/P D N"
	var labels = s.words.map(function(w,i){
	    return s.tagsAt[i+1].filter(function(t){ return g.nodes[(i+1)+'|'+t]!==undefined; }).join('/');
	});
	jQuery('<div class="trellis_component_caption"/>').appendTo(box)
	    .html('p(<b>'+labels.join(' ')+'</b> | '+given+') = '+g.prob.toFixed(3));
    });
}

//a small trellis showing one group of paths.  Its edges use the same scale
//of widths as the full trellis, where an edge's width is the total over all
//the groups.
function trellis_draw_component(container, s, g, width, mark){
    var rows=s.rows, n=s.words.length, P=n+2, left=22, right=22;
    var colW=Math.min(64, (width-left-right)/(P-1));
    var rowH=rows.length>2 ? 28 : 38, top=22, rad=rows.length>2 ? 7 : 8;
    var xs=function(p){ return left+p*colW; };
    var ys=function(p,t){
	if(p==0 || p==P-1) return top+rows.length*rowH/2;
	return top+rows.indexOf(t)*rowH+rowH/2;
    };
    var svg = d3.select(container).append('svg')
	.attr('width',left+(P-1)*colW+right).attr('height',top+rows.length*rowH+4)
	.attr('class','trellis_component_svg');
    for(var p=1;p<P-1;p++){
	svg.append('text').text(s.words[p-1]).attr('x',xs(p)).attr('y',12)
	    .attr('text-anchor','middle').attr('class','trellis_component_word');
    }
    rows.forEach(function(t){
	svg.append('text').text(t).attr('x',8).attr('y',ys(1,t)+4)
	    .attr('text-anchor','middle').attr('class','trellis_taglabel');
    });
    //only this group's states and edges
    for(var p=1;p<P;p++){
	s.edges[p-1].forEach(function(a){
	    var prob = g.edges[p+'|'+a.from+'|'+a.to];
	    if(prob===undefined) return;
	    var key = p+'|'+a.from+'|'+a.to;
	    svg.append('line').attr('x1',xs(p-1)).attr('y1',ys(p-1,a.from)).attr('x2',xs(p)).attr('y2',ys(p,a.to))
		.style('stroke',TRELLIS.compare_counts ? trellis_count_color(g.observed.N*prob,g.observed.edges[key]||0) : TRELLIS_COLORS.expected)
		.attr('stroke-width',0.75+8*prob).attr('stroke-opacity',0.8);
	});
    }
    if(mark){
	for(var p=1;p<P;p++){
	    s.edges[p-1].forEach(function(a){
		if(!g.bestEdges[p+'|'+a.from+'|'+a.to]) return;
		trellis_best_segment(svg, xs(p-1), ys(p-1,a.from), xs(p), ys(p,a.to), 2.4, 5, 4, 'trellis_component_best');
	    });
	}
    }
    for(var p=0;p<P;p++){
	s.tagsAt[p].forEach(function(t){
	    var ends = (p==0 || p==P-1), prob = g.nodes[p+'|'+t];
	    if(prob===undefined && !ends) return;
	    svg.append('circle').attr('cx',xs(p)).attr('cy',ys(p,t)).attr('r',ends ? 4 : rad)
		.attr('fill',ends ? '#666' : 'white').style('stroke','#999');
	    if(!ends){
		svg.append('circle').attr('cx',xs(p)).attr('cy',ys(p,t)).attr('r',rad)
		    .attr('fill',TRELLIS.compare_counts ? trellis_count_color(g.observed.N*prob,g.observed.states[p+'|'+t]||0) : TRELLIS_COLORS.expected)
		    .attr('fill-opacity',prob).style('stroke','#999');
	    }
	});
    }
}

function trellis_edge_name(a){
    return a.from + (TRELLIS.transition_sep===undefined ? ' → ' : TRELLIS.transition_sep) + a.to;
}


function trellis_edge_tooltip(s,p,a,lw,ap,of){
    var lines=[];
    var where = (p<=s.words.length) ? (' at '+(TRELLIS.position_label ? TRELLIS.position_label+' '+p : '"'+s.words[p-1]+'"')) : '';
    lines.push(trellis_edge_name(a)+where);
    if(a.f.length){
	lines.push('features: '+a.f.map(function(name){
	    var k=INVERSE_FEATURE_LIST[['',name]];
	    return name+' ('+(k===undefined?'0':trellis_fmt(THETA[k]))+')';
	}).join(' + '));
    } else{
	lines.push('no features fire on this edge');
    }
    lines.push('edge weight = exp('+trellis_fmt(lw)+') = '+trellis_fmt(Math.exp(lw)));
    lines.push('p(edge | '+(TRELLIS.given_name || TRELLIS.x_name)+') = '+trellis_fmt(ap));
    if(of>0) lines.push('observed frequency = '+trellis_fmt(of));
    return lines.join('\n');
}

function trellis_node_tooltip(s,p,t,r){
    var lines=[];
    if(p>0 && p<=s.words.length){
	lines.push(t+(TRELLIS.position_label ? ' on '+TRELLIS.position_label+' '+p : ' for "'+s.words[p-1]+'"'));
	if(TRELLIS.hide_ab){
	    lines.push('p('+t+' here | '+(TRELLIS.given_name || TRELLIS.x_name)+') = '+trellis_fmt(r.post[p][t]));
	    return lines.join('\n');
	}
	lines.push('probability = α·β/Z = '+trellis_fmt(r.post[p][t]));
    } else{
	lines.push(t);
	if(TRELLIS.hide_ab) return lines.join('\n');
    }
    lines.push('α = '+trellis_fmt(Math.exp(r.la[p][t]))+'   (total weight of all paths from '+TRELLIS.start+' to here)');
    lines.push('β = '+trellis_fmt(Math.exp(r.lb[p][t]))+'   (total weight of all paths from here to '+TRELLIS.stop+')');
    return lines.join('\n');
}

function trellis_write_summary(s, r){
    var lines=[];
    var Z = Math.exp(r.logZ);
    if(!TRELLIS.z_beside){
	lines.push('<b><i>Z</i></b> = '+(TRELLIS.hide_ab ? '' : '&alpha;('+TRELLIS.stop+') = ')+trellis_fmt_html(Z)+
		   ', the total weight of all '+r.npaths+' paths');
    }
    var maxpost_text = 'ost probable '+(TRELLIS.tag_name||'tag')+' at each position: <b>'+trellis_seq(r.maxpostLabels)+'</b>';
    if(TRELLIS.tag_labels){
	//they're shown under the words
    } else if(TRELLIS.hide_best_summary){
	lines.push('M'+maxpost_text);
    } else{
	var bestp = Math.exp(r.bestLogWeight - r.logZ);
	lines.push('<span class="trellis_best_key">Best path</span>: '+
		   (r.bestTied ? 'several paths tie' : '<b>'+trellis_seq(r.best)+'</b>, with probability '+trellis_fmt_html(bestp))+
		   ' &nbsp;&middot;&nbsp; M'+maxpost_text);
    }
    if(TRELLIS_UI.message){
	lines.push('<i>'+TRELLIS_UI.message+'</i>');
    }
    jQuery('#trellis_summary').html(lines.join('<br/>')).toggle(lines.length>0);
}

/*** a menu of training datasets ***/

function trellis_setup_datasets(){
    var has = !!(TRELLIS.datasets && TRELLIS.datasets.length);
    jQuery('#trellis_dataset_dt,#trellis_dataset_dd').toggle(has);
    if(!has) return;
    //these options go beside the trellis, as they go beside the counts elsewhere
    jQuery('#data_options_area').insertBefore('#trellis_area');
    var sel = jQuery('#trellis_dataset').empty();
    TRELLIS.datasets.forEach(function(d,i){
	sel.append(jQuery('<option/>').attr('value',i).text(d.name));
    });
    sel.val(0);
    trellis_list_dataset(TRELLIS.datasets[0]);
    trellis_mark_held_out();
}

//a sentence is held out if the current dataset has no observations of it
function trellis_mark_held_out(){
    TRELLIS.sentences.forEach(function(s,i){
	var held_out = !NUM_TOKENS_C[REVERSE_CONTEXTS[s.context]];
	jQuery('#trellis_select option[value="'+i+'"]').text(s.words.join(' ')+(held_out ? ' (held out)' : ''));
    });
}

//the observed counts can't be seen elsewhere, so list them
function trellis_list_dataset(d){
    var list = jQuery('#trellis_dataset_counts').empty();
    TRELLIS.sentences.forEach(function(s){
	var counts = d.counts[s.context] || {};
	var taggings = Object.keys(counts).filter(function(t){ return counts[t]>0; });
	if(!taggings.length) return;
	//each tag goes right below its word, so each sentence has its own columns
	var table = jQuery('<table class="trellis_dataset_table"/>').appendTo(list);
	var words = jQuery('<tr class="trellis_dataset_words"/>').appendTo(table);
	s.words.forEach(function(w){ jQuery('<td/>').text(w).appendTo(words); });
	taggings.forEach(function(t){
	    var row = jQuery('<tr/>').appendTo(table);
	    t.split(' ').forEach(function(tag){ jQuery('<td/>').text(tag).appendTo(row); });
	    jQuery('<td class="trellis_dataset_count"/>').text('\u00d7'+counts[t]).appendTo(row);
	});
    });
}

function trellis_use_dataset(i){
    var d = TRELLIS.datasets[i];
    TRELLIS.sentences.forEach(function(s){
	var c = REVERSE_CONTEXTS[s.context];
	var counts = d.counts[s.context] || {};
	NUM_TOKENS -= NUM_TOKENS_C[c];
	NUM_TOKENS_C[c] = 0;
	TYPE_OBSERVATIONS_IN_C[c].forEach(function(t){
	    var v = counts[VISUALS[c][t]['value']] || 0;
	    COUNTS[c][t] = v;
	    NUM_TOKENS_C[c] += v;
	});
	NUM_TOKENS += NUM_TOKENS_C[c];
	jQuery('#num_tokens_context_'+c).val(NUM_TOKENS_C[c]);
    });
    trellis_list_dataset(d);
    trellis_mark_held_out();
    compute_max_prob(get_count,MAX_EMP_PROB,MAX_EMP_PROB_TYPE,MAX_EMP_AREA, get_num_tokens);
    updateObservedImages();
    redraw_all();
}


/*** controls (bound once, from init) ***/

function trellis_init_controls(){
    trellis_init_count_tips();
    jQuery('#trellis_select').change(function(){
	TRELLIS_UI.sel = parseInt(this.value,10) || 0;
	TRELLIS_UI.message = '';
	trellis_redraw();
	if(TRELLIS.compare_counts) update_all_qtip_counts();
    });
    jQuery('#trellis_show_ab').change(function(){
	TRELLIS_UI.show_ab = this.checked; trellis_redraw();
    });
    jQuery('#trellis_show_best').change(function(){
	TRELLIS_UI.show_best = this.checked; trellis_redraw();
    });
    jQuery('#trellis_show_tags').change(function(){
	TRELLIS_UI.show_tags = this.checked; trellis_redraw();
    });
    jQuery('#trellis_show_edge_probs').change(function(){
	TRELLIS_UI.show_edge_probs = this.checked; trellis_redraw();
    });
    jQuery('#trellis_disaggregate').click(function(){
	TRELLIS_UI.disaggregate = !TRELLIS_UI.disaggregate;
	trellis_redraw(); this.blur();
    });
    jQuery('#trellis_dataset').change(function(){
	if(in_solving) return;
	trellis_use_dataset(parseInt(this.value,10) || 0);
    });
    jQuery(window).resize(function(){ trellis_redraw(); });
}
