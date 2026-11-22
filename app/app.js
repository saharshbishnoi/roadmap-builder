/* Roadmap Builder: single-page roadmap with view and edit modes, a live editor docked on the left and a
   resizable panel of cards, guide clips and requirements on the right. No server state: data lives in
   the browser (localStorage) and in the files you export and import. */
(function(){
"use strict";
const PALETTE=["#1E88E5","#2E8B2E","#7E57C2","#F07C1F","#D49B00","#12909A","#4A5568","#C2185B","#6D4C41","#3949AB"];
const KEY="roadmap-app-v2",UIKEY="roadmap-app-ui";
const COLL={a:"activities",k:"milestones",c:"critical",p:"phases",f:"cards",n:"panel"};
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FONTS={barlow:["Barlow",'"Barlow","Segoe UI",system-ui,Arial,sans-serif'],barlowc:["Barlow Condensed",'"Barlow Condensed","Arial Narrow",Arial,sans-serif'],inter:["Inter",'"Inter","Segoe UI",system-ui,Arial,sans-serif'],
  plex:["IBM Plex Sans",'"IBM Plex Sans","Segoe UI",system-ui,Arial,sans-serif'],source:["Source Sans 3",'"Source Sans 3","Segoe UI",system-ui,Arial,sans-serif'],
  system:["System default",'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif'],arial:["Arial",'Arial,Helvetica,sans-serif'],segoe:["Segoe UI",'"Segoe UI",Tahoma,Arial,sans-serif'],
  verdana:["Verdana",'Verdana,Geneva,sans-serif'],calibri:["Calibri",'Calibri,Carlito,Arial,sans-serif']};
let S=null,hist=[],ui={mode:"view",zoom:"fit",dockTab:"item",dockW:330,panelTab:"cards"},mw=10,toastT=0,dock=null,sel=null,liveKey="",lastLive=0,liveEditing=false,exporting=false,srcT=0,dragging=false,freeze=false,tipEl=null,tiltEl=null;
const isSel=(k,id)=>sel&&ui.mode==="edit"&&sel.kind===k&&sel.id===id?" sel":"";
const hostTheme=document.documentElement.getAttribute("data-theme");
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>"i"+Math.random().toString(36).slice(2,9);
const find=(kind,id)=>S[COLL[kind]].find(x=>x.id===id);
const phaseOf=a=>S.phases.find(p=>p.id===a.phase)||S.phases[0];
function ink(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return (r*299+g*587+b*114)/1000>150?"#141a26":"#ffffff";}

/* ---------- dates (ISO strings on a month scale) ---------- */
const pd=s=>{const a=s.split("-").map(Number);return {y:a[0],m:a[1],d:a[2]};};
const iso=(y,m,d)=>y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
const dim=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
const isEom=s=>{const p=pd(s);return p.d===dim(p.y,p.m);};
function addM(s,n,eom){const p=pd(s),t=p.y*12+(p.m-1)+n,y=Math.floor(t/12),m=t%12+1,L=dim(y,m);return iso(y,m,eom?L:Math.min(p.d,L));}
const pos=s=>{const p=pd(s);return (p.y-S.startYear)*12+(p.m-1)+(p.d-1)/dim(p.y,p.m);};
const posEnd=s=>{const p=pd(s);return (p.y-S.startYear)*12+(p.m-1)+p.d/dim(p.y,p.m);};
const mStart=i=>{const t=S.startYear*12+i;return iso(Math.floor(t/12),t%12+1,1);};
const mEnd=i=>{const t=S.startYear*12+i,y=Math.floor(t/12),m=t%12+1;return iso(y,m,dim(y,m));};
const mEndOf=s=>{const p=pd(s);return iso(p.y,p.m,dim(p.y,p.m));};
function fromPos(p){const i=Math.floor(p),t=S.startYear*12+i,y=Math.floor(t/12),m=t%12+1,L=dim(y,m);return iso(y,m,Math.min(L,1+Math.floor((p-i)*L)));}
const fmtMY=s=>{const p=pd(s);return String(p.m).padStart(2,"0")+"/"+p.y;};
const fmtQ=s=>{const p=pd(s);return "Q"+Math.ceil(p.m/3)+" "+p.y;};
const fmtD=s=>{const p=pd(s);return String(p.d).padStart(2,"0")+" "+MONTHS[p.m-1]+" "+p.y;};
const fmtS=s=>{const p=pd(s);return String(p.d).padStart(2,"0")+" "+MONTHS[p.m-1]+" "+String(p.y).slice(2);};
const todayIso=()=>{const n=new Date();return iso(n.getFullYear(),n.getMonth()+1,n.getDate());};
function valid(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||""))return false;const p=pd(s);return p.m>=1&&p.m<=12&&p.d>=1&&p.d<=dim(p.y,p.m);}
function anyDate(v){
  v=String(v==null?"":v).trim();let m;
  if((m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return iso(+m[1],+m[2],+m[3]);
  if((m=v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/))){let y=+m[3];if(y<100)y+=2000;return iso(y,+m[2],+m[1]);}
  const t=Date.parse(v);if(!isNaN(t)){const d=new Date(t);return iso(d.getFullYear(),d.getMonth()+1,d.getDate());}
  return "";
}

/* ---------- sample content (deliberate nonsense, dated from the current year so Today is in view) ---------- */
function sample(){
  const Y=new Date().getFullYear();
  const at=(o,d)=>{const y=Y+Math.floor(o/12),m=o%12+1;return iso(y,m,Math.min(d||1,dim(y,m)));};
  const end=o=>{const y=Y+Math.floor(o/12),m=o%12+1;return iso(y,m,dim(y,m));};
  const P=[["p1","Wombat Wrangling","Design & dither","#1E88E5"],["p2","Biscuit Procurement","Tea & set-up","#2E8B2E"],["p3","Sprocket Polishing","Shed build","#7E57C2"],
    ["p4","Custard Logistics","Here, there, elsewhere","#F07C1F"],["p5","Trombone Tuning","Brass & bluster","#D49B00"],["p6","Pigeon Waves","Flocks 1 to 4","#12909A"],["p7","Nap Period","Five years","#4A5568"]];
  const A=[[1,"Herd the initial wombats (Shed A)",2,30],[1,"Calibrate the left-handed spanners",5,20],[1,"Paint the invisible fence",14,12],[1,"Teach the spreadsheets to whistle",3,34],[1,"Untangle the heritage spaghetti",18,14],[1,"Wombat census signed off",12,0],
    [2,"Source ethically bewildered biscuits",3,13],[2,"Kettle lead-time negotiation",6,5],[2,"Dunk-depth feasibility study",4,11],[2,"Biscuit tin ceremonially opened",9,0],
    [3,"Polish sprockets (odd-numbered only)",17,7],[3,"Reverse-engineer the tea trolley",23,6],[3,"Stress-test the bouncy castle",13,9],[3,"Count the spare left socks",11,15],[3,"Pre-flight marmalade inspection",22,6],[3,"Assemble the flat-pack lighthouse",17,6],
    [4,"Custard pipeline: here to there",30,5],[4,"Bubble-wrap popping & customs",26,9],[4,"Wheelbarrow acceptance testing",24,11],[4,"Paperclip compliance audit",23,7],[4,"Custard arrives elsewhere",30,0],
    [5,"Trombone grading: major scales",21,6],[5,"Tune the reluctant tubas",25,4],[5,"Laminate the laminator manual",28,4],[5,"Brass section ready to honk",29,0],[5,"Muster the first kazoo ensemble",29,6],[5,"Rehearse the ceremonial sneeze",27,11],
    [6,"Wave template & pigeon briefing",30,9],[6,"Flock 1: rooftop",31,13],[6,"Flock 2: bandstand",31,9],[6,"Flock 3: chip shop",28,7],[6,"Flock 4: statue",36,6],[6,"Pigeon training & breadcrumbs online",35,7],
    [7,"Communal snoozing",41,55],[7,"Hammock operation",44,52],[7,"Continuous pillow improvement",47,47]];
  const acts=A.map((a,i)=>({id:"a"+(i+1),phase:"p"+a[0],name:a[1],type:a[3]?"bar":"milestone",start:at(a[2],a[3]?1:15),end:a[3]?end(a[2]+a[3]-1):at(a[2],15),color:"",hover:"",details:""}));
  acts[0].hover="Wombats are **nocturnal**. Bring a torch.";
  acts[0].details="## Herding plan\n\n- [x] Buy carrots\n- [ ] Locate wombats\n- [ ] Open Shed A\n\n| Shed | Capacity |\n|---|---|\n| A | 12 wombats |\n| B | 3 wombats and a goose |\n\n> Nobody has ever successfully herded a wombat.";
  acts[3].hover="Progress so far: one spreadsheet can *hum*.";
  acts[6].details="### Biscuit shortlist\n\n1. Custard cream\n2. Bourbon\n3. A digestive, if we must";
  const K=[["Kettle switched on",3,"#C8102E"],["First wombat sighted",22,"#7E57C2"],["Custard reaches elsewhere",37,"#F07C1F"],["Trombones tuned",50,"#D49B00"],["Pigeons home",67,"#12909A"],["Everyone has a nap",95,"#4A5568"]];
  const C=[["Kettle on",2,9,"#3BA3C4"],["Biscuits",10,16,"#2456A6"],["Sprockets",17,24,"#E0782A"],["Custard",25,30,"#5B3FA8"],["Honk",31,36,"#B5232F"],["Pigeons",37,43,"#2C7A3D"],["Nap time",44,95,"#4A5568"]];
  return {version:2,title:"Project Wombat · Wibble Modernisation Programme",tagline:"Sillier together for a more biscuity tomorrow",startYear:Y,years:8,settings:{panelTitle:"Guiding principles"},
    phases:P.map(p=>({id:p[0],name:p[1],sub:p[2],color:p[3]})),activities:acts,
    milestones:K.map((k,i)=>({id:"k"+(i+1),name:k[0],date:at(k[1]),color:k[2],line:true,hover:"",details:i===0?"The kettle is the **single point of failure** for the whole programme.":""})),
    critical:C.map((c,i)=>({id:"c"+(i+1),name:c[0],start:at(c[1]),end:end(c[2]),color:c[3],hover:"",details:""})),
    cards:[{id:"f1",title:"Wombat Wrangling",badge:"1",color:"#1E88E5",date:at(52),y:28,w:236,md:"**Start** "+fmtD(at(2))+"  \n**End** "+fmtD(end(36))+"\n\n**Key outputs**\n- Wombats herded\n- Fence painted, invisibly\n- Spaghetti untangled"},
      {id:"f2",title:"Custard Logistics",badge:"4",color:"#F07C1F",date:at(64),y:300,w:236,md:"**Start** "+fmtD(at(23))+"  \n**End** "+fmtD(end(34))+"\n\n**Key outputs**\n- Wheelbarrow accepted\n- Custard delivered warm"},
      {id:"f3",title:"Pigeon Waves",badge:"6",color:"#12909A",date:at(52),y:560,w:236,md:"Four flocks, one statue.\n\n- [x] Breadcrumbs ordered\n- [ ] Pigeons briefed"}],
    panel:[{id:"n1",eyebrow:"Principle 1",title:"Tea first",badge:"1",color:"#1E88E5",md:"No decision is taken before the kettle has boiled."},
      {id:"n2",eyebrow:"Principle 2",title:"Polish once",badge:"2",color:"#2E8B2E",md:"Sprockets are polished **once**, then admired."},
      {id:"n3",eyebrow:"Principle 3",title:"Pigeons know best",badge:"3",color:"#F07C1F",md:"When in doubt, follow the flock."},
      {id:"n4",eyebrow:"Principle 4",title:"Reversible custard",badge:"4",color:"#7E57C2",md:"Every pour has a tested way back into the jug."},
      {id:"n5",eyebrow:"Principle 5",title:"Nap responsibly",badge:"5",color:"#12909A",md:"Hammocks are inspected before each snooze."}]};
}

/* ---------- state ---------- */
function normalise(d){
  d=d||{};const st=d.settings||{};
  const hex=(v,def)=>/^#[0-9a-f]{6}$/i.test(v||"")?v:def,bool=(v,def)=>typeof v==="boolean"?v:def,str=v=>v==null?"":String(v);
  const int=(v,lo,hi,def)=>{v=Math.round(+v);return v>=lo&&v<=hi?v:def;},fontName=v=>{v=str(v).trim();return /^[\w .-]{1,40}$/.test(v)?v:"";};
  const seen=new Set(),nid=v=>{v=str(v);if(!/^[\w-]{1,40}$/.test(v)||seen.has(v))v=uid();seen.add(v);return v;};
  const arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==="object"):[];
  const o={version:2,title:str(d.title)||"Untitled programme",tagline:str(d.tagline),startYear:int(d.startYear,1990,2100,new Date().getFullYear()),years:int(d.years,1,15,8),
    settings:{theme:["auto","light","dark"].indexOf(st.theme)>=0?st.theme:"auto",banner:hex(st.banner,"#14275A"),bannerInk:hex(st.bannerInk,"#FFFFFF"),accent:hex(st.accent,"#2F6FED"),today:hex(st.today,"#E11D48"),
      showToday:bool(st.showToday,true),showCritical:bool(st.showCritical,true),showLines:bool(st.showLines,true),showLabels:bool(st.showLabels,true),showCards:bool(st.showCards,true),showPanel:bool(st.showPanel,true),float3d:bool(st.float3d,true),
      panelTitle:str(st.panelTitle)||"Notes",panelW:int(st.panelW,240,720,320),fontHead:FONTS[st.fontHead]?st.fontHead:"barlow",fontBody:FONTS[st.fontBody]?st.fontBody:"barlow",
      fontHeadCustom:fontName(st.fontHeadCustom),fontBodyCustom:fontName(st.fontBodyCustom),fontScale:[90,100,110,120].indexOf(+st.fontScale)>=0?+st.fontScale:100,upper:bool(st.upper,true)},
    phases:[],activities:[],milestones:[],critical:[],cards:[],panel:[]};
  const pmap={};
  arr(d.phases).forEach((p,i)=>{const id=nid(p.id);if(!(str(p.id) in pmap))pmap[str(p.id)]=id;o.phases.push({id:id,name:str(p.name)||"Workstream "+(i+1),sub:str(p.sub),color:hex(p.color,PALETTE[i%PALETTE.length]),collapsed:!!p.collapsed});});
  if(!o.phases.length)o.phases.push({id:nid(""),name:"Workstream 1",sub:"",color:PALETTE[0],collapsed:false});
  arr(d.activities).forEach(a=>{if(!valid(a.start))return;const ms=a.type==="milestone";let end=valid(a.end)?a.end:a.start;if(end<a.start)end=a.start;
    o.activities.push({id:nid(a.id),phase:pmap[str(a.phase)]||o.phases[0].id,name:str(a.name)||"Untitled",type:ms?"milestone":"bar",start:a.start,end:ms?a.start:end,color:hex(a.color,""),hover:str(a.hover),details:str(a.details)});});
  arr(d.milestones).forEach(m=>{if(valid(m.date))o.milestones.push({id:nid(m.id),name:str(m.name)||"Milestone",date:m.date,color:hex(m.color,"#C8102E"),line:bool(m.line,true),hover:str(m.hover),details:str(m.details)});});
  arr(d.critical).forEach((c,i)=>{if(!valid(c.start)||!valid(c.end)||c.end<c.start)return;o.critical.push({id:nid(c.id),name:str(c.name)||"Stage",start:c.start,end:c.end,color:hex(c.color,PALETTE[i%PALETTE.length]),hover:str(c.hover),details:str(c.details)});});
  arr(d.cards).forEach((c,i)=>{o.cards.push({id:nid(c.id),title:str(c.title)||"Card",badge:str(c.badge).slice(0,4),color:hex(c.color,PALETTE[i%PALETTE.length]),date:valid(c.date)?c.date:iso(o.startYear,1,1),y:int(c.y,0,6000,20),w:int(c.w,140,640,236),md:str(c.md)});});
  arr(d.panel).forEach((c,i)=>{o.panel.push({id:nid(c.id),eyebrow:str(c.eyebrow),title:str(c.title)||"Card",badge:str(c.badge).slice(0,4),color:hex(c.color,PALETTE[i%PALETTE.length]),md:str(c.md)});});
  return o;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function load(){try{const t=localStorage.getItem(KEY);return t?normalise(JSON.parse(t)):null;}catch(e){return null;}}
function saveUi(){try{localStorage.setItem(UIKEY,JSON.stringify({mode:ui.mode,dockTab:ui.dockTab,dockW:ui.dockW,panelTab:ui.panelTab}));}catch(e){}}
function snap(){hist.push(JSON.stringify(S));if(hist.length>100)hist.shift();}
function mutate(fn,noRender){snap();liveKey="";fn();save();if(noRender){$("#undo").disabled=!hist.length;renderDock();}else render();}
/* Live edits from the editor dock: one undo step per burst of typing, and the dock itself is left alone so the caret stays put. */
function live(key,fn){const now=Date.now();if(key!==liveKey||now-lastLive>1500)snap();liveKey=key;lastLive=now;fn();save();liveEditing=true;try{render();}finally{liveEditing=false;}}
function setView(fn){fn();save();render();}
function undo(){if(!hist.length)return;S=JSON.parse(hist.pop());liveKey="";save();render();}
const months=()=>S.years*12;

/* ---------- markdown ---------- */
if(window.DOMPurify&&window.DOMPurify.addHook)window.DOMPurify.addHook("afterSanitizeAttributes",n=>{if(n.tagName==="A"){n.setAttribute("target","_blank");n.setAttribute("rel","noopener noreferrer");}});
function md(src){
  if(!src||!String(src).trim())return "";
  try{return window.DOMPurify.sanitize(window.marked.parse(String(src),{gfm:true,breaks:true}),{FORBID_TAGS:["style","form","iframe"],FORBID_ATTR:["style"]});}
  catch(e){return "<p>"+esc(src)+"</p>";}
}

/* ---------- render ---------- */
const leftW=()=>parseFloat(getComputedStyle($("#chart")).getPropertyValue("--leftw"));
function fitMw(){const c=$("#chart");return Math.max(8,Math.floor(((c.clientWidth-leftW()-1)/months())*100)/100);}
function applyTheme(){
  const r=document.documentElement,t=S.settings.theme;
  if(t==="light"||t==="dark")r.setAttribute("data-theme",t);else if(hostTheme)r.setAttribute("data-theme",hostTheme);else r.removeAttribute("data-theme");
  const st=S.settings,stack=(k,c)=>(c?'"'+c+'",':"")+(FONTS[k]||FONTS.barlow)[1];
  r.style.setProperty("--display",stack(st.fontHead,st.fontHeadCustom));r.style.setProperty("--body",stack(st.fontBody,st.fontBodyCustom));
  r.style.setProperty("--fz",String(st.fontScale/100));r.style.setProperty("--tt",st.upper?"uppercase":"none");
  r.style.setProperty("--banner",S.settings.banner);r.style.setProperty("--banner-ink",S.settings.bannerInk);r.style.setProperty("--accent",S.settings.accent);r.style.setProperty("--today",S.settings.today);
}
function spanGeom(o){const M=months(),ps=pos(o.start),pe=posEnd(o.end);if(pe<=0)return {off:"l"};if(ps>=M)return {off:"r"};const l=Math.max(0,ps)*mw,r=Math.min(M,pe)*mw;return {l:l,r:r,w:Math.max(4,r-l)};}
function markHtml(a,color,sc){
  const M=months(),tw=M*mw,lab=S.settings.showLabels,tip=' data-tip="a:'+a.id+'"';
  if(a.type==="milestone"){
    const p=pos(a.start);
    if(p<0)return '<span class="off">◂ '+fmtMY(a.start)+'</span>';
    if(p>M)return '<span class="off r">'+fmtMY(a.start)+' ▸</span>';
    const x=p*mw,flip=x+70>tw;
    return '<div class="dia'+sc+'" id="b-'+a.id+'" data-id="'+a.id+'"'+tip+' tabindex="0" role="button" aria-label="'+esc(a.name)+', milestone '+fmtD(a.start)+'" style="left:'+x+'px;--bc:'+color+'"></div>'+
      (lab?'<span class="blabel" style="'+(flip?'right:'+(tw-x+12):'left:'+(x+12))+'px">'+fmtMY(a.start)+'</span>':'');
  }
  const g=spanGeom(a);
  if(g.off==="l")return '<span class="off">◂ '+fmtMY(a.start)+' – '+fmtMY(a.end)+'</span>';
  if(g.off==="r")return '<span class="off r">'+fmtMY(a.start)+' – '+fmtMY(a.end)+' ▸</span>';
  const flip=g.r+112>tw;
  return '<div class="bar'+sc+'" id="b-'+a.id+'" data-id="'+a.id+'"'+tip+' tabindex="0" role="button" aria-label="'+esc(a.name)+', '+fmtD(a.start)+' to '+fmtD(a.end)+'" style="left:'+g.l+'px;width:'+g.w+'px;--bc:'+color+'"><i class="hl"></i><i class="hr"></i></div>'+
    (lab?'<span class="blabel" style="'+(flip?'right:'+(tw-g.l+6):'left:'+(g.r+6))+'px">'+fmtMY(a.start)+' – '+fmtMY(a.end)+'</span>':'');
}
function render(){
  const fid=document.activeElement&&document.activeElement.id,edit=ui.mode==="edit",st=S.settings,M=months();
  if(sel&&!find(sel.kind,sel.id))sel=null;
  applyTheme();
  document.body.classList.toggle("edit",edit);document.body.classList.toggle("float3d",st.float3d);
  if(ui.zoom==="fit"&&!freeze)mw=fitMw();
  const tw=M*mw,inner=$("#inner"),cph=st.showCritical?32:0;
  inner.style.setProperty("--mw",mw+"px");inner.style.setProperty("--tw",tw+"px");
  inner.style.setProperty("--headh",(cph+46+24+18)+"px");inner.style.setProperty("--linetop",(cph+33)+"px");

  let h='<div class="hrow"><div class="corner">'+(st.showCritical?'<div class="lane-l cpl">Critical path</div>':'')+'<div class="lane-l kml">Key milestones</div>'+
    '<div class="chead"><span class="c-name">Workstream / activity</span><span class="dcol">Start</span><span class="dcol">End</span></div></div><div class="htrack">';
  if(st.showCritical){h+='<div class="cprow">';
    S.critical.forEach(c=>{const g=spanGeom(c);if(g.off)return;
      h+='<div class="cp'+isSel("c",c.id)+'" id="cp-'+c.id+'" data-cp="'+c.id+'" data-tip="c:'+c.id+'" tabindex="0" role="button" style="left:'+g.l+'px;width:'+g.w+'px;--c:'+c.color+';--ci:'+ink(c.color)+'"><i class="hl"></i>'+esc(c.name)+'<i class="hr"></i></div>';});
    h+='</div>';}
  const kms=S.milestones.filter(m=>{const p=pos(m.date);return p>=0&&p<=M;}).sort((a,b)=>a.date<b.date?-1:1);
  h+='<div class="kmrow">';
  kms.forEach((m,i)=>{const x=pos(m.date)*mw;
    h+='<div class="km'+(i%2?' up':'')+(x+150>tw?' flip':'')+isSel("k",m.id)+'" id="km-'+m.id+'" data-km="'+m.id+'" data-tip="k:'+m.id+'" tabindex="0" role="button" style="left:'+x+'px;--c:'+m.color+'"><span class="lab">'+esc(m.name)+'<small>'+fmtQ(m.date)+'</small></span></div>';});
  h+='</div><div class="years">';
  for(let k=0;k<S.years;k++)h+='<div class="year'+(k%2?' alt':'')+'">'+(S.startYear+k)+'</div>';
  h+='</div><div class="quarters">';
  if(mw>=26)for(let k=0;k<M;k++)h+='<div class="q m">'+(mw>=34?MONTHS[k%12]:MONTHS[k%12][0])+'</div>';
  else if(mw*3>=15)for(let k=0;k<S.years*4;k++)h+='<div class="q">Q'+(k%4+1)+'</div>';
  h+='</div></div></div>';

  S.phases.forEach((p,pi)=>{
    const acts=S.activities.filter(a=>a.phase===p.id);let sum="",ds="",de="";
    if(acts.length){const s=acts.reduce((m,a)=>a.start<m?a.start:m,acts[0].start),e=acts.reduce((m,a)=>a.end>m?a.end:m,acts[0].end);ds=fmtS(s);de=fmtS(e);
      const g=spanGeom({start:s,end:e});if(!g.off)sum='<div class="sum" style="left:'+g.l+'px;width:'+g.w+'px"></div>';}
    h+='<section class="phase" style="--pc:'+p.color+'"><div class="row grow'+isSel("p",p.id)+'" data-phase="'+p.id+'"><div class="rleft">'+
      '<button type="button" class="caret" id="ct-'+p.id+'" data-collapse="'+p.id+'" aria-expanded="'+(!p.collapsed)+'" aria-label="'+(p.collapsed?'Expand ':'Collapse ')+esc(p.name)+'">'+(p.collapsed?'▸':'▾')+'</button>'+
      '<span class="chip" style="color:'+ink(p.color)+'">'+(pi+1)+'</span>'+
      (edit?'<input class="nm g" id="pn-'+p.id+'" data-pn="'+p.id+'" type="text" value="'+esc(p.name)+'" aria-label="Workstream name">'+
            '<button type="button" class="mini" id="pa-'+p.id+'" data-addact="'+p.id+'" title="Add an activity" aria-label="Add an activity to '+esc(p.name)+'">+</button>'+
            '<button type="button" class="mini dots" id="pe-'+p.id+'" data-edit="p:'+p.id+'" aria-label="Edit workstream '+esc(p.name)+'">…</button>'
           :'<span class="gname" title="'+esc(p.name)+'">'+esc(p.name)+'</span><span class="gsub">'+esc(p.sub)+(p.collapsed&&acts.length?' · '+acts.length+' hidden':'')+'</span>')+
      '<span class="dcol">'+ds+'</span><span class="dcol">'+de+'</span></div><div class="track">'+sum+'</div></div>';
    if(!p.collapsed)acts.forEach(a=>{const col=a.color||p.color;
      h+='<div class="row" data-id="'+a.id+'" data-phase="'+p.id+'"><div class="rleft">'+
        (edit?'<span class="grip" title="Drag to reorder"></span><input class="nm" id="n-'+a.id+'" data-nm="'+a.id+'" type="text" value="'+esc(a.name)+'" aria-label="Activity name">'+
              '<button type="button" class="mini dots" id="e-'+a.id+'" data-edit="a:'+a.id+'" aria-label="Edit '+esc(a.name)+'">…</button>'
             :'<span class="aname" data-info="a:'+a.id+'" title="'+esc(a.name)+'">'+esc(a.name)+'</span>')+
        '<span class="dcol">'+fmtS(a.start)+'</span><span class="dcol">'+(a.type==="milestone"?'◆':fmtS(a.end))+'</span></div><div class="track">'+markHtml(a,col,isSel("a",a.id))+'</div></div>';});
    h+='</section>';
  });
  const off='calc(var(--leftw) + ';
  if(st.showLines)kms.forEach(m=>{if(m.line)h+='<div class="kline" style="left:'+off+(pos(m.date)*mw)+'px);--c:'+m.color+'"></div>';});
  const tp=pos(todayIso());
  if(st.showToday&&tp>=0&&tp<=M)h+='<div class="tline" style="left:'+off+(tp*mw)+'px)"><span>Today '+fmtS(todayIso())+'</span></div>';
  if(st.showCards){h+='<div class="fcards">';
    S.cards.forEach(c=>{const x=Math.min(M,Math.max(0,pos(c.date)))*mw;
      h+='<article class="fcard fx3d'+isSel("f",c.id)+'" id="fc-'+c.id+'" data-fc="'+c.id+'" style="left:'+x+'px;top:'+c.y+'px;width:'+c.w+'px;--c:'+c.color+';--ci:'+ink(c.color)+'"><div class="fhead">'+(c.badge?'<span class="badge">'+esc(c.badge)+'</span>':'')+'<h3>'+esc(c.title)+'</h3></div><div class="md">'+md(c.md)+'</div>'+(edit?'<span class="fres" title="Drag to resize"></span>':'')+'</article>';});
    h+='</div>';}
  h+='<div id="dropline" hidden></div>';
  inner.innerHTML=h;

  renderPanel();

  const t=$("#title"),g=$("#tagline");
  t.contentEditable=edit?"true":"false";g.contentEditable=edit?"true":"false";
  if(document.activeElement!==t)t.textContent=S.title;
  if(document.activeElement!==g)g.textContent=S.tagline;
  g.hidden=!edit&&!S.tagline;
  $("#subtitle").textContent="Roadmap & schedule "+S.startYear+(S.years>1?" – "+(S.startYear+S.years-1):"");
  $("#todaychip").textContent="Today "+fmtD(todayIso());
  $("#modeView").classList.toggle("on",!edit);$("#modeEdit").classList.toggle("on",edit);
  $("#modeView").setAttribute("aria-pressed",String(!edit));$("#modeEdit").setAttribute("aria-pressed",String(edit));
  $("#undo").disabled=!hist.length;
  document.querySelectorAll("[data-toggle]").forEach(c=>{c.checked=!!st[c.dataset.toggle];});
  document.querySelectorAll("[data-set]").forEach(c=>{c.value=String(st[c.dataset.set]);});
  $("#work").style.setProperty("--dockw",ui.dockW+"px");$("#stage").style.setProperty("--panelw",st.panelW+"px");
  if(!liveEditing)renderDock();else if(ui.dockTab!=="source"){const hd=$("#dock .dhead");if(hd&&dock&&dock.colour)hd.style.setProperty("--c",dock.colour());}
  if(fid){const el=document.getElementById(fid);if(el&&el!==document.activeElement&&!el.disabled)el.focus({preventScroll:true});}
}

/* ---------- hover card, toast, dialog ---------- */
function metaOf(kind,o){
  if(kind==="a"){const p=phaseOf(o);return esc(p.name)+" · "+(o.type==="milestone"?"Milestone, "+fmtD(o.start):fmtD(o.start)+" to "+fmtD(o.end)+" ("+Math.max(1,Math.round(posEnd(o.end)-pos(o.start)))+" months)");}
  if(kind==="k")return "Key milestone · "+fmtD(o.date);
  return "Critical path · "+fmtD(o.start)+" to "+fmtD(o.end);
}
function colourOf(kind,o){return kind==="a"?(o.color||phaseOf(o).color):o.color;}
function hideTip(){tipEl=null;$("#hover").hidden=true;}
function moveTip(e){
  const el=dragging||!$("#sheet").hidden?null:e.target.closest&&e.target.closest("[data-tip]"),hv=$("#hover");
  if(!el){if(tipEl)hideTip();return;}
  if(el!==tipEl){const kv=el.dataset.tip.split(":"),o=find(kv[0],kv[1]);if(!o){hideTip();return;}tipEl=el;
    hv.innerHTML='<b>'+esc(o.name)+'</b><div class="tmeta">'+metaOf(kv[0],o)+'</div>'+(o.hover?'<div class="md">'+md(o.hover)+'</div>':'')+
      (ui.mode==="edit"?'<div class="thint">Click to edit. Drag to move.</div>':(o.details?'<div class="thint">Click for details</div>':''));
    hv.style.borderTop="4px solid "+colourOf(kv[0],o);hv.hidden=false;}
  const w=hv.offsetWidth,hh=hv.offsetHeight;let x=e.clientX+14,y=e.clientY+18;
  if(x+w>innerWidth-8)x=Math.max(8,e.clientX-w-14);if(y+hh>innerHeight-8)y=Math.max(8,e.clientY-hh-14);
  hv.style.left=x+"px";hv.style.top=y+"px";
}
function toast(msg,withUndo){
  const t=$("#toast");t.innerHTML='<span>'+esc(msg)+'</span>'+(withUndo?'<button type="button" id="toastUndo">Undo</button>':'');
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},withUndo?7000:4000);
}
function openSheet(html,wide){hideTip();const c=$("#card");c.classList.toggle("wide",!!wide);c.innerHTML=html;$("#sheet").hidden=false;const f=$("#card button,#card textarea");if(f)f.focus();}
function closeSheet(){$("#sheet").hidden=true;$("#card").innerHTML="";}
function openInfo(kind,id){
  const o=find(kind,id);if(!o)return;
  openSheet('<h2 id="sheetTitle" style="--c:'+colourOf(kind,o)+'">'+esc(o.name)+'</h2><p class="meta">'+metaOf(kind,o)+'</p><div class="body md">'+(md(o.details)||md(o.hover)||'<p class="muted">No details have been added to this item yet.</p>')+
    '</div><div class="acts"><button type="button" class="btn primary" data-sheet="close">Close</button></div>');
}

