
//when we only want to display text, let's hide some of the divs
function toggle_text_portion(){
    jQuery('#instruction_wrapper').toggle();
}

function hide_text_portion(){
    jQuery('#instruction_wrapper').hide();
}

function show_text_portion(){
    jQuery('#instruction_wrapper').show();
    //set_instructions_height(jQuery('#instruction_area'));
}

function toggle_data_portion(){
    jQuery('#score_area').toggle();
    jQuery('#shapes_area').toggle();
    jQuery('#slider_area').toggle();
}

function hide_data_portion(){
    jQuery('#score_area').hide();
    jQuery('#shapes_area').hide();
    jQuery('#slider_area').hide();
}

function show_data_portion(){
    jQuery('#score_area').show();
    jQuery('#shapes_area').show();
    jQuery('#slider_area').show();
}

function show_loader(box,id){
    var i = document.createElement('img');
    i.src=loader_bar_img;
    i.id=id;
    i.style['display']='block'; i.style['margin-left']='auto'; i.style['margin-right']='auto';
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
