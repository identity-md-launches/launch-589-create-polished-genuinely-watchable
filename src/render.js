const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('../.cache/node/node_modules/sharp');

const W = 1920, H = 1080, FPS = 30, DURATION = 40;
const root = path.resolve(__dirname, '..');
const ffmpeg = path.join(root, '.cache/ffmpeg-7.0.2-amd64-static/ffmpeg');
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const heroData = fs.readFileSync(path.join(root, '.cache/hero-small.png')).toString('base64');
const faceData = fs.readFileSync(path.join(root, '.cache/face-small.png')).toString('base64');
const fontData = fs.readFileSync(path.join(root, 'assets/SpaceGrotesk-Regular.ttf')).toString('base64');
const faceHref = `data:image/png;base64,${faceData}`;
const heroHref = `data:image/png;base64,${heroData}`;

const C = { bg:'#071a29', bg2:'#0b2739', panel:'#10354a', panel2:'#15445b', ink:'#eaf8f2', muted:'#9bb8be', mint:'#bdf4df', mint2:'#75d9bd', lilac:'#d5b9fa', coral:'#ff8e66', yellow:'#ffe49b', navy:'#071a29', line:'#2d6070' };
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function clamp(x,a=0,b=1){ return Math.max(a,Math.min(b,x)); }
function ease(x){ x=clamp(x); return x*x*(3-2*x); }
function lerp(a,b,t){return a+(b-a)*t;}
function fade(t,a,b){ return ease((t-a)/(b-a)); }
function op(t,a,b){ return clamp((t-a)/(b-a)); }
function fmt(n){return Math.round(n).toString();}