/* ---------- live editor (left dock) ---------- */
function fieldsHtml(fields){
  let h='';
  fields.forEach(f=>{
    const id="f-"+f.k,v=f.value,w=f.wide?" w":"",L=esc(f.label);
    if(f.type==="md")h+='<div class="f w"><label for="'+id+'">'+L+'</label><textarea id="'+id+'" data-f="1" rows="'+(f.rows||4)+'" data-prev="'+id+'-p">'+esc(v)+'</textarea><div class="mdprev md" id="'+id+'-p" aria-label="Preview">'+(md(v)||'<span class="muted">Preview appears here.</span>')+'</div></div>';
    else if(f.type==="select")h+='<div class="f'+w+'"><label for="'+id+'">'+L+'</label><select id="'+id+'" data-f="1">'+f.opts.map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>').join("")+'</select></div>';
    else if(f.type==="check")h+='<div class="f'+w+'"><span class="lab">'+esc(f.group||"Options")+'</span><div class="inline"><label for="'+id+'"><input type="checkbox" id="'+id+'" data-f="1"'+(v?' checked':'')+'> '+L+'</label></div></div>';
    else if(f.type==="coloropt")h+='<div class="f'+w+'"><span class="lab">'+L+'</span><div class="inline"><input type="color" id="'+id+'" data-f="1" value="'+(v||f.fallback)+'" aria-label="'+L+'"><label for="'+id+'-on"><input type="checkbox" id="'+id+'-on" data-f="1"'+(v?' checked':'')+'> Custom colour</label></div></div>';
    else h+='<div class="f'+w+'"><label for="'+id+'">'+L+'</label><input id="'+id+'" data-f="1" type="'+f.type+'" value="'+esc(v)+'"'+(f.min!=null?' min="'+f.min+'" max="'+f.max+'"':'')+'></div>';
  });
  return h;
}
function readFields(fields){
  const v={};
  fields.forEach(f=>{const el=document.getElementById("f-"+f.k);
    v[f.k]=f.type==="check"?el.checked:f.type==="coloropt"?(document.getElementById("f-"+f.k+"-on").checked?el.value:""):f.type==="number"?Math.round(+el.value):f.type==="text"?el.value.trim():el.value;});
  return v;
}
function spanCheck(v,bar){
  if(!valid(v.start))return "Enter a start date.";
  if(bar){if(!valid(v.end))return "Enter an end date.";if(v.end<v.start)return "The end date is before the start date. Move one of them.";}
  return "";
}
function itemCfg(kind,id){
  const o=find(kind,id);if(!o)return null;
  const std=[{label:"Duplicate",fn:()=>dupItem(kind,id)},{label:"Delete",cls:"danger",fn:()=>delItem(kind,id)}];
  const mdf=[{k:"hover",label:"Hover card (Markdown), shown when the pointer is over the item",type:"md",rows:3,value:o.hover},
             {k:"details",label:"Click dialog (Markdown), opened by a click in View mode",type:"md",rows:7,value:o.details}];
  const base={key:kind+":"+id,extra:std,apply:v=>{Object.assign(find(kind,id),v);},colour:()=>{const t=find(kind,id);return t?colourOf(kind,t):"";}};
  if(kind==="a"){const pc=phaseOf(o).color;return Object.assign(base,{title:"Activity",fields:[
      {k:"name",label:"Name",type:"text",value:o.name,wide:1},
      {k:"phase",label:"Workstream",type:"select",value:o.phase,opts:S.phases.map((p,i)=>[p.id,(i+1)+". "+p.name])},
      {k:"type",label:"Type",type:"select",value:o.type,opts:[["bar","Activity bar"],["milestone","Milestone"]]},
      {k:"start",label:"Start, or milestone date",type:"date",value:o.start},{k:"end",label:"End (bars only)",type:"date",value:o.end},
      {k:"color",label:"Colour",type:"coloropt",value:o.color,fallback:pc,wide:1}].concat(mdf),
    check:v=>{const bar=v.type==="bar",e=spanCheck(v,bar);if(e)return e;if(!bar)v.end=v.start;else if(v.end===v.start)v.end=mEndOf(v.start);v.name=v.name||"Untitled";return "";}});}
  if(kind==="k")return Object.assign(base,{title:"Key milestone",fields:[
      {k:"name",label:"Name",type:"text",value:o.name,wide:1},{k:"date",label:"Date",type:"date",value:o.date},{k:"color",label:"Colour",type:"color",value:o.color},
      {k:"line",label:"Show the line down the chart",type:"check",group:"Vertical line",value:o.line,wide:1}].concat(mdf),
    check:v=>{if(!valid(v.date))return "Enter a date.";v.name=v.name||"Milestone";return "";}});
  if(kind==="c")return Object.assign(base,{title:"Critical path stage",fields:[
      {k:"name",label:"Name",type:"text",value:o.name,wide:1},{k:"start",label:"Start",type:"date",value:o.start},{k:"end",label:"End",type:"date",value:o.end},
      {k:"color",label:"Colour",type:"color",value:o.color,wide:1}].concat(mdf),
    check:v=>{const e=spanCheck(v,true);if(e)return e;v.name=v.name||"Stage";return "";}});
  if(kind==="p")return Object.assign(base,{title:"Workstream",fields:[
      {k:"name",label:"Name",type:"text",value:o.name,wide:1},{k:"sub",label:"Subtitle",type:"text",value:o.sub},{k:"color",label:"Colour",type:"color",value:o.color}],
    check:v=>{v.name=v.name||"Workstream";return "";},
    extra:[{label:"Move up",fn:()=>movePhase(id,-1)},{label:"Move down",fn:()=>movePhase(id,1)},{label:"Add activity",fn:()=>addAct(id)},{label:"Delete",cls:"danger",fn:()=>delItem("p",id)}]});
  if(kind==="f")return Object.assign(base,{title:"Floating card",fields:[
      {k:"title",label:"Title",type:"text",value:o.title,wide:1},{k:"badge",label:"Badge (optional)",type:"text",value:o.badge},{k:"color",label:"Colour",type:"color",value:o.color},
      {k:"w",label:"Width in pixels (140 to 640)",type:"number",value:o.w,min:140,max:640,wide:1},
      {k:"md",label:"Card content (Markdown)",type:"md",rows:8,value:o.md}],
    check:v=>{v.title=v.title||"Card";v.badge=v.badge.slice(0,4);v.w=Math.min(640,Math.max(140,v.w||236));return "";}});
  return Object.assign(base,{title:"Panel card",fields:[
      {k:"eyebrow",label:"Small label above the title",type:"text",value:o.eyebrow},{k:"badge",label:"Badge (optional)",type:"text",value:o.badge},
      {k:"title",label:"Title",type:"text",value:o.title},{k:"color",label:"Colour",type:"color",value:o.color},
      {k:"md",label:"Card content (Markdown)",type:"md",rows:6,value:o.md}],
    check:v=>{v.title=v.title||"Card";v.badge=v.badge.slice(0,4);return "";}});
}
function roadCfg(){
  const s=S.settings;return {key:"road",title:"Roadmap settings",colour:()=>S.settings.banner,fields:[
    {k:"title",label:"Title",type:"text",value:S.title,wide:1},{k:"tagline",label:"Tagline",type:"text",value:S.tagline,wide:1},
    {k:"startYear",label:"Start year",type:"number",value:S.startYear,min:1990,max:2100},{k:"years",label:"Years shown (1 to 15)",type:"number",value:S.years,min:1,max:15},
    {k:"banner",label:"Banner and header colour",type:"color",value:s.banner},{k:"bannerInk",label:"Banner text colour",type:"color",value:s.bannerInk},
    {k:"accent",label:"Button and highlight colour",type:"color",value:s.accent},{k:"today",label:"Today line colour",type:"color",value:s.today},
    {k:"panelTitle",label:"Cards tab heading",type:"text",value:s.panelTitle,wide:1},
    {k:"fontHeadCustom",label:"Custom heading font (name of a font installed on this computer)",type:"text",value:s.fontHeadCustom,wide:1},
    {k:"fontBodyCustom",label:"Custom text font (name of a font installed on this computer)",type:"text",value:s.fontBodyCustom,wide:1}],
    check:v=>{if(!(v.startYear>=1990&&v.startYear<=2100))return "Enter a start year between 1990 and 2100.";if(!(v.years>=1&&v.years<=15))return "Show between 1 and 15 years.";
      if((v.fontHeadCustom&&!/^[\w .-]{1,40}$/.test(v.fontHeadCustom))||(v.fontBodyCustom&&!/^[\w .-]{1,40}$/.test(v.fontBodyCustom)))return "A font name can use letters, numbers, spaces, dots and hyphens.";return "";},
    apply:v=>{S.title=v.title||"Untitled programme";S.tagline=v.tagline;S.startYear=v.startYear;S.years=v.years;
      Object.assign(S.settings,{banner:v.banner,bannerInk:v.bannerInk,accent:v.accent,today:v.today,panelTitle:v.panelTitle||"Notes",fontHeadCustom:v.fontHeadCustom,fontBodyCustom:v.fontBodyCustom});}};
}
function renderDock(){
  const d=$("#dock"),rz=$("#rzDock"),on=ui.mode==="edit"&&!exporting;d.hidden=!on;rz.hidden=!on;dock=null;if(!on)return;
  const top=d.scrollTop,tabs=[["item","Selected item"],["roadmap","Roadmap"],["source","Source"]];
  let h='<div class="tabs" role="tablist" aria-label="Live editor">'+tabs.map(t=>'<button type="button" role="tab" class="tab'+(ui.dockTab===t[0]?' on':'')+'" id="dt-'+t[0]+'" data-dtab="'+t[0]+'" aria-selected="'+(ui.dockTab===t[0])+'">'+t[1]+'</button>').join("")+'</div>';
  if(ui.dockTab==="source")h+='<div class="dbody"><p>The whole roadmap as JSON. The chart follows as you type, whenever the text is valid.</p><textarea id="src" spellcheck="false" aria-label="Roadmap JSON"></textarea><p class="status" id="srcStatus">In step with the chart.</p></div>';
  else{
    dock=ui.dockTab==="roadmap"?roadCfg():(sel?itemCfg(sel.kind,sel.id):null);
    if(!dock)h+='<div class="dbody"><p>Click a bar, milestone, critical path stage, workstream or card to edit it here. Changes show on the roadmap as you type.</p><p>Or add something new:</p><div class="addrow">'+
      '<button type="button" class="btn" data-act="addPhase">Workstream</button><button type="button" class="btn" data-act="addKm">Key milestone</button><button type="button" class="btn" data-act="addCp">Critical path stage</button>'+
      '<button type="button" class="btn" data-act="addCard">Floating card</button><button type="button" class="btn" data-act="addPanel">Panel card</button></div></div>';
    else h+='<div class="dhead" style="--c:'+dock.colour()+'">'+esc(dock.title)+'</div><div class="form">'+fieldsHtml(dock.fields)+'<p class="err" id="f-err" hidden></p></div>'+
      ((dock.extra||[]).length?'<div class="acts">'+dock.extra.map((x,i)=>'<button type="button" class="btn '+(x.cls||"")+'" data-dockx="'+i+'">'+esc(x.label)+'</button>').join("")+'</div>':'');
  }
  d.innerHTML=h;d.scrollTop=top;
  if(ui.dockTab==="source")$("#src").value=JSON.stringify(S,null,2);
}
function dockApply(){
  if(!dock)return;const v=readFields(dock.fields),e=$("#f-err"),err=dock.check(v);
  if(err){e.textContent=err;e.hidden=false;return;}
  e.hidden=true;const cfg=dock;live(cfg.key,()=>cfg.apply(v));
}
function srcApply(){
  const ta=$("#src"),stt=$("#srcStatus");if(!ta)return;
  try{const d=JSON.parse(ta.value);if(!d||typeof d!=="object"||Array.isArray(d)||!Array.isArray(d.phases))throw new Error("The top level needs a \"phases\" list.");
    live("src",()=>{S=normalise(d);});stt.textContent="Valid. Applied to the chart.";stt.classList.remove("bad");}
  catch(e){stt.textContent="Not applied: "+e.message;stt.classList.add("bad");}
}
function select(kind,id){sel=kind?{kind:kind,id:id}:null;if(kind){ui.dockTab="item";if(kind==="n"&&ui.panelTab!=="cards"){ui.panelTab="cards";}}liveKey="";saveUi();render();}
function editItem(kind,id){select(kind,id);}
function openSettings(){ui.dockTab="roadmap";saveUi();renderDock();$("#dock").scrollTop=0;}
function dupItem(kind,id){
  const list=S[COLL[kind]],i=list.findIndex(x=>x.id===id);if(i<0)return;const nid=uid();
  sel={kind:kind,id:nid};mutate(()=>{const c=Object.assign({},list[i],{id:nid});if("name" in c)c.name+=" (copy)";else c.title+=" (copy)";if(kind==="f")c.y+=24;list.splice(i+1,0,c);});
}
function delItem(kind,id){
  if(kind==="p"&&S.phases.length<2){const e=$("#f-err");if(e){e.textContent="A roadmap needs at least one workstream.";e.hidden=false;}return;}
  const o=find(kind,id);if(!o)return;if(sel&&sel.id===id)sel=null;
  mutate(()=>{S[COLL[kind]]=S[COLL[kind]].filter(x=>x.id!==id);if(kind==="p")S.activities=S.activities.filter(a=>a.phase!==id);});
  toast('Deleted "'+(o.name||o.title)+'"',true);
}
function movePhase(id,d){mutate(()=>{const i=S.phases.findIndex(p=>p.id===id),j=i+d;if(j<0||j>=S.phases.length)return;const p=S.phases.splice(i,1)[0];S.phases.splice(j,0,p);});}

