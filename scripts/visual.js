
//when we only want to display text, let's hide some of the divs
function toggle_text_portion(){
    jQuery('#score_area').toggle();
    jQuery('#shapes_area').toggle();
    jQuery('#slider_area').toggle();
}

function hide_text_portion(){
    jQuery('#score_area').hide();
    jQuery('#shapes_area').hide();
    jQuery('#slider_area').hide();
}

function show_text_portion(){
    jQuery('#score_area').show();
    jQuery('#shapes_area').show();
    jQuery('#slider_area').show();
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
    console.log('showing loader here!');
    var i = document.createElement('img');
    i.src=loader_bar_img;
    i.id=id;
    i.style['display']='block'; i.style['margin-left']='auto'; i.style['margin-right']='auto';
    box.appendChild(i);
}
