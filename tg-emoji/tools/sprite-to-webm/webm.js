/* Общая часть конвейера: VP9 + альфа → WebM.
 * Подключается и spriteом (encoder.html), и видео-веткой (video.html).
 *
 * Длительность задаём сами: 89 кадров × 33.333 мс = 2.967 с. Не 90 — при 90
 * конец последнего кадра приходится ровно на 3000.3 мс, и @Stickers отвечает
 * «This video is too long». Запас в 33 мс снимает вопрос.
 * Звуковой дорожки нет вообще: Telegram custom emoji звук не несут.        */
const te = new TextEncoder();
const cat = arrs => { let n=0; for(const a of arrs) n+=a.length; const o=new Uint8Array(n); let p=0; for(const a of arrs){o.set(a,p);p+=a.length;} return o; };
function vint(n){let len=1;for(;len<=8;len++) if(n<Math.pow(2,7*len)-1) break;const o=new Uint8Array(len);let v=n;for(let i=len-1;i>=0;i--){o[i]=v&255;v=Math.floor(v/256);}o[0]|=1<<(8-len);return o;}
const uB = n => { const a=[]; let v=n; do{a.unshift(v&255); v=Math.floor(v/256);}while(v>0); return new Uint8Array(a); };
const ebml = (id,p) => cat([new Uint8Array(id), vint(p.length), p]);
const uEl = (id,n) => ebml(id, uB(n));
const sEl = (id,s) => ebml(id, te.encode(s));
const fEl = (id,f) => { const b=new Uint8Array(8); new DataView(b.buffer).setFloat64(0,f); return ebml(id,b); };
const sB = v => { const a=[]; do{a.unshift(v&255); v>>=8;}while(a[0]&0x80 ? v!==-1 : v!==0); return new Uint8Array(a); };

function mux(chunks, alphaChunks, w, h, fps, durMs){
  const header = ebml([0x1A,0x45,0xDF,0xA3], cat([
    uEl([0x42,0x86],1),uEl([0x42,0xF7],1),uEl([0x42,0xF2],4),uEl([0x42,0xF3],8),
    sEl([0x42,0x82],'webm'),uEl([0x42,0x87],2),uEl([0x42,0x85],2)]));
  const info = ebml([0x15,0x49,0xA9,0x66], cat([
    uEl([0x2A,0xD7,0xB1],1000000), sEl([0x4D,0x80],'TTS tg-emoji'), sEl([0x57,0x41],'TTS tg-emoji'),
    fEl([0x44,0x89], durMs)]));
  const video = ebml([0xE0], cat([uEl([0xB0],w),uEl([0xBA],h),...(alphaChunks?[uEl([0x53,0xC0],1)]:[])]));
  const track = ebml([0xAE], cat([uEl([0xD7],1),uEl([0x73,0xC5],1),uEl([0x9C],0),uEl([0x83],1),
    sEl([0x86],'V_VP9'), uEl([0x23,0xE3,0x83], Math.round(1e9/fps)), video]));
  const tracks = ebml([0x16,0x54,0xAE,0x6B], track);
  const am = alphaChunks ? new Map(alphaChunks.map(a=>[a.t,a.d])) : null;
  const durTicks = Math.round(1000/fps);
  const blocks = chunks.map(c=>{
    const body = flags => { const p=new Uint8Array(4+c.d.length); p[0]=0x81;
      /* floor, а не round: округление вверх толкает последний кадр за лимит */
      new DataView(p.buffer).setInt16(1, Math.floor(c.t/1000)); p[3]=flags; p.set(c.d,4); return p; };
    if(!am) return ebml([0xA3], body(c.key?0x80:0));
    const a = am.get(c.t); if(!a) throw new Error('нет альфа-кадра на '+c.t);
    const parts=[ebml([0xA1],body(0)), uEl([0x9B],durTicks)];
    if(!c.key) parts.push(ebml([0xFB], sB(-durTicks)));
    parts.push(ebml([0x75,0xA1], ebml([0xA6], cat([uEl([0xEE],1), ebml([0xA5],a)]))));
    return ebml([0xA0], cat(parts));
  });
  const cluster = ebml([0x1F,0x43,0xB6,0x75], cat([uEl([0xE7],0), ...blocks]));
  return new Blob([header, ebml([0x18,0x53,0x80,0x67], cat([info,tracks,cluster]))],{type:'video/webm'});
}

/* Альфа кодируется вторым потоком VP9: цвет и маска идут раздельно,
   как это делает ffmpeg с yuva420p. */
const alphaCapable = (()=>{ try{const f=new VideoFrame(new Uint8Array(6),{format:'I420',codedWidth:2,codedHeight:2,timestamp:0});f.close();return true;}catch{return false;} })();

async function encodeFrames(getFrame, count, fps, bitrate, tile){
  const mk = (bits, sink) => { const e=new VideoEncoder({
      output:chunk=>{const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);
        sink.push({t:chunk.timestamp,d:b,key:chunk.type==='key'});},
      error:err=>{throw err;} });
    e.configure({codec:'vp09.00.10.08',width:tile,height:tile,bitrate:bits,framerate:fps,latencyMode:'quality'});
    return e; };
  const chunks=[], aChunks=[];
  const enc=mk(bitrate.c,chunks), aenc=alphaCapable?mk(bitrate.a,aChunks):null;
  const tmp=document.createElement('canvas'); tmp.width=tile; tmp.height=tile;
  const tg=tmp.getContext('2d',{willReadFrequently:true});
  const aY=new Uint8Array(tile*tile), aUV=new Uint8Array(tile*tile/2).fill(128);
  for(let i=0;i<count;i++){
    const src=await getFrame(i);
    const ts=Math.round(i*1e6/fps), dur=Math.round(1e6/fps);
    const vf=new VideoFrame(src,{timestamp:ts,duration:dur});
    enc.encode(vf,{keyFrame:i===0}); vf.close();
    if(aenc){
      tg.clearRect(0,0,tile,tile); tg.drawImage(src,0,0);
      const px=tg.getImageData(0,0,tile,tile).data;
      for(let p=0,q=3;p<aY.length;p++,q+=4) aY[p]=px[q];
      const buf=new Uint8Array(tile*tile*1.5); buf.set(aY,0); buf.set(aUV,tile*tile);
      const af=new VideoFrame(buf,{format:'I420',codedWidth:tile,codedHeight:tile,timestamp:ts,duration:dur});
      aenc.encode(af,{keyFrame:i===0}); af.close();
    }
  }
  await enc.flush(); enc.close();
  if(aenc){await aenc.flush(); aenc.close();}
  return {chunks, aChunks, withAlpha:!!aenc};
}
const blobToB64 = blob => new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(blob);});