/* ---------- right panel: cards, guide, requirements ---------- */
function renderPanel(){
  const st=S.settings,edit=ui.mode==="edit"&&!exporting,p=$("#panel"),rz=$("#rzPanel"),show=st.showPanel&&(!exporting||S.panel.length>0);
  p.hidden=!show;rz.hidden=!show||exporting;if(!show){p.innerHTML="";p.dataset.key="";return;}
  const tab=exporting?"cards":ui.panelTab,key=tab==="cards"?"":tab;
  if(key&&p.dataset.key===key)return;p.dataset.key=key;
  let h=exporting?'':'<div class="tabs" role="tablist" aria-label="Right panel">'+[["cards","Cards"],["guide","Guide"],["reqs","Requirements"]].map(t=>'<button type="button" role="tab" class="tab'+(tab===t[0]?' on':'')+'" id="pt-'+t[0]+'" data-ptab="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+t[1]+'</button>').join("")+'</div>';
  if(tab==="cards"){
    h+='<h2>'+esc(st.panelTitle)+'</h2>';
    S.panel.forEach((c,i)=>{h+='<article class="pcard fx3d'+isSel("n",c.id)+'" id="pc-'+c.id+'" style="--c:'+c.color+';--ci:'+ink(c.color)+'"'+(edit?' data-edit="n:'+c.id+'"':'')+'>'+(c.badge?'<div class="tile">'+esc(c.badge)+'</div>':'')+
      '<div class="ptxt">'+(c.eyebrow?'<div class="eyebrow">'+esc(c.eyebrow)+'</div>':'')+'<h3>'+esc(c.title)+'</h3><div class="md">'+md(c.md)+'</div></div>'+
      (edit?'<div class="pctl"><button type="button" class="mini" id="pu-'+c.id+'" data-pmove="-1" data-id="'+c.id+'" aria-label="Move card up"'+(i?'':' disabled')+'>▲</button><button type="button" class="mini" id="pdn-'+c.id+'" data-pmove="1" data-id="'+c.id+'" aria-label="Move card down"'+(i<S.panel.length-1?'':' disabled')+'>▼</button></div>':'')+'</article>';});
    if(!S.panel.length)h+='<p class="gintro">No cards yet. '+(edit?'':'Switch to Edit to add one.')+'</p>';
    if(edit)h+='<button type="button" class="btn" data-act="addPanel">+ Panel card</button>';
  }else if(tab==="guide"){
    h+='<p class="gintro">Seven silent clips of 12 to 20 seconds each, recorded in this app. Select Enlarge to watch one at full size.</p>';
    (window.GUIDE||[]).forEach((g,i)=>{h+='<section class="gstep"><h3>'+(i+1)+'. '+esc(g.title)+'</h3><video id="v-'+g.id+'" controls muted loop playsinline preload="none" poster="'+g.clip+'.jpg" src="'+g.clip+'.mp4" aria-label="Clip: '+esc(g.title)+'"></video>'+
      '<div class="gact"><span>No sound</span><button type="button" class="btn" data-enlarge="'+i+'">Enlarge</button></div><ol>'+g.steps.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol></section>';});
  }else{
    h+='<p class="gintro">What this app was asked to do, and where to find each thing.</p>';
    (window.REQS||[]).forEach(g=>{h+='<section class="rgroup"><h3>'+esc(g.group)+'</h3><ul>'+g.items.map(r=>'<li><span class="tick" aria-label="Included">✓</span><span>'+esc(r[0])+'<small>'+esc(r[1])+'</small></span></li>').join("")+'</ul></section>';});
    h+='<section class="rgroup"><h3>To run it</h3><ul>'+(window.RUNREQS||[]).map(r=>'<li><span class="tick info" aria-hidden="true">i</span><span>'+esc(r[0])+'<small>'+esc(r[1])+'</small></span></li>').join("")+'</ul></section>';
  }
  p.innerHTML=h;
}
function enlarge(i){
  const g=(window.GUIDE||[])[i];if(!g)return;
  openSheet('<h2 id="sheetTitle">'+esc(g.title)+'</h2><video controls autoplay muted loop playsinline poster="'+g.clip+'.jpg" src="'+g.clip+'.mp4"></video><div class="acts" style="padding-top:12px"><button type="button" class="btn primary" data-sheet="close">Close</button></div>',true);
}

/* ---------- adding ---------- */
function centreMonth(){const c=$("#chart");return Math.min(months()-1,Math.max(0,Math.floor((c.scrollLeft+(c.clientWidth-leftW())/2)/mw)));}
function addAct(pid){const M=months(),i=centreMonth(),id=uid();
  mutate(()=>{const p=S.phases.find(x=>x.id===pid);if(p)p.collapsed=false;S.activities.push({id:id,phase:pid,name:"New activity",type:"bar",start:mStart(i),end:mEnd(Math.min(M-1,i+5)),color:"",hover:"",details:""});});
  const el=document.getElementById("n-"+id);if(el){el.focus();el.select();}}
function addThing(kind){
  const M=months(),i=centreMonth(),id=uid();
  mutate(()=>{
    if(kind==="p")S.phases.push({id:id,name:"New workstream",sub:"",color:PALETTE[S.phases.length%PALETTE.length],collapsed:false});
    else if(kind==="k")S.milestones.push({id:id,name:"New milestone",date:mStart(i),color:"#C8102E",line:true,hover:"",details:""});
    else if(kind==="c"){S.settings.showCritical=true;const last=S.critical.reduce((m,c)=>c.end>m?c.end:m,""),s=last&&pos(last)<M-1&&pos(last)>=0?Math.floor(posEnd(last)+0.01):i;
      S.critical.push({id:id,name:"New stage",start:mStart(Math.min(M-1,s)),end:mEnd(Math.min(M-1,s+5)),color:PALETTE[S.critical.length%PALETTE.length],hover:"",details:""});}
    else if(kind==="f"){S.settings.showCards=true;S.cards.push({id:id,title:"New card",badge:String(S.cards.length+1),color:PALETTE[S.cards.length%PALETTE.length],date:mStart(i),y:40+S.cards.length*16,w:236,md:"Write the card content in **Markdown**.\n\n- First point\n- Second point"});}
    else if(kind==="n"){S.settings.showPanel=true;S.panel.push({id:id,eyebrow:"",title:"New card",badge:String(S.panel.length+1),color:PALETTE[S.panel.length%PALETTE.length],md:"Write the card content in **Markdown**."});}
  });
  select(kind,id);
  const f=$("#dock #f-name,#dock #f-title");if(f){f.focus();f.select();}
}

/* ---------- files ---------- */
const hasHost=!!(window.claude&&typeof window.claude.use==="function");
const dlP=hasHost?Promise.resolve().then(()=>window.claude.use("downloads")).catch(()=>null):Promise.resolve(null);
async function saveFile(name,data){
  if(hasHost){
    const d=await Promise.race([dlP,new Promise(r=>setTimeout(()=>r(null),4000))]);
    if(d){try{await d.save({filename:name,data:data});toast("Saved "+name);}catch(e){if(e&&e.code==="declined")return;toast(e&&e.code==="rate_limited"?"A save prompt is already open. Answer it, then try again.":"Could not save "+name+" in this view.");}return;}
    if(typeof data==="string"){showCopy(name,data);return;}
    toast("Saving files is not available in this view. Run the app from its container to export "+name+".");return;
  }
  try{const a=document.createElement("a"),url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type:"text/plain"}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast("Saved "+name);}
  catch(e){if(typeof data==="string")showCopy(name,data);else toast("Could not save "+name+".");}
}
function showCopy(name,text){
  openSheet('<h2 id="sheetTitle">Copy '+esc(name)+'</h2><div class="form"><p class="note">Saving files is not available in this view. Copy the text and paste it into a file called '+esc(name)+'.</p>'+
    '<div class="f w"><label for="copyText">File contents</label><textarea id="copyText" rows="12" readonly>'+esc(text)+'</textarea></div></div>'+
    '<div class="acts"><button type="button" class="btn primary" data-sheet="copy">Copy text</button><button type="button" class="btn" data-sheet="close">Close</button></div>');
}
const slug=()=>(S.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"roadmap");
function toCSV(){
  const q=v=>{v=String(v);return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const rows=[["Type","Workstream","Name","Start","End"]];
  S.phases.forEach(p=>S.activities.forEach(a=>{if(a.phase===p.id)rows.push([a.type==="milestone"?"Milestone":"Activity",p.name,a.name,a.start,a.type==="milestone"?"":a.end]);}));
  S.milestones.forEach(m=>rows.push(["Key milestone","",m.name,m.date,""]));
  S.critical.forEach(c=>rows.push(["Critical path","",c.name,c.start,c.end]));
  return rows.map(r=>r.map(q).join(",")).join("\r\n")+"\r\n";
}
function parseCSV(text){
  const rows=[];let row=[],cur="",inq=false;text=text.replace(/^﻿/,"");
  for(let i=0;i<text.length;i++){const c=text[i];
    if(inq){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++;}else inq=false;}else cur+=c;}
    else if(c==='"')inq=true;else if(c===","){row.push(cur);cur="";}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cur);cur="";rows.push(row);row=[];}
    else cur+=c;}
  if(cur!==""||row.length){row.push(cur);rows.push(row);}
  return rows.filter(r=>r.some(v=>v.trim()!==""));
}
function fromCSV(text){
  const rows=parseCSV(text);if(rows.length<2)throw new Error("The CSV has no data rows.");
  const head=rows[0].map(v=>v.trim().toLowerCase()),col=function(){for(let i=0;i<arguments.length;i++){const j=head.indexOf(arguments[i]);if(j>=0)return j;}return -1;};
  const ci={type:col("type"),phase:col("workstream","phase"),name:col("name","activity"),start:col("start"),end:col("end")};
  if(ci.name<0||ci.start<0)throw new Error("The CSV needs Name and Start columns. Optional columns are Type, Workstream and End.");
  const d=JSON.parse(JSON.stringify(S));d.phases=[];d.activities=[];d.milestones=[];d.critical=[];
  const byName={};let skipped=0;
  rows.slice(1).forEach(r=>{
    const g=k=>ci[k]>=0?(r[ci[k]]||"").trim():"",type=g("type").toLowerCase(),start=anyDate(g("start")),end=anyDate(g("end"));
    if(!valid(start)){skipped++;return;}
    if(type.indexOf("key")===0){d.milestones.push({name:g("name"),date:start});return;}
    if(type.indexOf("critical")===0){if(valid(end)&&end>=start)d.critical.push({name:g("name"),start:start,end:end});else skipped++;return;}
    const pn=g("phase")||"Workstream 1";
    if(!byName[pn]){const old=S.phases.find(p=>p.name.toLowerCase()===pn.toLowerCase());byName[pn]={id:uid(),name:pn,sub:old?old.sub:"",color:old?old.color:PALETTE[d.phases.length%PALETTE.length]};d.phases.push(byName[pn]);}
    const ms=type.indexOf("milestone")===0||!valid(end)||end===start;
    d.activities.push({phase:byName[pn].id,name:g("name"),type:ms?"milestone":"bar",start:start,end:ms?start:end});
  });
  if(!d.activities.length&&!d.milestones.length&&!d.critical.length)throw new Error("No rows had a readable Start date. Use YYYY-MM-DD or DD/MM/YYYY.");
  return {data:normalise(d),skipped:skipped};
}
function importText(name,text){
  try{
    let next,skipped=0;
    if(/\.csv$/i.test(name)||!/^\s*[\[{]/.test(text)){const r=fromCSV(text);next=r.data;skipped=r.skipped;}
    else{const d=JSON.parse(text);if(!d||typeof d!=="object"||(!Array.isArray(d.phases)&&!Array.isArray(d.activities)))throw new Error("That JSON file is not a roadmap file exported from this app.");next=normalise(d);}
    mutate(()=>{S=next;});
    toast("Imported "+name+": "+next.activities.length+" activities"+(skipped?" ("+skipped+" rows skipped, no readable date)":""),true);
  }catch(e){toast("Could not import "+name+". "+(e instanceof SyntaxError?"The file is not valid JSON.":e.message));}
}
function importFile(f){if(!f)return;const r=new FileReader();r.onload=()=>importText(f.name,String(r.result));r.onerror=()=>toast("Could not read "+f.name+".");r.readAsText(f);}
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
async function exportVisual(kind){
  if(!window.htmlToImage){toast("The export library did not load. Reload the page and try again.");return;}
  toast("Preparing the export…");
  const prevMode=ui.mode;hideTip();
  try{
    ui.mode="view";exporting=true;render();await frame();render();freeze=true;document.body.classList.add("exporting");
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    await frame();
    const node=$("#capture"),w=Math.ceil(node.scrollWidth),h=Math.ceil(node.scrollHeight),ratio=Math.max(1,Math.min(2,Math.sqrt(2.4e7/(w*h))));
    const canvas=await window.htmlToImage.toCanvas(node,{width:w,height:h,pixelRatio:ratio,backgroundColor:getComputedStyle(document.body).backgroundColor});
    if(kind==="png"){const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));await saveFile(slug()+".png",blob);}
    else{
      const J=window.jspdf.jsPDF;let pdf;
      if(kind==="pdfA3"){pdf=new J({orientation:"landscape",unit:"mm",format:"a3",compress:true});const m=8,s=Math.min((420-2*m)/w,(297-2*m)/h);pdf.addImage(canvas,"PNG",(420-w*s)/2,m,w*s,h*s,undefined,"FAST");}
      else{const pw=w*0.75,phh=h*0.75;pdf=new J({orientation:pw>=phh?"landscape":"portrait",unit:"pt",format:[pw,phh],compress:true});pdf.addImage(canvas,"PNG",0,0,pw,phh,undefined,"FAST");}
      await saveFile(slug()+".pdf",pdf.output("blob"));
    }
  }catch(e){toast("The export failed. "+(e&&e.message?e.message:"Try zooming out and exporting again."));}
  finally{document.body.classList.remove("exporting");freeze=false;exporting=false;ui.mode=prevMode;render();}
}

