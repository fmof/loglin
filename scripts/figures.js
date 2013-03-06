function createStar(){
    var s = document.createElement('polygon');
    s.setAttribute("points","100,10 40,180 190,60 10,60 160,180");
    return s;
}

function getMaxAreaByShape(shape){
    var ret=0.0;
    if(shape=="circle"){
	ret = Math.PI*Math.pow(SVG_HEIGHT/2-1,2);
    } else if(shape=="square"){
	ret = SVG_HEIGHT*SVG_WIDTH;
    } else if(shape=="tri" || shape=="triangle"){
	ret = 3*Math.sqrt(3)/4*Math.pow(SVG_HEIGHT/2-1,2);
    } else if(shape=="pentagon"){
	ret = 25*Math.pow(SVG_HEIGHT/2-1,2)*Math.sqrt(25+10*Math.sqrt(5))/(50+10*Math.sqrt(5));
    }
    return ret;
}

function createCircleRadius(count,max_count,scale){
    //when maximal, I want radius to be half of height
    //I need to absorb the 1/Math.sqrt(Math.PI) into the scale...
    //so don't even bother including it
    var ret= Math.sqrt(count/(max_count*Math.PI));
    return ret<1 ? 1 : ret;
}

function createPentagonPoints(cx,width,cy,height,count,max_count,scale){
    var points=[];
    var a = 2*Math.sqrt(count/max_count)/Math.sqrt(Math.sqrt(25+10*Math.sqrt(5)));
    var r=.1*a*Math.sqrt(50+10*Math.sqrt(5));
    r=Math.max(r,1);
    var c1=.25*(Math.sqrt(5)-1)*r;
    var c2=.25*(Math.sqrt(5)+1)*r;
    var s1=.25*Math.sqrt(10+2*Math.sqrt(5))*r;
    var s2=.25*Math.sqrt(10-2*Math.sqrt(5))*r;    
    var b = Math.sqrt(r*r-.25*a*a);
    var b1= Math.sqrt(r*r+.25*a*a);
    var xt = r*Math.cos(Math.PI/10);
    var yt = r*Math.sin(Math.PI/10);
    points.push([cx,cy-r]);
    points.push([cx+xt,cy-yt]);
    points.push([cx+a/2,cy+b]);
    points.push([cx-a/2,cy+b]);
    points.push([cx-xt,cy-yt]);
    return points;
}

function createTrianglePoints(cx,width,cy,height,count,max_count,scale){
    var points=[];
    var r = Math.max(1,Math.sqrt(3)/3 * Math.sqrt(4*count/(Math.sqrt(3)*max_count)));
    var yoffset = (cy+r/2)/8;
    points.push([cx,cy - r + yoffset]);
    points.push([cx - r * Math.sqrt(3)/2, cy + r/2 + yoffset]);
    points.push([cx + r * Math.sqrt(3)/2, cy + r/2 + yoffset]);
    return points;
}
