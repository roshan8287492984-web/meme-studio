const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$("#memeCanvas"), ctx=canvas.getContext("2d");
let image=null, bg="#ffffff", bgImage=null, ratio=1, texts=[], stickers=[], canvasImages=[], drawPaths=[], selectedText=0, selectedSticker=-1, selectedImage=-1, dragging=null, resizingSticker=null, resizingImage=null, resizingText=null, drawingPath=null, drawColor="#ff3b30", activeTool="text";
let history=[], future=[];
function stateSnapshot(){
 const cleanStickers=stickers.map(({char,src,x,y,size,custom})=>({char,src,x,y,size,custom}));
 const cleanImages=canvasImages.map(({src,x,y,w,h})=>({src,x,y,w,h}));
 const bgImageState=bgImage?.src||null;
 const imageState=image?.src||null;
 return JSON.stringify({texts,stickers:cleanStickers,canvasImages:cleanImages,drawPaths,bg,bgImage:bgImageState,image:imageState,ratio,drawColor});
}
function saveState(){
 history.push(stateSnapshot());
 if(history.length>30)history.shift();
 future=[];
}
function restore(s){
 const o=JSON.parse(s);
 texts=o.texts||[];
 stickers=(o.stickers||[]).map(st=>{
   if(st.custom&&st.src){
     const img=new Image(); img.onload=()=>draw(); img.src=st.src; st.image=img;
   }
   return st;
 });
 canvasImages=(o.canvasImages||[]).map(im=>{
   const img=new Image(); img.onload=()=>draw(); img.src=im.src; im.image=img; return im;
 });
 drawPaths=o.drawPaths||[];
 bg=o.bg||"#ffffff"; ratio=o.ratio||1; drawColor=o.drawColor||"#ff3b30";
 image=null;
 if(o.image){const ii=new Image();ii.onload=()=>draw();ii.src=o.image;image=ii;}
 bgImage=null;
 if(o.bgImage){const bi=new Image();bi.onload=()=>draw();bi.src=o.bgImage;bgImage=bi;} updateDrawColorUI(); updateBackgroundUI();
 selectedSticker=-1; selectedImage=-1; selectedText=texts.length?Math.min(selectedText,texts.length-1):-1;
 resizeCanvas(); updateEditor(); draw();
}
function wrapTextLines(text,maxWidth){
 const words=text.split(/\s+/).filter(Boolean);
 if(!words.length)return [""];
 const lines=[];let line="";
 for(const word of words){
   const test=line?line+" "+word:word;
   if(ctx.measureText(test).width<=maxWidth||!line)line=test;
   else{lines.push(line);line=word;}
 }
 if(line)lines.push(line);
 const out=[];
 for(const item of lines){
   if(ctx.measureText(item).width<=maxWidth){out.push(item);continue;}
   let part="";
   for(const ch of item){
     const test=part+ch;
     if(ctx.measureText(test).width<=maxWidth||!part)part=test;
     else{out.push(part);part=ch;}
   }
   if(part)out.push(part);
 }
 return out.length?out:[""];
}
function getTextLayout(t){
 const value=t.uppercase===false?t.text:t.text.toUpperCase();
 let size=t.size,maxWidth=canvas.width*.82;
 if($("#autofit")?.checked)size=Math.min(size,canvas.width/Math.max(4,value.length*.55));
 ctx.save();
 ctx.font=`${t.bold?"800":"600"} ${size}px "${t.font||$("#fontSelect").value}", Impact, sans-serif`;
 const lines=wrapTextLines(value,maxWidth),lineHeight=size*1.08;
 const maxLineWidth=Math.max(...lines.map(x=>ctx.measureText(x).width),0);
 ctx.restore();
 return {lines,size,lineHeight,maxLineWidth};
}
const customFonts=new Map();
async function loadCustomFont(file){
 try{
   const buffer=await file.arrayBuffer();
   const fontName="CustomFont_"+Date.now();
   const face=new FontFace(fontName,buffer);
   await face.load();
   document.fonts.add(face);
   customFonts.set(fontName,file.name);
   const option=document.createElement("option");
   option.value=fontName;
   option.textContent=file.name.replace(/\.(ttf|otf|woff2?|)$/i,"");
   option.dataset.custom="true";
   $("#fontSelect").appendChild(option);
   $("#fontSelect").value=fontName;
   if(texts[selectedText]) texts[selectedText].font=fontName;
   saveState();draw();updateEditor();
 }catch(err){
   alert("This font could not be loaded. Please try a valid TTF, OTF, WOFF, or WOFF2 file.");
 }
}
$("#addCustomFontBtn").onclick=()=>$("#customFontInput").click();
$("#customFontInput").onchange=e=>{
 const file=e.target.files?.[0];
 if(file) loadCustomFont(file);
 e.target.value="";
};

