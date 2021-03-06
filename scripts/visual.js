
//when we only want to display text, let's hide some of the divs
function toggle_text_portion(){
    jQuery('#instruction_wrapper').toggle();
}

function hide_text_portion(){
    jQuery('#instruction_wrapper').hide();
}

function show_text_portion(){
    jQuery('#instruction_wrapper').show();
}

function j_hide_data(){
    return jQuery('#score_area,#data_area,#slider_area');
}

function toggle_data_portion(){
    j_hide_data().toggle();
}
function hide_data_portion(){
    j_hide_data().hide();
}
function show_data_portion(){
    j_hide_data().show();
}

function display_gradient_hints_portions(){
    if(SHOW_GRADIENTS){
	jQuery('#gradient_hinting_div').show();
    } else{
	if(((GLOBAL_SETTINGS!={} || GLOBAL_SETTINGS!=null) &&
	   GLOBAL_SETTINGS.hide!=null &&
	   "#gradient_hinting_div" in GLOBAL_SETTINGS.hide.list) ||
	   ((LESSON_SETTINGS!={} || LESSON_SETTINGS!=null) &&
	   LESSON_SETTINGS.hide!=null &&
	   "#gradient_hinting_div" in LESSON_SETTINGS.hide.list)){
	    jQuery('#gradient_hinting_div').hide();
	}
    }
}

function show_loader(box,id){
    var i = document.createElement('img');
    i.src=loader_bar_img;
    i.id=id;
    box.append(i);
}

//box is jQuery object
//height is pixels
function set_instructions_height(box){
    set_height(box, 165);
}

function set_height(box, height){
    //parse base-10
    var cssheight = parseInt(box.css('height'),10);
    if(cssheight > height){
    	cssheight= height;
    } 
    box.css('height', cssheight +'px');
}

function display_number_solving_iterations(iter_num){
    return iter_num + " iteration" + (iter_num>1?"s":"") + " done";
}

