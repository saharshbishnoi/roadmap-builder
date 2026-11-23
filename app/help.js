/* The Help page: the guide's steps, with the narrated videos where a release build has made them. Opened from the
   Help button in the app, in its own window or tab. */
(function(){
"use strict";
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dark=!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches),fromFolder=location.protocol==="file:";
const guide=window.GUIDE||[],theme=dark?"-dark":"-light";
function draw(videos){
  document.getElementById("helpIntro").textContent=videos?"Five short narrated videos with subtitles, each followed by the steps to follow.":"The steps for each part of the app.";
  document.getElementById("helpSteps").innerHTML=guide.map((g,i)=>'<section class="gstep"><h2>'+(i+1)+'. '+esc(g.title)+'</h2>'+
    (videos?'<video id="v-'+g.id+'" controls playsinline preload="none" poster="'+g.clip+theme+'.jpg" aria-label="Video: '+esc(g.title)+'"><source src="'+g.clip+theme+'.mp4" type="video/mp4">'+
      (fromFolder?'':'<track kind="subtitles" srclang="en" label="English" src="'+g.clip+'.vtt" default>')+'</video>':'')+
    '<ol>'+g.steps.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol></section>').join("");
  /* Opened straight from a folder, the browser will not read subtitle files, so the same subtitles are loaded as a script. */
  if(videos&&fromFolder&&window.VTTCue)guide.forEach(g=>{const s=document.createElement("script");s.src=g.clip+".subs.js";
    s.onload=()=>{const list=(window.GUIDE_SUBS||{})[g.clip.split("/").pop()],v=document.getElementById("v-"+g.id);if(!list||!v)return;const t=v.addTextTrack("subtitles","English","en");t.mode="showing";
      list.forEach(c=>{const cue=new VTTCue(c[0],c[1],c[2]);cue.line=88;cue.snapToLines=false;t.addCue(cue);});};document.head.appendChild(s);});
  /* Installed web app: keep this theme's videos for offline use. */
  const sw=navigator.serviceWorker&&navigator.serviceWorker.controller;
  if(videos&&sw){const urls=[];guide.forEach(g=>{[theme+".mp4",theme+".jpg",".vtt"].forEach(e=>urls.push(new URL(g.clip+e,location.href).href));});sw.postMessage({type:"keepGuide",urls:urls});}
}
document.getElementById("helpTake").innerHTML=window.DOWNLOAD_URL?'<h2>Take it with you</h2><ul><li><span class="tick info" aria-hidden="true">i</span><span>Install it: use Install in the address bar of Chrome or Edge to run it in its own window, offline<small>Available when the app is opened from a web address</small></span></li>'+
  '<li><span class="tick info" aria-hidden="true">i</span><span><a href="'+esc(window.DOWNLOAD_URL)+'" target="_blank" rel="noopener noreferrer">Download the offline copy (.zip)</a><small>The whole app with its guide videos. Unzip it and open index.html</small></span></li></ul>':"";
draw(false);
if(guide.length){const probe=new Image();probe.onload=()=>draw(true);probe.src=guide[0].clip+"-light.jpg";}
})();