function draw(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
 if(image){
   const iw=image.width,ih=image.height,scale=Math.min(canvas.width/iw,canvas.height/ih);
   const w=iw*scale,h=ih*scale;
   ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
 }
 // Draw freehand paths
 drawPaths.forEach(path=>{
   if(!path.points||path.points.length<2)return;
   ctx.save(); ctx.strokeStyle=path.color||"#ff3b30"; ctx.lineWidth=path.width||8;
   ctx.lineCap="round"; ctx.lineJoin="round"; ctx.globalAlpha=path.opacity??1;
   ctx.beginPath();
   path.points.forEach((p,i)=>i?ctx.lineTo(p.x*canvas.width,p.y*canvas.height):ctx.moveTo(p.x*canvas.width,p.y*canvas.height));
   ctx.stroke(); ctx.restore();
 });
 // Added images
 canvasImages.forEach((im,i)=>{
   if(im.image)ctx.drawImage(im.image,(im.x-im.w/2)*canvas.width,(im.y-im.h/2)*canvas.height,im.w*canvas.width,im.h*canvas.height);
   if(i===selectedImage){
     const hw=im.w/2,hh=im.h/2;
     ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle="#8f84ff";ctx.lineWidth=2;
     ctx.strokeRect((im.x-hw)*canvas.width,(im.y-hh)*canvas.height,im.w*canvas.width,im.h*canvas.height);
     ctx.setLineDash([]);
     ctx.fillStyle="#e95460";ctx.beginPath();ctx.arc((im.x+hw)*canvas.width,(im.y-hh)*canvas.height,10,0,Math.PI*2);ctx.fill();
     ctx.fillStyle="#fff";ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("×",(im.x+hw)*canvas.width,(im.y-hh)*canvas.height);
     ctx.fillStyle="#6d5dfc";ctx.beginPath();ctx.arc((im.x+hw)*canvas.width,(im.y+hh)*canvas.height,7,0,Math.PI*2);ctx.fill();
     ctx.restore();
   }
 });
 stickers.forEach((sticker,i)=>{
   ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
   if(sticker.custom&&sticker.image){
     const side=sticker.size;
     ctx.drawImage(sticker.image,sticker.x*canvas.width-side/2,sticker.y*canvas.height-side/2,side,side);
   }else{
     ctx.font=`${sticker.size}px Arial`;ctx.fillText(sticker.char,sticker.x*canvas.width,sticker.y*canvas.height);
   }
   if(i===selectedSticker){
     const box=sticker.size*.72;
     ctx.setLineDash([4,4]);ctx.strokeStyle="#8f84ff";ctx.lineWidth=2;
     ctx.strokeRect(sticker.x*canvas.width-box,sticker.y*canvas.height-box,box*2,box*2);
     ctx.setLineDash([]);
     ctx.fillStyle="#e95460";ctx.beginPath();ctx.arc(sticker.x*canvas.width+box,sticker.y*canvas.height-box,10,0,Math.PI*2);ctx.fill();
     ctx.fillStyle="#fff";ctx.font="bold 13px Arial";ctx.fillText("×",sticker.x*canvas.width+box,sticker.y*canvas.height-box);
     ctx.fillStyle="#6d5dfc";ctx.beginPath();ctx.arc(sticker.x*canvas.width+box,sticker.y*canvas.height+box,7,0,Math.PI*2);ctx.fill();
   }
   ctx.restore();
 });
 texts.forEach((t,i)=>{
   const {lines,size,lineHeight}=getTextLayout(t);
   ctx.save();ctx.globalAlpha=($("#opacityRange")?.value||100)/100;
   ctx.textAlign="center";ctx.textBaseline="middle";
   ctx.font=`${t.bold?"800":"600"} ${size}px "${t.font||$("#fontSelect").value}", Impact, sans-serif`;
   if(t.shadow==="soft"){ctx.shadowColor="rgba(0,0,0,.48)";ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.shadowOffsetX=0}
   else if(t.shadow==="hard"){ctx.shadowColor="#000";ctx.shadowBlur=0;ctx.shadowOffsetX=3;ctx.shadowOffsetY=3}
   else{ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0}
   ctx.lineJoin="round";ctx.strokeStyle="#000";ctx.lineWidth=t.outline||8;ctx.fillStyle=t.color||"#fff";
   const centerX=t.x*canvas.width,centerY=t.y*canvas.height,totalHeight=lines.length*lineHeight;
   lines.forEach((line,index)=>{const y=centerY-totalHeight/2+lineHeight*(index+.5);ctx.strokeText(line,centerX,y);ctx.fillText(line,centerX,y)});
   ctx.restore();
   if(i===selectedText&&activeTool!=="draw"){
     const b=getTextBounds(t),hw=b.halfW*canvas.width,hh=b.halfH*canvas.height;
     ctx.save();
     ctx.setLineDash([4,4]);ctx.strokeStyle="#8f84ff";ctx.lineWidth=2;
     ctx.strokeRect(b.left*canvas.width,b.top*canvas.height,hw*2,hh*2);
     ctx.setLineDash([]);
     // Delete handle — red X, matching Quick Stickers.
     ctx.fillStyle="#e95460";ctx.beginPath();ctx.arc(b.right*canvas.width,b.top*canvas.height,10,0,Math.PI*2);ctx.fill();
     ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();
     ctx.fillStyle="#fff";ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("×",b.right*canvas.width,b.top*canvas.height);
     // Scale handle — purple corner control.
     ctx.fillStyle="#6d5dfc";ctx.beginPath();ctx.arc(b.right*canvas.width,b.bottom*canvas.height,8,0,Math.PI*2);ctx.fill();
     ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();
     ctx.fillStyle="#fff";ctx.font="bold 12px Arial";ctx.fillText("↘",b.right*canvas.width,b.bottom*canvas.height);
     ctx.restore();
   }
 });
}
function updateEditor(){
 const t=texts[selectedText];if(!t)return;
 $("#captionInput").value=t.text;
 $("#fontSize").value=t.size;
 $("#textColor").value=t.color||"#fff";
 $("#outlineSize").value=t.outline||8;
 $("#outlineValue").textContent=(t.outline||8)+"px";
 $("#uppercase").checked=t.uppercase!==false;
 $("#fontSelect").value=t.font||"Impact";
 $("#bold").checked=t.bold===true;
 $("#shadowSelect").value=t.shadow||"soft";
}

