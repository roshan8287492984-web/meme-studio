const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$("#memeCanvas"), ctx=canvas.getContext("2d");
let image=null, bg="#ffffff", bgImage=null, ratio=1, texts=[], stickers=[], canvasImages=[], drawPaths=[], selectedText=0, selectedSticker=-1, selectedImage=-1, dragging=null, resizingSticker=null, resizingImage=null, resizingText=null, drawingPath=null, drawColor="#ff3b30", activeTool="text";
let history=[], future=[], selectedTemplate=-1;

let templates=[];
const TEMPLATE_API='https://api.imgflip.com/get_memes';
function categoryForTemplate(t,index){
 const n=String(t.name||'').toLowerCase();
 const reaction=/drake|distracted boyfriend|woman yelling|change my mind|gru|surprised|confused|disaster girl|success kid|one does not simply|doge|mocking spongebob|always has been|trade offer|reaction|crying|laughing|face|who would win|expanding brain/.test(n);
 const classic=/classic|most interesting man|philosoraptor|bad luck brian|scumbag steve|success kid|y u no|futurama fry|condescending wonka|boardroom|waiting skeleton|ancient aliens|oprah|fine|left exit 12 off ramp|this is fine|two buttons|expanding brain|one does not simply/.test(n);
 if(index < 12) return 'popular';
 if(reaction) return 'reaction';
 if(classic) return 'classic';
 return index % 2 ? 'classic' : 'reaction';
}

function templateSvg(t){
 const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const title=esc(t.title), sub=esc(t.subtitle);
 const common=`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient></defs><rect width="300" height="300" rx="14" fill="url(#g)"/>`;
 const label=(text,y,size=22,opacity=1)=>`<text x="150" y="${y}" text-anchor="middle" fill="white" opacity="${opacity}" font-family="Arial Black,Arial" font-size="${size}" font-weight="900">${text}</text>`;
 let art="";
 switch(t.style){
   case "choices": art=`<rect x="22" y="62" width="108" height="165" rx="14" fill="#ffffff" opacity=".18"/><rect x="170" y="62" width="108" height="165" rx="14" fill="#ffffff" opacity=".18"/><circle cx="76" cy="116" r="27" fill="#fff" opacity=".9"/><circle cx="224" cy="116" r="27" fill="#fff" opacity=".9"/>${label("A",174,34)}${label("B",174,34)}`; break;
   case "brain": art=`<ellipse cx="150" cy="130" rx="92" ry="68" fill="#fff" opacity=".16"/><path d="M75 132 C70 92 105 69 139 91 C157 62 202 83 195 115 C225 126 208 171 177 166 C157 196 112 187 108 159 C84 163 67 149 75 132Z" fill="#fff" opacity=".28"/>`; break;
   case "panels": art=`<rect x="16" y="48" width="126" height="98" rx="8" fill="#fff" opacity=".18"/><rect x="158" y="48" width="126" height="98" rx="8" fill="#fff" opacity=".12"/><rect x="16" y="158" width="126" height="98" rx="8" fill="#fff" opacity=".12"/><rect x="158" y="158" width="126" height="98" rx="8" fill="#fff" opacity=".2"/>`; break;
   case "success": art=`<circle cx="150" cy="137" r="76" fill="#fff" opacity=".16"/><path d="M112 140 l24 24 55-64" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`; break;
   case "confused": art=`<circle cx="150" cy="137" r="78" fill="#fff" opacity=".17"/><circle cx="120" cy="125" r="9" fill="#fff"/><circle cx="180" cy="125" r="9" fill="#fff"/><path d="M118 168 Q150 145 182 168" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`; break;
   case "twist": art=`<path d="M55 215 L150 62 L245 215 Z" fill="#fff" opacity=".15"/><path d="M104 170 L138 202 L199 115" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`; break;
   case "sign": art=`<rect x="42" y="88" width="216" height="108" rx="12" fill="#fff" opacity=".18"/><rect x="65" y="195" width="170" height="13" rx="6" fill="#fff" opacity=".3"/>`; break;
   case "buttons": art=`<circle cx="102" cy="144" r="55" fill="#fff" opacity=".16"/><circle cx="198" cy="144" r="55" fill="#fff" opacity=".16"/><path d="M82 124 L122 164 M122 124 L82 164 M178 124 L218 164 M218 124 L178 164" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`; break;
   case "face": art=`<circle cx="150" cy="140" r="78" fill="#fff" opacity=".17"/><circle cx="120" cy="128" r="9" fill="#fff"/><circle cx="180" cy="128" r="9" fill="#fff"/><path d="M110 166 Q150 198 190 166" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`; break;
   case "expectation": art=`<rect x="18" y="70" width="120" height="165" rx="10" fill="#fff" opacity=".18"/><rect x="162" y="70" width="120" height="165" rx="10" fill="#fff" opacity=".09"/><text x="78" y="154" text-anchor="middle" fill="#fff" font-size="17" font-weight="900">EXPECT</text><text x="222" y="154" text-anchor="middle" fill="#fff" font-size="17" font-weight="900">REALITY</text>`; break;
   case "blank": art=`<rect x="24" y="70" width="252" height="160" rx="14" fill="#fff" opacity=".12"/>`; break;
   default: art=`<circle cx="240" cy="65" r="45" fill="#fff" opacity=".10"/><circle cx="55" cy="250" r="70" fill="#fff" opacity=".07"/>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${common}${art}${label(title,42,18)}${sub?label(sub,274,11,.72):label("CLICK TO USE",274,10,.62)}</svg>`;
}

function svgToData(svg){return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)}

