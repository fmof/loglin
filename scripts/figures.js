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
				  shape_obj.append("rect");
				  shape_obj.append("image");
			      }
			      var border = 4;
			      var rwid, rhei;
			      var t = Math.sqrt(shape_params.count/shape_params.max_count);
			      rwid = t<1e-5 ? 0 : Math.max(1e-5,t);
			      rhei=rwid;
			      shape_obj.selectAll('rect')
				  .attr("x",(shape_params.width-rwid)/2)
				  .attr("y",(shape_params.height-rhei)/2)
				  .attr("width",rwid)
				  .attr("height",rhei)
				  .attr("fill","white")
				  .attr("opacity",1);
			      var erwid = t<1e-7 ? 0 : Math.max(1e-5, rwid-2*border);
			      var erhei = t<1e-7 ? 0 : Math.max(1e-5, rhei-2*border);
			      if(!shape_params.is_observed){
				  shape_obj.selectAll('image')
				      .attr("xlink:href", shape_params.value.replace(/^\"|\"$/g, ""))
				      .attr("x",(shape_params.width-rwid)/2 + border)
				      .attr("y",(shape_params.height-rhei)/2 + border)
				      .attr("width",erwid)
				      .attr("height",erhei);
			      }
			  },
			  skip_opacity : true,
			  max_area : function(){
			       return SVG_HEIGHT*SVG_WIDTH;
			  }
			 };
    shapedict["text"] = {"human":"text", "svg":"g",
			 draw : function(shape_obj, shape_params){
			     var spl_nl = shape_params.value.split("\\n");
			     var base_y = 50;
			     if(shape_params.first_draw){
				 shape_obj.append("rect");
				 shape_obj.append("text");
			     }
			     var objtoopon = shape_obj.selectAll('tspan'); 
			     objtoopon.style('font-size','16px')
				 .style('stroke-width','.5');
			     spl_nl.forEach(function(t,i){
				 (shape_params.first_draw ? shape_obj.selectAll("text").append('tspan') : objtoopon)
				     .text(t)
				     .attr('x',shape_params.width/2)
				     .attr('y',base_y + i*15)
				     .attr('text-anchor','middle')
				     //.style('font-family','monospace')
				     .style('font-weight','lighter');
				 
			     });
		
			     var rhei = 7;
			     var rwid = shape_params.count/shape_params.max_count/SVG_HEIGHT;
			     shape_obj.selectAll("rect")
				 .attr("x",0)
				 .attr("y",SVG_HEIGHT-rhei)
				 .attr("width",rwid)
				 .attr("height",rhei);
			     if(shape_params.first_draw &&
				shape_params.opacity!=undefined){
				     shape_obj.selectAll("rect").attr("opacity",shape_params.opacity);
			     }
			     if(shape_params.hide != undefined &&
			       shape_params.hide['text']){
				 shape_obj.selectAll("text")
				     .attr('visibility','hidden');
			     }
			 },
			 skip_opacity:true,
			 max_area : function(){
			     return SVG_HEIGHT*SVG_WIDTH;
			 }
			};
    //a tagging (path through a small trellis)
    //visualization: shape=path,value=H H C,tags=H C
    //  value = the path's tag at each position; tags = the trellis rows
    //The probability is shown as a bar along the bottom, as for "text".
    shapedict["path"] = {"human":"path", "svg":"g",
			 draw : function(shape_obj, shape_params){
			     var vis = shape_params.visuals || {};
			     var path = (shape_params.value || '').split(' ').filter(function(t){return t!=='';});
			     var tags = (vis['tags'] || '').split(' ').filter(function(t){return t!=='';});
			     var hidden = shape_params.hide != undefined && shape_params.hide['text'];
			     if(shape_params.first_draw){
				 if(!hidden){
				     draw_path_glyph(shape_obj.append("g").attr("class","path_glyph"),
						     path, tags, shape_params.width);
				 }
				 shape_obj.append("rect");
			     }
			     var rhei = 9;
			     var rwid = shape_params.count/shape_params.max_count/SVG_HEIGHT;
			     shape_obj.selectAll("rect")
				 .attr("x",0)
				 .attr("y",SVG_HEIGHT-rhei)
				 .attr("width",rwid)
				 .attr("height",rhei);
			     if(shape_params.first_draw &&
				shape_params.opacity!=undefined){
				 shape_obj.selectAll("rect").attr("opacity",shape_params.opacity);
			     }
			 },
			 skip_opacity:true,
			 max_area : function(){
			     return SVG_HEIGHT*SVG_WIDTH;
			 }
			};
    return shapedict;
}

//draw a tagging as a path through a miniature trellis: one row per tag,
//one column per position.  g is a d3 selection of an svg group.
function draw_path_glyph(g, path, tags, width){
    var n = path.length, k = Math.max(tags.length,1);
    var x0 = 30, x1 = width-12, y0 = 16, y1 = 72;
    var dx = n>1 ? (x1-x0)/(n-1) : 0;
    var dy = k>1 ? Math.min(26,(y1-y0)/(k-1)) : 0;
    var ytop = y0 + ((y1-y0) - dy*(k-1))/2;
    var xs = function(i){ return n>1 ? x0+i*dx : (x0+x1)/2; };
    var ys = function(t){ var j = tags.indexOf(t); return ytop + (j<0?0:j)*dy; };
    tags.forEach(function(t){
	g.append("text").text(t)
	    .attr("x", 12).attr("y", ys(t)+4)
	    .attr("text-anchor","middle")
	    .attr("fill","#888").attr("stroke","none")
	    .style("font-size","11px");
	for(var i=0;i<n;i++){
	    g.append("circle").attr("cx",xs(i)).attr("cy",ys(t)).attr("r",2.5)
		.attr("fill","#D8D8D8").attr("stroke","none");
	}
    });
    var pts = path.map(function(t,i){ return [xs(i), ys(t)]; });
    g.append("polyline")
	.attr("points", pts.map(function(d){return d.join(",");}).join(" "))
	.attr("fill","none").attr("stroke","#555").attr("stroke-width",2)
	.attr("stroke-linejoin","round");
    pts.forEach(function(d){
	g.append("circle").attr("cx",d[0]).attr("cy",d[1]).attr("r",4)
	    .attr("fill","#555").attr("stroke","none");
    });
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
    return ret<1e-10? 0 : ret<1 ? 1 : ret;
}

function createPentagonPoints(cx,width,cy,height,count,max_count,scale){
    var points=[];
    var a = 2*Math.sqrt(count/max_count)/Math.sqrt(Math.sqrt(25+10*Math.sqrt(5)));
    var r=.1*a*Math.sqrt(50+10*Math.sqrt(5));
    r=r<1e-10 ? 0 : Math.max(r,1);
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