/* ---------- dragging (edit mode) ---------- */
function drag(e,el,h){
  if(e.button!==undefined&&e.button!==0)return;
  e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(x){}
  const x0=e.clientX,y0=e.clientY;let moved=false;
  const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;if(!moved&&Math.hypot(dx,dy)<4)return;if(!moved){moved=true;dragging=true;hideTip();}h.move(dx,dy,ev);};
  const up=ev=>{el.removeEventListener("pointermove",mv);el.removeEventListener("pointerup",up);el.removeEventListener("pointercancel",up);dragging=false;
    if(moved&&ev.type==="pointerup")h.end(ev);else if(moved)render();else if(h.click)h.click(ev);};
  el.addEventListener("pointermove",mv);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);
}
function shifted(o,mode,dm,point){
  let s=o.start,e=o.end;
  if(point){s=e=addM(o.start,dm);}
  else if(mode==="m"){s=addM(o.start,dm);e=addM(o.end,dm,isEom(o.end));}
  else if(mode==="l"){s=mStart(Math.round(pos(o.start))+dm);if(s>e)s=iso(pd(e).y,pd(e).m,1);}
  else{e=mEnd(Math.round(posEnd(o.end))-1+dm);if(e<s)e=mEndOf(s);}
  return {start:s,end:e};
}
function spanDrag(e,el,kind,mode){
  const id=kind==="a"?el.dataset.id:el.dataset.cp,o=find(kind,id);if(!o)return;
  const point=kind==="a"&&o.type==="milestone",label=kind==="a"&&el.nextElementSibling&&el.nextElementSibling.classList.contains("blabel")?el.nextElementSibling:null;let next=null;
  drag(e,el,{
    move:dx=>{next=shifted(o,mode,Math.round(dx/mw),point);
      if(point){const x=pos(next.start)*mw;el.style.left=x+"px";if(label){label.style.left=(x+12)+"px";label.style.right="auto";label.textContent=fmtMY(next.start);}}
      else{const g=spanGeom(next);if(g.off)return;el.style.left=g.l+"px";el.style.width=g.w+"px";if(label){label.style.left=(g.r+6)+"px";label.style.right="auto";label.textContent=fmtMY(next.start)+" – "+fmtMY(next.end);}}},
    end:()=>{sel={kind:kind,id:id};ui.dockTab="item";if(next&&(next.start!==o.start||next.end!==o.end))mutate(()=>{Object.assign(find(kind,id),next);});else render();},
    click:()=>editItem(kind,id)
  });
}
function kmDrag(e,el){
  const id=el.dataset.km,m=find("k",id);if(!m)return;let next=m.date;
  drag(e,el,{move:dx=>{next=addM(m.date,Math.round(dx/mw));el.style.left=(pos(next)*mw)+"px";const s=el.querySelector("small");if(s)s.textContent=fmtQ(next);},
    end:()=>{sel={kind:"k",id:id};ui.dockTab="item";if(next!==m.date)mutate(()=>{find("k",id).date=next;});else render();},click:()=>editItem("k",id)});
}
function cardDrag(e,el,resize){
  const id=el.dataset.fc,c=find("f",id);if(!c)return;const x0=parseFloat(el.style.left),M=months();let nx=x0,ny=c.y,nw=c.w;
  drag(e,resize?el.querySelector(".fres"):el,{
    move:(dx,dy)=>{if(resize){nw=Math.min(640,Math.max(140,Math.round(c.w+dx)));el.style.width=nw+"px";}
      else{nx=Math.min((M-0.05)*mw,Math.max(0,x0+dx));ny=Math.max(0,Math.round(c.y+dy));el.style.left=nx+"px";el.style.top=ny+"px";}},
    end:()=>{sel={kind:"f",id:id};ui.dockTab="item";mutate(()=>{const t=find("f",id);if(resize)t.w=nw;else{t.date=fromPos(nx/mw);t.y=ny;}});},
    click:()=>{if(!resize)editItem("f",id);}
  });
}
function rowDrag(e,row){
  const id=row.dataset.id,line=$("#dropline"),inner=$("#inner");let target=null;
  drag(e,row.querySelector(".grip"),{
    move:(dx,dy,ev)=>{row.classList.add("dragging");let best=null;
      inner.querySelectorAll(".row").forEach(r=>{if(best||r===row)return;const b=r.getBoundingClientRect();if(ev.clientY>=b.top&&ev.clientY<b.bottom)best={r:r,b:b};});
      if(!best){line.hidden=true;target=null;return;}
      const grp=best.r.classList.contains("grow"),before=!grp&&ev.clientY<best.b.top+best.b.height/2;
      target={phase:best.r.dataset.phase,ref:grp?null:best.r.dataset.id,before:before};
      line.hidden=false;line.style.top=((before?best.b.top:best.b.bottom)-inner.getBoundingClientRect().top-2)+"px";},
    end:()=>{if(!target){render();return;}
      mutate(()=>{const i=S.activities.findIndex(a=>a.id===id),a=S.activities.splice(i,1)[0];a.phase=target.phase;
        if(target.ref){const j=S.activities.findIndex(x=>x.id===target.ref);S.activities.splice(target.before?j:j+1,0,a);}
        else{const j=S.activities.findIndex(x=>x.phase===target.phase);if(j<0)S.activities.push(a);else S.activities.splice(j,0,a);}});}
  });
}