function renderTemplates(filter="all"){
 const q=$("#templateSearch").value.toLowerCase();
 const matching=templates.map((t,index)=>({t,index})).filter(({t})=>(filter==="all"||t.category===filter)&&t.name.toLowerCase().includes(q));
 // Keep the editor panel compact. The full library is available from the “See more” button below.
 // Search can reveal a few more results, but never turns the editor into a long scrolling gallery.
 const limit=q ? 10 : 8;
 const visible=matching.slice(0,limit);
 const more=matching.length>limit;
 $("#templateGrid").innerHTML=visible.map(({t,index})=>`
 <button type="button" class="template-card ${selectedTemplate===index?"active":""}" data-index="${index}" aria-label="Use ${t.name} template">
   <div class="template-thumb">
     <img loading="lazy" src="${t.url}" alt="${t.name} meme template">
     <span class="template-use">Use</span>
   </div>
   <div class="template-name"><span>${t.name}</span><small>${t.category === "reaction" ? "Reaction" : t.category === "classic" ? "Classic" : "Popular"}</small></div>
 </button>`).join("") || '<div class="template-empty">No templates found. Try another search.</div>';
 $$(".template-card").forEach(b=>b.onclick=()=>loadTemplate(+b.dataset.index));
}
async function loadTemplateFeed(){
 try{
   const res=await fetch(TEMPLATE_API+"?type=image",{cache:"no-store"});
   if(!res.ok) throw new Error("Template API returned "+res.status);
   const data=await res.json();
   if(!data.success) throw new Error(data.error_message||"Template API request failed");
   const raw=data.data?.memes||[];
   const seen=new Set();
   templates=raw.map((t,i)=>({...t,category:categoryForTemplate(t,i)})).filter(t=>{if(seen.has(t.id))return false;seen.add(t.id);return true;});
   renderTemplates();
 }catch(err){
   console.error("Template loading error:",err);
   $("#templateGrid").innerHTML='<div class="template-empty">Could not load meme templates right now. Please refresh and try again.</div>';
 }
}
function loadTemplate(i){
 const t=templates[i]; if(!t)return; selectedTemplate=i; const img=new Image();
 img.crossOrigin="anonymous";
 img.onload=()=>{image=img; $("#emptyCanvas").classList.add("hidden"); $("#statusText").textContent=t.name+" template selected"; texts=[{text:"TOP TEXT",x:.5,y:.12,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true},{text:"BOTTOM TEXT",x:.5,y:.88,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true}];selectedText=0;selectedSticker=-1;selectedImage=-1;drawPaths=[];canvasImages=[];ratio=(t.width&&t.height)?t.width/t.height:1;resizeCanvas();saveState();draw()};
 img.onerror=()=>{$("#statusText").textContent="Could not load this template";};
 img.src=t.url;
 $$(".template-card").forEach(x=>x.classList.remove("active"));
 const card=$(`.template-card[data-index="${i}"]`); if(card)card.classList.add("active");
}

