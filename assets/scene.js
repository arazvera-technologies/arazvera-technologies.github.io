'use strict';
(function(){
  const isFa=document.documentElement.lang==='fa';
  const menu=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.site-nav');
  if(menu&&nav){
    menu.addEventListener('click',()=>{
      const opened=nav.classList.toggle('open');
      menu.setAttribute('aria-expanded',String(opened));
      menu.setAttribute('aria-label',opened?(isFa?'بستن منو':'Close navigation'):(isFa?'باز کردن منو':'Open navigation'));
    });
    nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
      nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label',isFa?'باز کردن منو':'Open navigation');
    }));
  }
  const year=document.getElementById('year'); if(year)year.textContent=String(new Date().getFullYear());
  if('IntersectionObserver' in window){
    const intersectionObserver=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('in-view');intersectionObserver.unobserve(entry.target);}
      });
    },{threshold:.08});
    document.querySelectorAll('.work-card,.principles div,.proof-list a,.founder-monogram').forEach(node=>intersectionObserver.observe(node));
  }
  const canvas=document.getElementById('scene');
  if(!canvas||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true,powerPreference:'low-power'});
  if(!gl)return;
  const vertexSource=`
    attribute vec3 aPosition;
    attribute float aStrength;
    uniform float uTime;
    uniform float uAspect;
    uniform float uPoints;
    varying float vAlpha;
    void main(){
      vec3 p=aPosition;
      float a=uTime*.135;
      float ca=cos(a),sa=sin(a);
      p=vec3(ca*p.x-sa*p.z,p.y,sa*p.x+ca*p.z);
      float b=.37+sin(uTime*.09)*.13;
      float cb=cos(b),sb=sin(b);
      p=vec3(p.x,cb*p.y-sb*p.z,sb*p.y+cb*p.z);
      float z=5.3-p.z;
      float k=2.6/z;
      gl_Position=vec4((p.x*k/uAspect)*1.05,p.y*k*1.05,0.,1.);
      gl_PointSize=max(1.,aStrength*5.7*(5.3/z));
      vAlpha=(.20+.80*aStrength)*(.58+.42*(p.z+2.5)/5.0);
    }
  `;
  const fragmentSource=`
    precision mediump float;
    varying float vAlpha;
    uniform float uPoints;
    void main(){
      if(uPoints>.5){
        vec2 p=gl_PointCoord-vec2(.5);
        float d=length(p);
        if(d>.5)discard;
        float glow=smoothstep(.50,.05,d);
        gl_FragColor=vec4(.91,.73,.48,vAlpha*glow*.93);
      }else{
        gl_FragColor=vec4(.78,.60,.36,vAlpha*.36);
      }
    }
  `;
  function compile(type,src){
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn('3D rendering fallback enabled');gl.deleteShader(s);return null;}
    return s;
  }
  const vs=compile(gl.VERTEX_SHADER,vertexSource),fs=compile(gl.FRAGMENT_SHADER,fragmentSource);
  if(!vs||!fs)return;
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  gl.useProgram(program);
  const posLoc=gl.getAttribLocation(program,'aPosition');
  const strLoc=gl.getAttribLocation(program,'aStrength');
  const timeLoc=gl.getUniformLocation(program,'uTime');
  const aspectLoc=gl.getUniformLocation(program,'uAspect');
  const pointsLoc=gl.getUniformLocation(program,'uPoints');
  let seed=1741;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  const lines=[],points=[];
  function append(arr,x,y,z,s){arr.push(x,y,z,s);}
  function pointOnOrbit(theta,r,rx,ry,rz){
    let x=Math.cos(theta)*r,y=Math.sin(theta)*r,z=0;
    let a=Math.cos(rx),b=Math.sin(rx);[y,z]=[y*a-z*b,y*b+z*a];
    a=Math.cos(ry);b=Math.sin(ry);[x,z]=[x*a+z*b,-x*b+z*a];
    a=Math.cos(rz);b=Math.sin(rz);[x,y]=[x*a-y*b,x*b+y*a];
    return [x,y,z];
  }
  [
    [1.69,.05,1.12,.19,.62],[1.73,1.22,.14,.43,.72],
    [1.56,.47,.73,1.26,.48],[1.88,1.0,1.27,.27,.41],
    [1.19,.77,.41,.82,.28]
  ].forEach(([r,rx,ry,rz,s],idx)=>{
    const n=230;
    for(let i=0;i<n;i++){
      const p=pointOnOrbit((i/n)*Math.PI*2,r,rx,ry,rz);
      const q=pointOnOrbit(((i+1)/n)*Math.PI*2,r,rx,ry,rz);
      const mod=.8+.2*Math.sin(i*.035+idx);
      append(lines,...p,s*mod);append(lines,...q,s*mod);
      if(i%23===0)append(points,...p,.7);
    }
  });
  // Two interleaved volumetric point clouds give the structure visible depth.
  for(let i=0;i<1250;i++){
    const k=i+.5;
    const phi=Math.acos(1-2*k/1250);
    const theta=Math.PI*(1+Math.sqrt(5))*k;
    const shell=(i%5===0?1.1:1.31)+(rand()-.5)*.12;
    const x=Math.cos(theta)*Math.sin(phi)*shell;
    const y=Math.sin(theta)*Math.sin(phi)*shell;
    const z=Math.cos(phi)*shell;
    const strength=.17+rand()*.48;
    append(points,x,y,z,strength);
  }
  // Lightly connected points hint at a technical network instead of a cartoon globe.
  for(let i=0;i<95;i++){
    const phi=rand()*Math.PI*2;
    const a=rand()*Math.PI*2;
    const b=a+.12+rand()*.15;
    const r=1.39;
    const p=[Math.cos(a)*r,Math.sin(a)*r*Math.sin(phi),Math.sin(a)*r*Math.cos(phi)];
    const q=[Math.cos(b)*r,Math.sin(b)*r*Math.sin(phi),Math.sin(b)*r*Math.cos(phi)];
    append(lines,...p,.15);append(lines,...q,.15);
  }
  for(let i=0;i<160;i++){
    const phi=rand()*Math.PI*2, t=rand()*2-1, r=2.05+rand()*.38;
    append(points,Math.cos(phi)*Math.sqrt(1-t*t)*r,t*r,Math.sin(phi)*Math.sqrt(1-t*t)*r,.11+rand()*.26);
  }
  function buffer(data){
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    return {buffer:buf,count:data.length/4};
  }
  const lineData=buffer(lines),pointData=buffer(points);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.disable(gl.DEPTH_TEST);
  function resize(){
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,1.65);
    const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);
    gl.uniform1f(aspectLoc,w/h);
  }
  function draw(buf,mode,isPoints){
    gl.bindBuffer(gl.ARRAY_BUFFER,buf.buffer);
    gl.enableVertexAttribArray(posLoc);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,16,0);
    gl.enableVertexAttribArray(strLoc);gl.vertexAttribPointer(strLoc,1,gl.FLOAT,false,16,12);
    gl.uniform1f(pointsLoc,isPoints?1:0);
    gl.drawArrays(mode,0,buf.count);
  }
  let visible=true,frameId=0;
  const viewObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible&&!frameId)frameId=requestAnimationFrame(render);
  },{threshold:0}):null;
  if(viewObserver)viewObserver.observe(canvas);
  function render(time){
    frameId=0;if(!visible)return;
    resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(timeLoc,time*.001);
    draw(lineData,gl.LINES,false);draw(pointData,gl.POINTS,true);
    frameId=requestAnimationFrame(render);
  }
  frameId=requestAnimationFrame(render);
  window.addEventListener('pagehide',()=>{if(frameId)cancelAnimationFrame(frameId);});
})();