function txt(x,y,s,text,size,fill=C.ink,weight=500,anchor='start',family='Space Grotesk'){ return `<text x="${x}" y="${y}" font-family="Space Grotesk" font-size="${size}px" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle">${esc(text)}</text>`; }
function roundRect(x,y,w,h,r,fill,stroke='none',sw=0,extra=''){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1,y1,x2,y2,stroke,width=4,dash=''){ return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:''}/>`; }
function arrow(x1,y1,x2,y2,color,width=8,head=22,opacity=1){
  const ang=Math.atan2(y2-y1,x2-x1), a1=ang+Math.PI*0.82, a2=ang-Math.PI*0.82;
  return `<g opacity="${opacity}">${line(x1,y1,x2,y2,color,width)}<path d="M ${x2} ${y2} L ${x2+Math.cos(a1)*head} ${y2+Math.sin(a1)*head} L ${x2+Math.cos(a2)*head} ${y2+Math.sin(a2)*head} Z" fill="${color}"/></g>`;
}
function pill(x,y,w,h,label,fill,fg=C.navy,fs=22){ return `${roundRect(x,y,w,h,h/2,fill)}${txt(x+w/2,y+h/2+1,fs,label,fs,fg,700,'middle')}`; }
function unit(x,y,filled=true,color=C.mint,glow=false,small=false){ const s=small?34:48; return `<g opacity="${filled?1:.28}">${glow?`<circle cx="${x+s/2}" cy="${y+s/2}" r="${s*.7}" fill="${color}" opacity=".16"/>`:''}${roundRect(x,y,s,s,12,filled?color:C.line,filled?color:C.line,2)}${filled?txt(x+s/2,y+s/2+1,small?16:20,'1',small?16:20,C.navy,800,'middle'):''}</g>`; }
function bg(t){
  const shift = Math.sin(t*.45)*20;
  return `<rect width="${W}" height="${H}" fill="${C.bg}"/><circle cx="1600" cy="170" r="380" fill="#123b4e" opacity=".18"/><circle cx="340" cy="970" r="480" fill="#16364a" opacity=".16"/><path d="M0 870 C380 760 510 950 890 840 S1470 690 1920 800" fill="none" stroke="${C.mint}" stroke-width="2" opacity=".08"/><path d="M0 ${780+shift} C500 ${680+shift} 760 ${850+shift} 1250 ${710+shift} S1680 ${620+shift} 1920 ${690+shift}" fill="none" stroke="${C.lilac}" stroke-width="2" opacity=".07"/>`;
}
function brand(x=92,y=66,scale=1,showUrl=true){
  return `<g><image href="${faceHref}" x="${x}" y="${y-26*scale}" width="72" height="72" opacity=".96"/><circle cx="${x+36}" cy="${y+10}" r="39" fill="none" stroke="${C.mint}" stroke-width="2" opacity=".3"/>${txt(x+94*scale,y,24*scale,'PEPE2PEPE',24*scale,C.ink,800,'start','Space Grotesk')}${showUrl?txt(x+94*scale,y+30*scale,17*scale,'pepe2pepe.fun',17*scale,C.mint,500,'start','Space Grotesk'):''}</g>`;
}
function header(t,kicker,title,sub=''){
  let out=brand();
  if(kicker) out+=txt(96,208,20,kicker.toUpperCase(),20,C.mint2,700,'start','Space Grotesk');
  if(title) out+=txt(96,268,54,title,54,C.ink,800,'start','Barlow Condensed');
  if(sub) out+=txt(96,320,24,sub,24,C.muted,500);
  out+=line(96,355,1824,355,C.line,2);
  return out;
}
function marketCard(x,y,scale=1){
  const w=760*scale,h=310*scale;
  return `<g>${roundRect(x,y,w,h,28,C.panel,C.line,2)}${txt(x+34*scale,y+48*scale,18*scale,'FIXED-ODDS MARKET',18*scale,C.mint2,700)}${txt(x+34*scale,y+103*scale,34*scale,'Will this take the other side?',34*scale,C.ink,700,'start','Barlow Condensed')}${pill(x+34*scale,y+150*scale,210*scale,70*scale,'YES',C.mint,C.navy,34*scale)}${pill(x+270*scale,y+150*scale,210*scale,70*scale,'NO',C.lilac,C.navy,34*scale)}${txt(x+w-34*scale,y+185*scale,18*scale,'50 / 50',18*scale,C.muted,600,'end')}${txt(x+w-34*scale,y+238*scale,15*scale,'illustration · fees excluded',15*scale,C.muted,500,'end')}</g>`;
}
function sceneOpening(t){
  const p=fade(t,0,.9), bob=Math.sin(t*3)*5;
  let out=bg(t);
  out+=`<g opacity="${p}">${brand(92,76,1.05,false)}${txt(96,250,72,'Your take.',72,C.ink,800,'start','Barlow Condensed')}${txt(96,334,72,"Someone else’s other side.",72,C.mint,800,'start','Barlow Condensed')}${txt(98,400,24,'A clearer way to meet in the middle.',24,C.muted,500)}${marketCard(1010,230+bob,.86)}<image href="${heroHref}" x="1070" y="555" width="480" height="480" opacity=".98"/><path d="M 960 540 C 1060 540 1070 490 1130 456" fill="none" stroke="${C.mint}" stroke-width="4" opacity=".35"/>${pill(96,812,310,58,'pepe2pepe.fun',C.mint,C.navy,25)}</g>`;
  return out;
}
function sceneQueue(t){
  let out=bg(t)+header(t,'01 · BACK A SIDE','Back a side. Set the challenge.','Fixed odds. FIFO backing. Earlier backing is matched first.');
  const a=fade(t,4,5), b=fade(t,5.2,6), q=clamp((t-4.3)/2.3);
  out+=`<g opacity="${a}">${roundRect(96,430,1030,420,28,C.panel,C.line,2)}${txt(140,485,18,'MARKET QUEUE',18,C.mint2,800)}${txt(1060,485,18,'50/50 odds',18,C.muted,600,'end')}${line(150,565,1040,565,C.line,12)}${txt(140,620,21,'YES',21,C.mint,800)}${txt(1038,620,20,'backing order',20,C.muted,500,'end')}`;
  const slots=[0,1,2,3,4,5,6,7,8,9];
  slots.forEach((i)=>{ const x=150+i*82; const first=i<6, second=i>=6; const active=first || (second&&b>.1); const fill=first?C.mint:C.lilac; out+=unit(x,672,active,fill,false,false); });
  out+=txt(150,766,18,'BACKER 01',18,C.mint,700)+txt(640,766,30,'6',30,C.ink,800,'end','Barlow Condensed')+txt(660,766,18,'units',18,C.muted,500); 
  out+=txt(710,766,18,'BACKER 02',18,C.lilac,700)+txt(1037,766,30,'4',30,C.ink,800,'end','Barlow Condensed')+txt(1058,766,18,'units',18,C.muted,500);
  out+=`</g>`;
  out+=`<g opacity="${b}">${arrow(1275,680,1155,680,C.lilac,7,22)}${pill(1250,590,330,62,'later backing → 4',C.lilac,C.navy,23)}${txt(1250,790,22,'The queue remembers.',22,C.ink,700)}${txt(1250,828,19,'6 first · 4 later',19,C.muted,500)}</g>`;
  out+=`<g opacity="${fade(t,6.3,7.1)}">${pill(96,920,440,52,'Illustration · 50/50 odds · fees excluded',C.panel2,C.mint,17)}${txt(600,946,18,'Illustrative stake units — not volume.',18,C.muted,500)}</g>`;
  return out;
}
function sceneMatch(t){
  let out=bg(t)+header(t,'02 · MATCHING','The other side makes the match.','Opposing stake flows in. Earlier backing fills first.');
  const p=fade(t,10,11), match=clamp((t-11.3)/4.2), second=clamp((match*8-6)/2), glow=clamp((t-14.3)/1.2);
  out+=`<g opacity="${p}">${roundRect(120,430,700,410,26,C.panel,C.line,2)}${roundRect(1100,430,700,410,26,C.panel,C.line,2)}${txt(160,485,18,'YES · QUEUE',18,C.mint2,800)}${txt(1140,485,18,'NO · OPPOSING SIDE',18,C.lilac,800)}${txt(160,545,28,'backed',28,C.ink,700)}${txt(1140,545,28,'arrives',28,C.ink,700)}`;
  for(let i=0;i<10;i++){ let f=i<6?true:(i<10&&second>=(i-5)/4); out+=unit(160+i*58,610,f,C.mint,i<8&&match>.6,true); }
  for(let i=0;i<8;i++){ let f=match>=((i+1)/8); out+=unit(1140+i*70,610,f,C.lilac,i<8&&match>.6,true); }
  const splitX=940; out+=arrow(825,660,1080,660,C.lilac,9,25,op(t,11,12));
  out+=txt(160,770,20,'6 first',20,C.mint,700)+txt(350,770,20,'4 later',20,C.lilac,700)+txt(1140,770,20,'8 opposing',20,C.lilac,700);
  out+=pill(160,890,455,62,'8 YES matched with 8 NO',C.mint,C.navy,23)+pill(665,890,365,62,'2 later units unfilled',C.panel2,C.lilac,21);
  out+=`<g opacity="${fade(t,15.3,16.2)}">${txt(1190,905,20,'FIFO',20,C.mint,800)}${txt(1190,940,18,'The first 6 match first.',18,C.muted,500)}</g></g>`;
  return out;
}
function scenePayout(t){
  let out=bg(t)+header(t,'03 · RESOLUTION','Matched stakes fund the payout.','The matched pool is locked in before the result.');
  const p=fade(t,18,19), win=fade(t,20,22), pulse=.5+.5*Math.sin(t*4);
  out+=`<g opacity="${p}">${roundRect(110,430,760,410,28,C.panel,C.line,2)}${roundRect(1050,430,760,410,28,C.panel,C.line,2)}${txt(150,490,18,'MATCHED POOL',18,C.mint2,800)}${txt(1090,490,18,'IF YES WINS · ILLUSTRATION',18,C.mint,800)}${txt(150,565,32,'8 YES',32,C.mint,800,'start','Barlow Condensed')}${txt(520,565,28,'+ 8 NO',28,C.lilac,800,'start','Barlow Condensed')}${txt(150,625,21,'16 funded units total',21,C.muted,500)}${line(150,700,830,700,C.line,18)}${line(150,700,490,700,C.mint,18)}${line(490,700,830,700,C.lilac,18)}${txt(150,772,18,'YES matched',18,C.mint,700)}${txt(830,772,18,'NO matched',18,C.lilac,700,'end')}${arrow(900,630,1030,630,C.mint,8,24,op(t,19,20))}${txt(1110,565,24,'winning YES positions',24,C.ink,700)}${roundRect(1090,620,310,88,22,C.mint,C.mint)}${txt(1245,665,34,'6 → 12 gross',34,C.navy,800,'middle','Barlow Condensed')}${roundRect(1090,735,310,78,22,C.mint,C.mint)}${txt(1245,774,29,'2 → 4 gross',29,C.navy,800,'middle','Barlow Condensed')}${txt(1435,665,19,'first backer',19,C.muted,500)}${txt(1435,774,19,'later backer',19,C.muted,500)}${txt(1090,875,18,'Matched YES wins receive the combined matched stakes.',18,C.muted,500)}</g>`;
  out+=`<g opacity="${win}">${pill(110,910,560,58,'Outcome shown for this illustration only',C.panel2,C.mint,20)}${txt(720,941,18,'Payout waits for oracle resolution + claim.',18,C.muted,500)}</g>`;
  return out;
}
function sceneRefund(t){
  let out=bg(t)+header(t,'04 · CLOSE & CLAIM','Not fully matched? Reclaim what’s unused.','A partial match is okay. Only matched backing participates.');
  const p=fade(t,25,26), travel=clamp((t-27)/2.4), y=650-140*ease(travel), x=1420-820*ease(travel);
  out+=`<g opacity="${p}">${roundRect(120,450,650,380,28,C.panel,C.line,2)}${txt(160,505,18,'YOUR YES BACKING',18,C.mint2,800)}${txt(160,565,30,'6 matched',30,C.mint,800,'start','Barlow Condensed')}${txt(160,610,30,'2 unused',30,C.coral,800,'start','Barlow Condensed')}`;
  for(let i=0;i<6;i++) out+=unit(160+i*66,680,true,C.mint,false,true);
  for(let i=0;i<2;i++) out+=unit(560+i*66,680,true,C.coral,true,true);
  out+=txt(160,775,18,'matched portion waits for result',18,C.muted,500)+txt(560,775,18,'unused portion',18,C.coral,700);
  out+=roundRect(1120,500,620,220,28,C.panel,C.line,2)+txt(1160,555,20,'AFTER BETTING CLOSES',20,C.mint2,800)+txt(1160,625,28,'claim unused 2',28,C.coral,800,'start','Barlow Condensed')+txt(1160,670,18,'fees may apply',18,C.muted,500);
  out+=arrow(1430,730,x,y,C.coral,10,28,1)+`</g>`;
  out+=`<g opacity="${fade(t,29.5,30.4)}">${pill(120,900,350,60,'Claim after close.',C.coral,C.navy,23)}${txt(500,932,19,'Fees apply.',19,C.muted,700)}${txt(1120,900,19,'Unused backing does not wait for the oracle outcome.',19,C.muted,500)}</g>`;
  return out;
}
function sceneSnapshot(t){
  let out=bg(t)+brand(92,76,1.05,false); const p=fade(t,31,32), q=clamp((t-32)/2), r=clamp((t-33)/2);
  out+=`<g opacity="${p}">${txt(96,260,60,'A small launch. A clear signal.',60,C.ink,800,'start','Barlow Condensed')}${txt(100,320,22,'Built for people who want to take the other side.',22,C.muted,500)}${roundRect(110,455,720,300,30,C.panel,C.line,2)}${roundRect(930,455,720,300,30,C.panel,C.line,2)}${txt(160,520,20,'MARKETS CREATED',20,C.mint2,800)}${txt(160,655,136,fmt(13*q),136,C.mint,800,'start','Barlow Condensed')}${txt(160,712,20,'owner-reported launch statistic',20,C.muted,500)}${txt(980,520,20,'ACTIVE USERS',20,C.lilac,800)}${txt(980,655,136,fmt(789*r),136,C.lilac,800,'start','Barlow Condensed')}${txt(980,712,20,'Google Analytics snapshot',20,C.muted,500)}${txt(110,858,18,'No major hiccups reported in our first four days.',18,C.muted,500)}${txt(110,900,16,'Founder-reported launch update · not an audit or security claim.',16,C.muted,500)}</g>`;
  return out;
}
function sceneEnd(t){
  const p=fade(t,37,38); let out=bg(t)+`<g opacity="${p}"><image href="${heroHref}" x="680" y="110" width="560" height="560"/><circle cx="960" cy="385" r="345" fill="none" stroke="${C.mint}" stroke-width="3" opacity=".25" stroke-dasharray="18 22"/>${txt(960,755,76,'Take the other side.',76,C.ink,800,'middle','Barlow Condensed')}${txt(960,842,33,'pepe2pepe.fun',33,C.mint,700,'middle')}${txt(960,910,18,'Powered by the IMD Oracle',18,C.muted,500,'middle')}</g>`;
  return out;
}
function svg(t,small=false){
  let content = t<4 ? sceneOpening(t) : t<10 ? sceneQueue(t) : t<18 ? sceneMatch(t) : t<25 ? scenePayout(t) : t<31 ? sceneRefund(t) : t<37 ? sceneSnapshot(t) : sceneEnd(t);
  const vignette = `<defs><radialGradient id="v"><stop offset="0" stop-color="#0d3042" stop-opacity="0"/><stop offset="1" stop-color="#03101b" stop-opacity=".52"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#v)" pointer-events="none"/>`;
  const css=`<style>@font-face{font-family:'Space Grotesk';src:url(data:font/ttf;base64,${fontData}) format('truetype');font-weight:100 900;}text{font-family:'Space Grotesk';}</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${small?960:W}" height="${small?540:H}" viewBox="0 0 ${W} ${H}">${css}${content}${vignette}</svg>`;
}