function stateSnapshot(){
 const cleanStickers=stickers.map(({char,src,x,y,size,custom})=>({char,src,x,y,size,custom}));
 const cleanImages=canvasImages.map(({src,x,y,w,h})=>({src,x,y,w,h}));
 const bgImageState=bgImage?.src||null;
 const imageState=image?.src||null;
 return JSON.stringify({texts,stickers:cleanStickers,canvasImages:cleanImages,drawPaths,bg,bgImage:bgImageState,image:imageState,ratio,drawColor,selectedTemplate});
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
 bg=o.bg||"#ffffff"; ratio=o.ratio||1; drawColor=o.drawColor||"#ff3b30"; selectedTemplate=o.selectedTemplate??-1;
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

$("#templateSearch").oninput=()=>renderTemplates($(".tab.active").dataset.filter);
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderTemplates(b.dataset.filter)});
$("#uploadBtn").onclick=$("#heroUpload").onclick=$("#emptyUpload").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=e=>fileUpload(e.target.files[0]);
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
$("#resetBtn").onclick=()=>{image=null;bgImage=null;texts=[];stickers=[];selectedTemplate=-1;bg="#ffffff";updateBackgroundUI();selectedSticker=-1;$("#emptyCanvas").classList.remove("hidden");$("#statusText").textContent="Ready to create";$("#clearBgImageBtn").hidden=true;draw()};
$("#clearTemplate").onclick=()=>{selectedTemplate=-1;renderTemplates($(".tab.active").dataset.filter);$("#resetBtn").click()};
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
 if(e.key==="/"&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();$("#templateSearch").focus()}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z")$("#undoBtn").click();
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y")$("#redoBtn").click();
 if((e.key==="Delete"||e.key==="Backspace")&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){
   if(selectedImage>=0)deleteImage(selectedImage);
   else if(selectedSticker>=0)deleteObject("sticker",selectedSticker);
 }
});

async function loadRemoteTemplate(){
 const raw=localStorage.getItem("memeStudioRemoteTemplate");
 if(!raw)return;
 localStorage.removeItem("memeStudioRemoteTemplate");
 let t; try{t=JSON.parse(raw)}catch(_){return}
 if(!t?.url)return;
 const img=new Image();
 img.crossOrigin="anonymous";
 img.onload=()=>{image=img;bgImage=null;$("#emptyCanvas")?.classList.add("hidden");$("#statusText").textContent=t.name+(t.kind==="gif"?" GIF template selected":" template selected");texts=[{text:"TOP TEXT",x:.5,y:.12,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true},{text:"BOTTOM TEXT",x:.5,y:.88,size:64,color:"#fff",outline:8,font:"Impact",shadow:"soft",bold:false,uppercase:true}];selectedText=0;selectedSticker=-1;selectedImage=-1;drawPaths=[];canvasImages=[];ratio=t.width/t.height;resizeCanvas();saveState();draw();updateEditor?.(); if(t.kind==="gif") $("#statusText").textContent="GIF template loaded (canvas export uses the current frame)"};
 img.onerror=()=>{alert("This template could not be loaded. Please try another template or upload the image directly.")};
 img.src=t.url;
}
loadTemplateFeed();resizeCanvas();
loadRemoteTemplate();
const requestedTemplate=new URLSearchParams(location.search).get("template");
if(requestedTemplate!==null && Number.isInteger(Number(requestedTemplate))){
  setTimeout(()=>loadTemplate(Number(requestedTemplate)),0);
}