function resizeCanvas(){const max=900;let w=max,h=max;if(ratio>1){w=max;h=max/ratio}else{h=max;w=max*ratio}canvas.width=Math.round(w);canvas.height=Math.round(h);draw()}
function getDownloadBaseName(){
 const input=$("#downloadFilename");
 let name=(input?.value||"meme-studio").trim();
 name=name.replace(/\.(png|gif)$/i,"").replace(/[\\/:*?"<>|]+/g,"-").replace(/[. ]+$/g,"").trim();
 if(!name)name="meme-studio";
 if(input)input.value=name;
 return name;
}
async function download(){
 try {
   const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas export failed")), "image/png"));
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = getDownloadBaseName()+".png";
   a.style.display = "none";
   document.body.appendChild(a);
   a.click();
   a.remove();
   setTimeout(() => URL.revokeObjectURL(url), 2000);
 } catch (err) {
   console.error("Download failed:", err);
   try {
     const a=document.createElement("a");
     a.href=canvas.toDataURL("image/png");
     a.download=getDownloadBaseName()+".png";
     document.body.appendChild(a); a.click(); a.remove();
   } catch (fallbackErr) {
     alert("Could not download the meme. Please try again in Chrome/Edge with the site running on Live Server.");
   }
 }
}
function addText(){
 const count=texts.length;
 const y=Math.min(.88,Math.max(.12,.22+count*.12));
 const newText={text:"NEW TEXT",x:.5,y,size:58,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true};
 if (typeof gifTextColor !== "undefined") newText.color=gifTextColor||"#ffffff";
 texts.push(newText);
 selectedText=texts.length-1;
 selectedSticker=-1;
 selectedImage=-1;
 activeTool="text";
 saveState();
 draw();
 updateEditor();
 if(typeof updateGifUI === "function") updateGifUI();
 const input=$("#captionInput");
 if(input){input.focus();input.select();}
}

function fileUpload(file){if(!file)return;const img=new Image();img.onload=()=>{image=img;texts=[{text:"TOP TEXT",x:.5,y:.12,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true},{text:"BOTTOM TEXT",x:.5,y:.88,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true}];selectedText=0;selectedSticker=-1;selectedImage=-1;drawPaths=[];canvasImages=[];$("#emptyCanvas").classList.add("hidden");$("#statusText").textContent="Custom image loaded";saveState();draw();updateEditor()};img.src=URL.createObjectURL(file)}
// --- Supabase meme templates -------------------------------------------------
// This is the browser-safe Publishable key. Never put a Supabase secret key here.
const SUPABASE_URL = "https://dlqqodmaqtsekirkcjee.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LsZ4J1J5hLGF1V3OBj-tJg_wBThVUhI";
let memeTemplates = [];
let activeTemplateCategory = "all";

function templateImage(src, onReady, onError){
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => onReady(img);
  img.onerror = () => onError?.();
  img.src = src;
  return img;
}

function loadRemoteTemplateFromStorage(){
  const params=new URLSearchParams(location.search);
  if(params.get("remoteTemplate")!=="1") return;
  try{
    const raw=localStorage.getItem("memeStudioRemoteTemplate");
    if(!raw) return;
    const t=JSON.parse(raw);
    if(t && (t.image_url||t.thumbnail_url)){
      setMemeImageFromUrl(t.image_url||t.thumbnail_url,t.title||"Meme template");
      localStorage.removeItem("memeStudioRemoteTemplate");
    }
  }catch(err){console.warn("Could not open selected template:",err)}
}

function setMemeImageFromUrl(url, title="Meme template") {
  if(!url) return;
  const img = templateImage(url, img => {
    image = img;
    texts = [
      {text:"TOP TEXT",x:.5,y:.12,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true},
      {text:"BOTTOM TEXT",x:.5,y:.88,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true}
    ];
    selectedText=0; selectedSticker=-1; selectedImage=-1; drawPaths=[]; canvasImages=[];
    $("#emptyCanvas")?.classList.add("hidden");
    $("#statusText").textContent = title + " loaded";
    saveState(); draw(); updateEditor();
  }, () => {
    alert("This template image could not be loaded. The image host may block browser access (CORS). Please try another template or upload the image yourself.");
  });
}

function templateMatches(t){
  const q=( $("#templateSearch")?.value || "" ).trim().toLowerCase();
  const hay=[t.title,t.description,t.category,t.tags,t.type].filter(Boolean).join(" ").toLowerCase();
  if(q && !hay.includes(q)) return false;
  if(activeTemplateCategory!=="all" && !(String(t.category||"").toLowerCase()===activeTemplateCategory || String(t.tags||"").toLowerCase().includes(activeTemplateCategory))) return false;
  return true;
}

function renderTemplateGrid(){
  const grid=$("#templateGrid"), loading=$("#templateLoading");
  if(!grid) return;
  const items=memeTemplates.filter(templateMatches);
  grid.innerHTML="";
  if(loading) loading.classList.add("hidden");
  if(!items.length){
    grid.innerHTML='<div class="template-empty">No templates found.</div>';
    return;
  }
  items.forEach(t=>{
    const card=document.createElement("button");
    card.type="button"; card.className="template-card";
    card.title=t.title||"Use template";
    const thumb=document.createElement("div"); thumb.className="template-thumb";
    const img=document.createElement("img"); img.alt=t.title||"Meme template"; img.loading="lazy"; img.referrerPolicy="no-referrer";
    img.src=t.thumbnail_url||t.image_url||"";
    thumb.appendChild(img);
    const use=document.createElement("span"); use.className="template-use"; use.textContent="Use template";
    const name=document.createElement("div"); name.className="template-name"; name.textContent=t.title||"Untitled meme";
    card.append(thumb,use,name);
    card.addEventListener("click",()=>setMemeImageFromUrl(t.image_url||t.thumbnail_url,t.title||"Meme template"));
    grid.appendChild(card);
  });
}

async function loadMemeTemplates(){
  const grid=$("#templateGrid"), loading=$("#templateLoading");
  if(!grid) return;
  try{
    const url=SUPABASE_URL+"/rest/v1/memes?select=id,created_at,title,image_url,description,category&order=id.asc";
    const res=await fetch(url,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});
    if(!res.ok) throw new Error("Supabase returned "+res.status);
    memeTemplates=await res.json();
    renderTemplateGrid();
  }catch(err){
    console.error("Could not load meme templates:",err);
    if(loading) loading.textContent="Templates could not be loaded. Check the Supabase Data API and table access.";
  }
}

$("#templateSearch")?.addEventListener("input",renderTemplateGrid);
$$("#templateTabs .tab").forEach(btn=>btn.addEventListener("click",()=>{
  $$("#templateTabs .tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  activeTemplateCategory=btn.dataset.category||"all";
  renderTemplateGrid();
}));
$("#templateUpload")?.addEventListener("click",()=>$("#fileInput")?.click());
loadMemeTemplates();
loadRemoteTemplateFromStorage();

["#heroUpload","#emptyUpload"].forEach(sel=>{const el=$(sel);if(el)el.onclick=e=>{e.preventDefault();$("#fileInput")?.click()}});
const fileInput=$("#fileInput");
if(fileInput) fileInput.onchange=e=>fileUpload(e.target.files[0]);
$("#captionInput").oninput=e=>{if(!texts.length)addText();texts[selectedText].text=e.target.value;draw()};
$("#fontSelect").onchange=e=>{if(texts[selectedText]){texts[selectedText].font=e.target.value;saveState();draw()}};
$("#fontSize").oninput=e=>{if(texts[selectedText])texts[selectedText].size=+e.target.value;draw()};
$("#textColor").oninput=e=>{if(texts[selectedText])texts[selectedText].color=e.target.value;draw()};

$("#outlineSize").oninput=e=>{if(texts[selectedText])texts[selectedText].outline=+e.target.value;$("#outlineValue").textContent=e.target.value+"px";draw()};
$("#uppercase").onchange=e=>{
 if(!texts.length)return;
 texts[selectedText].uppercase=e.target.checked;
 saveState();
 draw();
};$("#bold").onchange=e=>{
 if(!texts.length)return;
 texts[selectedText].bold=e.target.checked;
 saveState();draw();
};
$("#shadowSelect").onchange=e=>{
 if(!texts.length)return;
 texts[selectedText].shadow=e.target.value;
 saveState();draw();
};
$("#autofit").onchange=draw;
$("#addTextBtn").onclick=()=>addText();
$("#deleteStickerBtn").onclick=()=>{
 if(selectedSticker<0||selectedSticker>=stickers.length)return;
 stickers.splice(selectedSticker,1);
 selectedSticker=stickers.length?Math.min(selectedSticker,stickers.length-1):-1;
 saveState();draw();
};
$("#deleteTextBtn").onclick=()=>{
 if(!texts.length || selectedText<0 || selectedText>=texts.length)return;
 texts.splice(selectedText,1);
 if(texts.length) selectedText=Math.max(0,Math.min(selectedText,texts.length-1));
 else selectedText=0;
 saveState();
 draw();
 updateEditor();
};

$("#opacityRange").oninput=e=>{$("#opacityValue").textContent=e.target.value+"%";draw()};
$("#resetBtn").onclick=()=>{image=null;bgImage=null;texts=[];stickers=[];bg="#ffffff";updateBackgroundUI();selectedSticker=-1;$("#emptyCanvas").classList.remove("hidden");$("#statusText").textContent="Ready to create";$("#clearBgImageBtn").hidden=true;draw()};
$("#downloadBtn").onclick=$("#downloadTop").onclick=download;
$("#copyBtn").onclick=async()=>{try{const b=await new Promise(r=>canvas.toBlob(r,"image/png"));await navigator.clipboard.write([new ClipboardItem({"image/png":b})]);$("#copyBtn").textContent="Copied ✓";setTimeout(()=>$("#copyBtn").textContent="Copy to clipboard",1400)}catch(e){alert("Clipboard access is not available in this browser.")}};
$("#undoBtn").onclick=()=>{if(history.length>1){future.push(history.pop());restore(history[history.length-1])}};
$("#redoBtn").onclick=()=>{if(future.length){const s=future.pop();history.push(s);restore(s)}};
$("#themeToggle").onclick=()=>{document.body.classList.toggle("dark");$("#themeToggle").textContent=document.body.classList.contains("dark")?"🌙":"☀️";localStorage.theme=document.body.classList.contains("dark")?"dark":"light"};
if(localStorage.theme==="dark"){document.body.classList.add("dark");$("#themeToggle").textContent="🌙"}
$$(".editor-tab").forEach(b=>b.onclick=()=>{$$(".editor-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");["text","style","canvas"].forEach(x=>$("#"+x+"Editor").classList.add("hidden"));$("#"+b.dataset.editor+"Editor").classList.remove("hidden")});
$$(".swatch").forEach(b=>b.onclick=()=>{$$(".swatch").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#textColor").value=b.dataset.color;if(texts[selectedText])texts[selectedText].color=b.dataset.color;draw()});
$$(".draw-swatch").forEach(b=>b.addEventListener("click",()=>{setDrawColor(b.dataset.drawColor,true);if(activeTool!=="draw")setTool("draw")}));
$("#drawColor").oninput=e=>setDrawColor(e.target.value,false);
$("#drawColor").onchange=e=>setDrawColor(e.target.value,true);
$$(".sticker-grid button").forEach(b=>b.onclick=()=>{stickers.push({char:b.dataset.sticker,x:.5,y:.5,size:74});selectedSticker=stickers.length-1;selectedText=-1;saveState();draw()});
$$(".ratio").forEach(b=>b.onclick=()=>{$$(".ratio").forEach(x=>x.classList.remove("active"));b.classList.add("active");ratio=+b.dataset.ratio;resizeCanvas()});
function updateBackgroundUI(){
  $$(".bg").forEach(b=>b.classList.toggle("active",b.dataset.bg.toLowerCase()===bg.toLowerCase()));
  $("#bgColor").value=bg;
}
$$(".bg").forEach(b=>b.onclick=()=>{
  bg=b.dataset.bg;
  bgImage=null;
  $("#clearBgImageBtn").hidden=true;
  updateBackgroundUI();
  saveState();
  draw();
});
$("#bgColor").oninput=e=>{
  bg=e.target.value;
  bgImage=null;
  $("#clearBgImageBtn").hidden=true;
  $$(".bg").forEach(b=>b.classList.remove("active"));
  saveState();
  draw();
};
$("#bgImageBtn").onclick=()=>$("#bgImageInput").click();
$("#bgImageInput").onchange=e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const bi=new Image();
    bi.onload=()=>{
      bgImage=bi;
      $("#clearBgImageBtn").hidden=false;
      $$(".bg").forEach(b=>b.classList.remove("active"));
      saveState();
      draw();
    };
    bi.src=ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value="";
};
$("#clearBgImageBtn").onclick=()=>{
  bgImage=null;
  $("#clearBgImageBtn").hidden=true;
  updateBackgroundUI();
  saveState();
  draw();
};
$("#canvasWrap").ondragover=e=>e.preventDefault();$("#canvasWrap").ondrop=e=>{e.preventDefault();fileUpload(e.dataTransfer.files[0])};
function getSelectedDeleteHandle(){
 if(selectedSticker>=0&&stickers[selectedSticker]) return {type:"sticker",index:selectedSticker};
 if(selectedText>=0&&texts[selectedText]) return {type:"text",index:selectedText};
 return null;
}
function deleteObject(type,index){
 if(type==="sticker"){
   if(index<0||index>=stickers.length)return;
   stickers.splice(index,1);
   selectedSticker=stickers.length?Math.min(index,stickers.length-1):-1;
   selectedText=-1;
 }else{
   if(index<0||index>=texts.length)return;
   texts.splice(index,1);
   selectedText=texts.length?Math.min(index,texts.length-1):-1;
   selectedSticker=-1;
 }
 saveState();draw();updateEditor();
}
function addCustomSticker(src){
 const img=new Image();
 img.onload=()=>{
   stickers.push({
     char:null,
     src:src,
     image:img,
     x:.5,
     y:.5,
     size:96,
     custom:true
   });
   selectedSticker=stickers.length-1;
   selectedImage=-1;
   selectedText=-1;
   saveState();
   draw();
 };
 img.src=src;
}
$("#addCustomStickerBtn").onclick=()=>$("#customStickerInput").click();
$("#customStickerInput").onchange=e=>{
 const file=e.target.files?.[0];
 if(!file)return;
 const reader=new FileReader();
 reader.onload=ev=>addCustomSticker(ev.target.result);
 reader.readAsDataURL(file);
 e.target.value="";
};

function getStickerBounds(s){
 const half=(s.size*.72)/canvas.width;
 return {left:s.x-half,right:s.x+half,top:s.y-half,bottom:s.y+half,half};
}
function hitTestSticker(x,y){
 for(let i=stickers.length-1;i>=0;i--){
   const b=getStickerBounds(stickers[i]);
   if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)return i;
 }
 return -1;
}
function stickerResizeHandleHit(x,y,index){
 if(index<0||!stickers[index])return false;
 const b=getStickerBounds(stickers[index]);
 return Math.hypot(x-b.right,y-b.bottom)<=18/canvas.width;
}
function stickerDeleteHandleHit(x,y,index){
 if(index<0||!stickers[index])return false;
 const b=getStickerBounds(stickers[index]);
 return Math.hypot(x-b.right,y-b.top)<=18/canvas.width;
}

function getTextBounds(t){
 const layout=getTextLayout(t);
 const halfW=Math.min(canvas.width*.88,layout.maxLineWidth+24)/2/canvas.width;
 const halfH=(layout.lines.length*layout.lineHeight/2+12)/canvas.height;
 return {left:t.x-halfW,right:t.x+halfW,top:t.y-halfH,bottom:t.y+halfH,halfW,halfH};
}
function textResizeHandleHit(x,y,index){
 if(index<0||!texts[index])return false;
 const b=getTextBounds(texts[index]);
 return Math.hypot((x-b.right)*canvas.width,(y-b.bottom)*canvas.height)<=34;
}
function textDeleteHandleHit(x,y,index){
 if(index<0||!texts[index])return false;
 const b=getTextBounds(texts[index]);
 return Math.hypot((x-b.right)*canvas.width,(y-b.top)*canvas.height)<=34;
}

function hitTestText(x,y){
 let found=-1;
 for(let i=texts.length-1;i>=0;i--){
   const layout=getTextLayout(texts[i]);
   const halfW=(Math.min(canvas.width*.88,layout.maxLineWidth+24)/2)/canvas.width;
   const halfH=(layout.lines.length*layout.lineHeight/2+12)/canvas.height;
   if(Math.abs(x-texts[i].x)<=halfW&&Math.abs(y-texts[i].y)<=halfH){found=i;break}
 }
 return found;
}
function editTextOnCanvas(index){
 if(index<0)return;
 selectedText=index;
 updateEditor();
 draw();
 const t=texts[index];
 const r=canvas.getBoundingClientRect();
 const input=document.createElement("input");
 input.className="canvas-text-editor";
 input.value=t.text;
 input.style.left=`${r.left + t.x*r.width}px`;
 input.style.top=`${r.top + t.y*r.height}px`;
 input.style.width=`${Math.min(320,Math.max(130,r.width*.55))}px`;
 document.body.appendChild(input);
 input.focus();
 input.select();
 const finish=()=>{
   if(!input.isConnected)return;
   t.text=input.value;
   input.remove();
   saveState();
   draw();
   updateEditor();
 };
 input.addEventListener("input",()=>{t.text=input.value;draw()});
 input.addEventListener("keydown",e=>{
   if(e.key==="Enter" && !e.shiftKey){e.preventDefault();finish()}
   if(e.key==="Escape"){input.remove();draw()}
 });
 input.addEventListener("blur",finish);
}
function canvasPoint(e){
 const r=canvas.getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
}
function imageBounds(im){
 return {left:im.x-im.w/2,right:im.x+im.w/2,top:im.y-im.h/2,bottom:im.y+im.h/2};
}
function hitTestImage(x,y){
 for(let i=canvasImages.length-1;i>=0;i--){const b=imageBounds(canvasImages[i]);if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)return i}
 return -1;
}
function imageHandleHit(x,y,index,kind){
 if(index<0||!canvasImages[index])return false;
 const b=imageBounds(canvasImages[index]);
 const tx=kind==="resize"?b.right:b.right, ty=kind==="resize"?b.bottom:b.top;
 return Math.hypot((x-tx)*canvas.width,(y-ty)*canvas.height)<=16;
}
function updateDrawColorUI(){
  const input=$("#drawColor"), value=$("#drawColorValue");
  if(input) input.value=drawColor;
  if(value) value.textContent=drawColor.toUpperCase();
  $$(".draw-swatch").forEach(b=>b.classList.toggle("active",b.dataset.drawColor.toLowerCase()===drawColor.toLowerCase()));
}
function setDrawColor(color,save=false){if(!color)return;drawColor=color;updateDrawColorUI();if(save)saveState()}
function setTool(tool){
  activeTool=tool;
  $$(".tool-btn").forEach(b=>{
    b.classList.toggle("active",b.dataset.tool===tool);
    b.setAttribute("aria-pressed",b.dataset.tool===tool ? "true" : "false");
  });

  const stage=canvas.closest(".canvas-stage");
  stage?.classList.toggle("drawing",tool==="draw");
  $("#drawControls")?.classList.toggle("hidden",tool!=="draw");
  updateDrawColorUI();

  canvas.style.cursor=tool==="draw"?"crosshair":"default";
  canvas.style.touchAction=tool==="draw"?"none":"none";

  if(tool!=="draw"){
    drawingPath=null;
    dragging=null;
    resizingText=null;
    resizingText=null;
    resizingSticker=null;
    resizingImage=null;
  }

  if(tool==="draw"){
    selectedText=-1;
    selectedSticker=-1;
    selectedImage=-1;
    $("#statusText").textContent="Draw mode — draw directly on the meme";
  } else if(tool==="text"){
    $("#statusText").textContent="Text tool selected";
  } else if(tool==="sticker"){
    $("#statusText").textContent="Sticker tool selected";
  }

  if(tool==="image"){
    $("#statusText").textContent="Choose an image to add";
    $("#canvasImageInput").click();
  }

  draw();
}

$$(".tool-btn").forEach(b=>{
  b.type="button";
  b.setAttribute("aria-pressed",b.classList.contains("active") ? "true" : "false");
  b.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();

    const tool=b.dataset.tool;

    // Bottom Text button is the shortcut for the existing
    // “＋ Add another text” action in the Text editor.
    if(tool==="text"){
      setTool("text");
      addText();
      return;
    }

    // Bottom Sticker button is the shortcut for the existing
    // “＋ Add custom sticker” action in Quick stickers.
    if(tool==="sticker"){
      setTool("sticker");
      $("#customStickerInput").click();
      return;
    }

    setTool(tool);
  });
});