/* ---------- events ---------- */
function closeMenus(except){document.querySelectorAll(".menu").forEach(m=>{if(m!==except)m.hidden=true;});}
function setMode(m){ui.mode=m;saveUi();closeSheet();render();}
(function(){const o=Object.keys(FONTS).map(k=>'<option value="'+k+'">'+FONTS[k][0]+(/^(barlow|barlowc|inter|plex|source)$/.test(k)?'':' (if installed)')+'</option>').join("");$("#t-fontHead").innerHTML=o;$("#t-fontBody").innerHTML=o;})();
const ACT={
  undo:undo,addPhase:()=>addThing("p"),addKm:()=>addThing("k"),addCp:()=>addThing("c"),addCard:()=>addThing("f"),addPanel:()=>addThing("n"),
  zin:()=>{ui.zoom="manual";mw=Math.min(60,mw*1.25);render();},zout:()=>{ui.zoom="manual";mw=Math.max(4,mw/1.25);render();},zfit:()=>{ui.zoom="fit";render();},
  today:()=>{const p=pos(todayIso()),c=$("#chart");if(p<0||p>months()){toast("Today, "+fmtD(todayIso())+", is outside this timeline. Change the start year in Settings.");return;}c.scrollLeft=Math.max(0,p*mw-(c.clientWidth-leftW())/2);},
  import:()=>$("#file").click(),exJson:()=>saveFile(slug()+".json",JSON.stringify(S,null,2)),exCsv:()=>saveFile(slug()+".csv",toCSV()),
  exPng:()=>exportVisual("png"),exPdfA3:()=>exportVisual("pdfA3"),exPdf:()=>exportVisual("pdf"),settings:openSettings,
  clear:()=>{mutate(()=>{S.activities=[];S.milestones=[];S.critical=[];S.cards=[];S.panel=[];});toast("Cleared all content",true);},
  sample:()=>{mutate(()=>{S=normalise(sample());});toast("Loaded the sample roadmap",true);}
};
$("#chart").addEventListener("pointerdown",e=>{
  if(ui.mode!=="edit")return;const t=e.target;let el;
  if((el=t.closest(".grip"))){rowDrag(e,el.closest(".row"));return;}
  if((el=t.closest(".bar"))){spanDrag(e,el,"a",t.classList.contains("hl")?"l":t.classList.contains("hr")?"r":"m");return;}
  if((el=t.closest(".dia"))){spanDrag(e,el,"a","m");return;}
  if((el=t.closest(".cp"))){spanDrag(e,el,"c",t.classList.contains("hl")?"l":t.classList.contains("hr")?"r":"m");return;}
  if((el=t.closest(".km"))){kmDrag(e,el);return;}
  if((el=t.closest(".fcard"))){cardDrag(e,el,t.classList.contains("fres"));}
});
$("#chart").addEventListener("keydown",e=>{
  const el=e.target.closest(".bar,.dia,.cp,.km");if(!el)return;const kv=el.dataset.tip.split(":"),o=find(kv[0],kv[1]);if(!o)return;const edit=ui.mode==="edit";
  if(e.key==="Enter"||e.key===" "){e.preventDefault();if(edit)editItem(kv[0],kv[1]);else openInfo(kv[0],kv[1]);}
  else if(edit&&(e.key==="ArrowLeft"||e.key==="ArrowRight")){e.preventDefault();const d=e.key==="ArrowLeft"?-1:1;
    mutate(()=>{if(kv[0]==="k")o.date=addM(o.date,d);else Object.assign(o,shifted(o,"m",d,kv[0]==="a"&&o.type==="milestone"));});}
  else if(edit&&(e.key==="Delete"||e.key==="Backspace")){e.preventDefault();delItem(kv[0],kv[1]);}
});
document.addEventListener("click",e=>{
  const t=e.target;let el;
  if((el=t.closest("[data-menu]"))){const m=document.getElementById(el.dataset.menu);closeMenus(m);m.hidden=!m.hidden;return;}
  if(!t.closest(".menu"))closeMenus();
  if((el=t.closest("[data-mode]"))){setMode(el.dataset.mode);return;}
  if((el=t.closest("[data-act]"))){closeMenus();ACT[el.dataset.act]();return;}
  if((el=t.closest("[data-dtab]"))){ui.dockTab=el.dataset.dtab;saveUi();renderDock();return;}
  if((el=t.closest("[data-ptab]"))){ui.panelTab=el.dataset.ptab;saveUi();renderPanel();return;}
  if((el=t.closest("[data-dockx]"))){if(dock&&dock.extra)dock.extra[+el.dataset.dockx].fn();return;}
  if((el=t.closest("[data-enlarge]"))){enlarge(+el.dataset.enlarge);return;}
  if((el=t.closest("[data-sheet]"))){const k=el.dataset.sheet;
    if(k==="close")closeSheet();
    else if(k==="copy"){const ta=$("#copyText");ta.select();try{navigator.clipboard.writeText(ta.value).then(()=>toast("Copied"),()=>toast("Select the text and copy it by hand."));}catch(x){toast("Select the text and copy it by hand.");}}
    return;}
  if(t.id==="toastUndo"){$("#toast").hidden=true;undo();return;}
  if(t.id==="sheet"){closeSheet();return;}
  if((el=t.closest("[data-collapse]"))){const p=find("p",el.dataset.collapse);setView(()=>{p.collapsed=!p.collapsed;});return;}
  if(ui.mode==="edit"){
    if((el=t.closest("[data-addact]"))){addAct(el.dataset.addact);return;}
    if((el=t.closest("[data-pmove]"))){const id=el.dataset.id,d=+el.dataset.pmove;mutate(()=>{const i=S.panel.findIndex(c=>c.id===id),j=i+d;if(j<0||j>=S.panel.length)return;const c=S.panel.splice(i,1)[0];S.panel.splice(j,0,c);});return;}
    if((el=t.closest("[data-edit]"))){const kv=el.dataset.edit.split(":");editItem(kv[0],kv[1]);}
    return;
  }
  if((el=t.closest("[data-tip],[data-info]"))){const kv=(el.dataset.tip||el.dataset.info).split(":");openInfo(kv[0],kv[1]);}
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset.nm){const a=find("a",t.dataset.nm),v=t.value.trim()||"Untitled";if(a&&a.name!==v)mutate(()=>{a.name=v;},true);return;}
  if(t.dataset.pn){const p=find("p",t.dataset.pn),v=t.value.trim()||"Workstream";if(p&&p.name!==v)mutate(()=>{p.name=v;},true);return;}
  if(t.dataset.toggle){const k=t.dataset.toggle;setView(()=>{S.settings[k]=t.checked;});return;}
  if(t.dataset.set){const k=t.dataset.set;setView(()=>{S.settings[k]=k==="fontScale"?+t.value:t.value;});return;}
  if(t.id==="file"){importFile(t.files[0]);t.value="";}
});
function dockInput(e){
  const t=e.target;
  if(t.id==="src"){clearTimeout(srcT);srcT=setTimeout(srcApply,350);return;}
  if(!t.dataset||!t.dataset.f)return;
  if(t.dataset.prev){const p=document.getElementById(t.dataset.prev);if(p)p.innerHTML=md(t.value)||'<span class="muted">Preview appears here.</span>';}
  if(t.type==="color"){const on=document.getElementById(t.id+"-on");if(on)on.checked=true;}
  dockApply();
}
$("#dock").addEventListener("input",dockInput);
$("#dock").addEventListener("change",e=>{if(e.target.id==="src"){clearTimeout(srcT);srcApply();renderDock();}else if(e.target.tagName==="SELECT"||e.target.type==="checkbox")dockInput(e);});
function resizer(el,get,set,dir,def){
  el.addEventListener("pointerdown",e=>{const w0=get();el.classList.add("on");drag(e,el,{move:dx=>set(w0+dir*dx,false),end:()=>{el.classList.remove("on");set(get(),true);},click:()=>el.classList.remove("on")});});
  el.addEventListener("dblclick",()=>set(def,true));
  el.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();set(get()+dir*(e.key==="ArrowRight"?16:-16),true);}});
}
resizer($("#rzDock"),()=>ui.dockW,(w,done)=>{ui.dockW=Math.min(640,Math.max(260,Math.round(w)));$("#work").style.setProperty("--dockw",ui.dockW+"px");if(done)saveUi();},1,330);
resizer($("#rzPanel"),()=>S.settings.panelW,(w,done)=>{S.settings.panelW=Math.min(720,Math.max(240,Math.round(w)));$("#stage").style.setProperty("--panelw",S.settings.panelW+"px");if(done)save();},-1,320);
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){if(!$("#sheet").hidden)closeSheet();else if(sel&&!e.target.closest("#dock")){sel=null;render();}closeMenus();return;}
  if(e.key==="Enter"&&e.target.matches&&e.target.matches(".nm")){e.target.blur();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&!e.shiftKey&&ui.mode==="edit"&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)&&!e.target.isContentEditable){e.preventDefault();undo();}
});
document.addEventListener("mousemove",moveTip);
document.addEventListener("mouseleave",hideTip);
window.addEventListener("scroll",hideTip,true);
document.addEventListener("pointermove",e=>{
  const c=e.target.closest&&e.target.closest(".fx3d");
  if(tiltEl&&tiltEl!==c){tiltEl.style.removeProperty("--rx");tiltEl.style.removeProperty("--ry");}
  tiltEl=c;if(!c||!S||!S.settings.float3d||dragging||e.pointerType==="touch")return;
  const b=c.getBoundingClientRect();c.style.setProperty("--ry",(((e.clientX-b.left)/b.width-0.5)*8).toFixed(2)+"deg");c.style.setProperty("--rx",(-((e.clientY-b.top)/b.height-0.5)*8).toFixed(2)+"deg");
});
[["title","title","Untitled programme"],["tagline","tagline",""]].forEach(c=>{
  const el=$("#"+c[0]);
  el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();el.blur();}});
  el.addEventListener("paste",e=>{e.preventDefault();const tx=(e.clipboardData||window.clipboardData).getData("text").replace(/\s+/g," "),s=window.getSelection();if(s.rangeCount){s.deleteFromDocument();s.getRangeAt(0).insertNode(document.createTextNode(tx));s.collapseToEnd();}});
  el.addEventListener("blur",()=>{if(ui.mode!=="edit")return;const v=el.textContent.replace(/\s+/g," ").trim()||c[2];if(v!==S[c[1]])mutate(()=>{S[c[1]]=v;});else el.textContent=v;});
});
let dragDepth=0;const hasFiles=e=>e.dataTransfer&&Array.from(e.dataTransfer.types||[]).indexOf("Files")>=0;
window.addEventListener("dragenter",e=>{if(hasFiles(e)){dragDepth++;document.body.classList.add("dropping");}});
window.addEventListener("dragleave",()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)document.body.classList.remove("dropping");});
window.addEventListener("dragover",e=>{if(hasFiles(e))e.preventDefault();});
window.addEventListener("drop",e=>{if(!e.dataTransfer||!e.dataTransfer.files||!e.dataTransfer.files.length)return;e.preventDefault();dragDepth=0;document.body.classList.remove("dropping");importFile(e.dataTransfer.files[0]);});
if(window.ResizeObserver){let raf=0;new ResizeObserver(()=>{if(ui.zoom!=="fit"||!S||freeze)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(!freeze&&Math.abs(fitMw()-mw)>0.01)render();});}).observe($("#chart"));}

/* ---------- boot ---------- */
function start(data){
  try{const u=JSON.parse(localStorage.getItem(UIKEY)||"{}");if(u.mode==="edit"||u.mode==="view")ui.mode=u.mode;
    if(["item","roadmap","source"].indexOf(u.dockTab)>=0)ui.dockTab=u.dockTab;if(["cards","guide","reqs"].indexOf(u.panelTab)>=0)ui.panelTab=u.panelTab;if(u.dockW>=260&&u.dockW<=640)ui.dockW=u.dockW;}catch(e){}
  S=data&&Array.isArray(data.phases)?normalise(data):(load()||normalise(sample()));render();
}
const hot=window.claude&&window.claude.hot;
if(hot&&typeof hot.snapshot==="function"){try{hot.snapshot(()=>S);}catch(e){}}
if(hot&&typeof hot.ready==="function")hot.ready(start);else start((hot&&hot.data)||{});
window.__roadmap={get state(){return S;},importText:importText,toCSV:toCSV};
})();
