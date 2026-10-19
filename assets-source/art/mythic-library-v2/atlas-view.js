/* Read-only native atlas rendering. No generated image files are edited. */
window.createAtlasSprite=function(frame,size=96,base=''){
 const outer=document.createElement('span');outer.className='atlas-sprite';outer.style.width=size+'px';outer.style.height=size+'px';outer.setAttribute('role','img');outer.setAttribute('aria-label',frame.name);
 const [x,y,w,h]=frame.sourceRect,s=size/Math.max(w,h),inner=document.createElement('span');inner.className='atlas-crop';
 Object.assign(inner.style,{width:w*s+'px',height:h*s+'px',backgroundImage:'url("'+base+frame.file+'")',backgroundSize:(frame.imageWidth*s)+'px '+(frame.imageHeight*s)+'px',backgroundPosition:(-x*s)+'px '+(-y*s)+'px'});
 outer.append(inner);return outer;
};