$("#canvasImageInput").onchange=e=>{
  const file=e.target.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const ar=img.width/img.height;
      let w=.42,h=w/ar;
      if(h>.72){h=.72;w=h*ar}
      canvasImages.push({src:ev.target.result,image:img,x:.5,y:.5,w,h});
      selectedImage=canvasImages.length-1;
      selectedSticker=-1;
      selectedText=-1;
      activeTool="image";
      $$(".tool-btn").forEach(b=>b.classList.toggle("active",b.dataset.tool==="image"));
      saveState();
      draw();
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value="";
};

function deleteImage(index){
  if(index<0||index>=canvasImages.length)return;
  canvasImages.splice(index,1);
  selectedImage=canvasImages.length?Math.min(index,canvasImages.length-1):-1;
  saveState();
  draw();
}

/* ---------- Drawing + canvas interaction ---------- */
function beginDraw(e){
  if(activeTool!=="draw") return false;

  e.preventDefault();
  const p=canvasPoint(e);

  try{ canvas.setPointerCapture?.(e.pointerId); }catch(_){}

  drawingPath={
    points:[p],
    color:drawColor,
    width:Math.max(5,canvas.width/110),
    opacity:1
  };

  drawPaths.push(drawingPath);
  draw();
  return true;
}

function continueDraw(e){
  if(activeTool!=="draw" || !drawingPath) return false;

  e.preventDefault();
  const p=canvasPoint(e);
  const last=drawingPath.points[drawingPath.points.length-1];

  // Avoid filling the path with thousands of identical points.
  if(!last || Math.hypot(
    (p.x-last.x)*canvas.width,
    (p.y-last.y)*canvas.height
  ) >= 1){
    drawingPath.points.push(p);
    draw();
  }
  return true;
}

