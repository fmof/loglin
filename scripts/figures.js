function createShapeDictionary(){
    var shapedict={};
    shapedict["circle"] = {"human":"circle", "svg":"circle",
			   draw: function(shape_obj, shape_params){
			       shape_obj.attr('cx',shape_params.width/2)
				   .attr('cy',shape_params.height/2)
				   .attr('r', createCircleRadius(shape_params.count,
								 shape_params.max_count,
								 shape_params.scale));
			   },
			   max_area : function(){
			       return Math.PI*Math.pow(SVG_HEIGHT/2-1,2);
			   }
			  };
    
    
    shapedict["square"] = {"human":"square", "svg":"rect",
			   draw: function(shape_obj, shape_params){
			       var rwid, rhei;
			       rwid = Math.sqrt(shape_params.count/shape_params.max_count);
			       rhei=rwid;
			       shape_obj.attr('x',(shape_params.width-rwid)/2)
				   .attr("y",(shape_params.height-rhei)/2)
				   .attr("width",rwid)
				   .attr("height",rhei);
			   },
			   max_area : function(){
			       return SVG_HEIGHT*SVG_WIDTH;
			   }
			  };
    shapedict["triangle"] = {"human":"triangle", "svg":"polygon",
			     draw: function(shape_obj, shape_params){
				 shape_obj.attr('points',createTrianglePoints(shape_params.width/2,shape_params.width,shape_params.height/2,shape_params.height,shape_params.count, shape_params.max_count, shape_params.scale).map(function(d){return d.join(",");}).join(" "));
			     } ,
			     max_area : function(){
				 //version 2
				 //ret = Math.sqrt(3)*Math.pow(SVG_WIDTH-1,2)/4.0;
				 //version 1
				 //ret = 3*Math.sqrt(3)/4*Math.pow(SVG_HEIGHT/2-1,2);
				 //version 3
				 return Math.sqrt(3)/4 * Math.pow(SVG_WIDTH-1,2);
			     }
			    };
    shapedict["pentagon"] = {"human":"pentagon", "svg":"polygon",
			     draw: function(shape_obj, shape_params){
				 shape_obj.attr('points',createPentagonPoints(shape_params.width/2, shape_params.width, shape_params.height/2, shape_params.height, shape_params.count, shape_params.max_count, shape_params.scale).map(function(d){return d.join(",");}).join(" "));
			     },
			     max_area : function(){
				 return 25*Math.pow(SVG_HEIGHT/2-1,2)*Math.sqrt(25+10*Math.sqrt(5))/(50+10*Math.sqrt(5));
			     }
			    };
    shapedict["image"] = {"human":"image", "svg":"g",
			  draw: function(shape_obj, shape_params){
			      if(shape_params.first_draw){
				  shape_obj = shape_obj.append("image");
			      }
			      var rwid, rhei;
			      rwid = Math.sqrt(shape_params.count/shape_params.max_count);
			      rhei=rwid;
			      shape_obj.selectAll('image')
				  .attr("xlink:href", shape_params.value.replace(/^\"|\"$/g, ""))
				  .attr("x",(shape_params.width-rwid)/2)
				  .attr("y",(shape_params.height-rhei)/2)
				  .attr("width",rwid)
				  .attr("height",rhei);
			  },
			  max_area : function(){
			       return SVG_HEIGHT*SVG_WIDTH;
			  }
			 };
    shapedict["text"] = {"human":"text", "svg":"text"};
    return shapedict;
}

function createStar(){
    var s = document.createElement('polygon');
    s.setAttribute("points","100,10 40,180 190,60 10,60 160,180");
    return s;
}

function getMaxAreaByShape(shape){
    return SHAPE_DICTIONARY[shape].max_area();
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
    //version 1
    //var r = Math.max(1,Math.sqrt(3)/3 * Math.sqrt(4*count/(Math.sqrt(3)*max_count)));
    // var yoffset = (cy+r/2)/8;
    // points.push([cx,cy - r + yoffset]);
    // points.push([cx - r * Math.sqrt(3)/2, cy + r/2 + yoffset]);
    // points.push([cx + r * Math.sqrt(3)/2, cy + r/2 + yoffset]);
    
    //version 2
    // var R = Math.max(1,Math.sqrt(3)/2 * Math.sqrt(count*4/(max_count*Math.sqrt(3))));
    // var h = (SVG_HEIGHT-1-R)/2;
    // var w = (SVG_WIDTH-1)/2;
    // points.push([cx, cy - R/2 + h]);
    // points.push([cx-w, cy+R/2+h]);
    // points.push([cx+w, cy+R/2+h]);

    var wprime = SVG_WIDTH-1;
    var side = 2/Math.sqrt(3) * Math.sqrt(count/max_count);
    //r + s = height of triangle
    var r = side/Math.sqrt(3); var s = side*(Math.sqrt(3)/2 - 1/Math.sqrt(3));
    //var yoffset = (SVG_HEIGHT-1- side*Math.sqrt(3)/2)/2;
    var yoffset = SVG_HEIGHT-1-s-cy;
    points.push([cx, SVG_HEIGHT-1-r-s-yoffset]);
    points.push([cx - side/2, SVG_HEIGHT-1-yoffset]);
    points.push([cx + side/2, SVG_HEIGHT-1-yoffset]); 
    points.forEach(function(d,i,arr){
	var npoint = arr[(i+1)%3];
    });

    //this version balances top/bottom height
    // //version 3
    // var wprime = SVG_WIDTH-1;
    // var side = 2/Math.sqrt(3) * Math.sqrt(count/max_count);
    // var r = wprime/Math.sqrt(3); var s = wprime*(Math.sqrt(3)/2 - 1/Math.sqrt(3));
    // var yoffset = (SVG_HEIGHT-1- side*Math.sqrt(3)/2)/2;
    // points.push([cx, yoffset]);
    // points.push([cx - side/2, SVG_HEIGHT-yoffset]);
    // points.push([cx + side/2, SVG_HEIGHT-yoffset]); 
    
    return points;
}