function writeWav(){
  const rate=44100, seconds=DURATION, n=rate*seconds, ch=2, data=Buffer.alloc(n*ch*2);
  const chords=[[0,164.81,196,246.94],[8,146.83,174.61,220],[16,130.81,164.81,196],[24,164.81,196,246.94],[32,146.83,196,246.94]];
  function pulse(t,f,start,dur,amp){const u=t-start; if(u<0||u>dur)return 0; const env=Math.min(1,u/.22,(dur-u)/.35); return Math.sin(2*Math.PI*f*u)*env*amp;}
  for(let i=0;i<n;i++){ const t=i/rate; let s=0;
    for(const [st,a,b,c] of chords){const u=t-st; if(u>=0&&u<8){const env=Math.min(1,u/.7,(8-u)/1.2); s+=env*(Math.sin(2*Math.PI*a*u)*.028+Math.sin(2*Math.PI*b*u)*.022+Math.sin(2*Math.PI*c*u)*.016);}}
    for(const st of [4.2,5.2,6.2,11.8,12.5,13.2,14.0,27.2,28.0,29.0,32.0,33.0,34.0]) s+=pulse(t,660,st,.12,.075)+pulse(t,990,st+.03,.08,.025);
    s += Math.sin(2*Math.PI*55*t)*.008;
    s=Math.max(-.45,Math.min(.45,s)); const v=Math.round(s*32767); data.writeInt16LE(v,i*4); data.writeInt16LE(v,i*4+2);
  }
  const head=Buffer.alloc(44); head.write('RIFF',0); head.writeUInt32LE(36+data.length,4); head.write('WAVE',8); head.write('fmt ',12); head.writeUInt32LE(16,16); head.writeUInt16LE(1,20); head.writeUInt16LE(ch,22); head.writeUInt32LE(rate,24); head.writeUInt32LE(rate*ch*2,28); head.writeUInt16LE(ch*2,32); head.writeUInt16LE(16,34); head.write('data',36); head.writeUInt32LE(data.length,40);
  fs.writeFileSync(path.join(artifacts,'music.wav'),Buffer.concat([head,data]));
}

async function main(){
  writeWav();
  const proc=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','png','-framerate',String(FPS),'-i','-','-i','artifacts/music.wav','-t',String(DURATION),'-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','44100','-ac','2','-movflags','+faststart','artifacts/video.mp4'],{cwd:root,stdio:['pipe','ignore','pipe']});
  proc.stderr.on('data',d=>{ if(String(d).includes('Error')) process.stderr.write(d); });
  for(let i=0;i<Math.round(DURATION*FPS);i++){
    const t=i/FPS;
    const png=await sharp(Buffer.from(svg(t,true))).png().toBuffer();
    if(i===Math.round(39.0*FPS)) fs.writeFileSync(path.join(artifacts,'hero.png'),await sharp(Buffer.from(svg(t,false))).png().toBuffer());
    if(!proc.stdin.write(png)) await new Promise(res=>proc.stdin.once('drain',res));
    if(i%120===0) console.log(`frame ${i}/${DURATION*FPS}`);
  }
  proc.stdin.end();
  await new Promise((res,rej)=>{proc.on('close',code=>code===0?res():rej(new Error('ffmpeg exit '+code)));});
  fs.unlinkSync(path.join(artifacts,'music.wav'));
}
main().catch(e=>{console.error(e);process.exit(1);});