function endDraw(e){
  if(!drawingPath) return false;

  if(e) e.preventDefault();
  drawingPath=null;
  saveState();
  draw();

  try{
    if(e?.pointerId!=null) canvas.releasePointerCapture?.(e.pointerId);
  }catch(_){}

  return true;
}

canvas.addEventListener("pointerdown",e=>{
  if(beginDraw(e)) return;

  const p=canvasPoint(e);

  if(selectedImage>=0&&imageHandleHit(p.x,p.y,selectedImage,"delete")){
    deleteImage(selectedImage);return;
  }
  if(selectedImage>=0&&imageHandleHit(p.x,p.y,selectedImage,"resize")){
    const im=canvasImages[selectedImage];
    resizingImage={startX:p.x,startY:p.y,startW:im.w,startH:im.h};
    e.preventDefault();return;
  }

  const imIndex=hitTestImage(p.x,p.y);
  if(imIndex>=0){
    selectedImage=imIndex;selectedSticker=-1;selectedText=-1;
    const im=canvasImages[imIndex];
    dragging={type:"image",index:imIndex,offsetX:p.x-im.x,offsetY:p.y-im.y};
    draw();e.preventDefault();return;
  }

  if(selectedSticker>=0&&stickerDeleteHandleHit(p.x,p.y,selectedSticker)){
    deleteObject("sticker",selectedSticker);return;
  }
  if(selectedSticker>=0&&stickerResizeHandleHit(p.x,p.y,selectedSticker)){
    const st=stickers[selectedSticker];
    resizingSticker={startX:p.x,startY:p.y,startSize:st.size};
    e.preventDefault();return;
  }

  const sticker=hitTestSticker(p.x,p.y);
  if(sticker>=0){
    selectedSticker=sticker;selectedImage=-1;selectedText=-1;
    const st=stickers[sticker];
    dragging={type:"sticker",index:sticker,offsetX:p.x-st.x,offsetY:p.y};
    draw();e.preventDefault();return;
  }

  if(selectedText>=0&&textDeleteHandleHit(p.x,p.y,selectedText)){
    deleteObject("text",selectedText);return;
  }
  if(selectedText>=0&&textResizeHandleHit(p.x,p.y,selectedText)){
    const t=texts[selectedText];
    resizingText={startX:p.x,startY:p.y,startSize:t.size};
    e.preventDefault();return;
  }

  const found=hitTestText(p.x,p.y);
  if(found>=0){
    selectedText=found;selectedSticker=-1;selectedImage=-1;
    dragging={type:"text"};
    updateEditor();draw();e.preventDefault();return;
  }

  selectedSticker=-1;selectedImage=-1;selectedText=-1;draw();
});

canvas.addEventListener("pointermove",e=>{
  if(continueDraw(e)) return;

  const p=canvasPoint(e);

  if(resizingImage){
    const im=canvasImages[selectedImage];if(!im)return;
    const dx=p.x-resizingImage.startX,dy=p.y-resizingImage.startY;
    const delta=Math.abs(dx)>Math.abs(dy)?dx:dy;
    im.w=Math.max(.05,Math.min(1,resizingImage.startW+delta));
    im.h=Math.max(.05,Math.min(1,resizingImage.startH+
      delta/(resizingImage.startW||1)*resizingImage.startH));
    draw();e.preventDefault();return;
  }

  if(resizingText){
    const t=texts[selectedText];if(!t)return;
    const dx=(p.x-resizingText.startX)*canvas.width;
    const dy=(p.y-resizingText.startY)*canvas.height;
    const delta=Math.abs(dx)>Math.abs(dy)?dx:dy;
    t.size=Math.max(12,Math.min(300,resizingText.startSize+delta));
    draw();e.preventDefault();return;
  }

  if(resizingSticker){
    const st=stickers[selectedSticker];
    const dx=(p.x-resizingSticker.startX)*canvas.width;
    const dy=(p.y-resizingSticker.startY)*canvas.height;
    const delta=Math.abs(dx)>Math.abs(dy)?dx:dy;
    st.size=Math.max(24,Math.min(420,resizingSticker.startSize+delta));
    draw();e.preventDefault();return;
  }

  if(!dragging)return;

  if(dragging.type==="image"){
    const im=canvasImages[dragging.index];
    im.x=Math.max(im.w/2,Math.min(1-im.w/2,p.x-dragging.offsetX));
    im.y=Math.max(im.h/2,Math.min(1-im.h/2,p.y-dragging.offsetY));
  }else if(dragging.type==="sticker"){
    const st=stickers[dragging.index];
    st.x=Math.max(.04,Math.min(.96,p.x-dragging.offsetX));
    st.y=Math.max(.04,Math.min(.96,p.y-dragging.offsetY));
  }else{
    const t=texts[selectedText];
    if(t){
      t.x=Math.max(.05,Math.min(.95,p.x));
      t.y=Math.max(.04,Math.min(.96,p.y));
    }
  }

  draw();
});

canvas.addEventListener("pointerup",e=>{
  if(activeTool==="draw" && drawingPath){
    endDraw(e);
    return;
  }

  if(dragging||resizingText||resizingSticker||resizingImage){
    dragging=null;
    resizingText=null;
    resizingSticker=null;
    resizingImage=null;
    saveState();
    draw();
  }

  try{canvas.releasePointerCapture?.(e.pointerId)}catch(_){}
});

canvas.addEventListener("pointercancel",e=>{
  if(drawingPath){
    drawingPath=null;
    drawPaths.pop();
  }
  dragging=null;
  resizingText=null;
  resizingSticker=null;
  resizingImage=null;
  draw();
  try{canvas.releasePointerCapture?.(e.pointerId)}catch(_){}
});

canvas.addEventListener("dblclick",e=>{if(activeTool==="draw")return;const p=canvasPoint(e),found=hitTestText(p.x,p.y);if(found>=0)editTextOnCanvas(found)});
window.addEventListener("keydown",e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z")$("#undoBtn").click();
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y")$("#redoBtn").click();
 if((e.key==="Delete"||e.key==="Backspace")&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){
   if(selectedImage>=0)deleteImage(selectedImage);
   else if(selectedSticker>=0)deleteObject("sticker",selectedSticker);
 }
});

resizeCanvas();
