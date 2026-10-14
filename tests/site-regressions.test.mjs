import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const slugs=['southern-michigan','central-michigan','northern-lower','eastern-up','western-up'];
const pages=['index.html','when-morels-come-up.html','false-morels.html','where-morels-grow.html','indicator-plants.html',...slugs.map(s=>s+'.html')];
const script=readFileSync('public/morel.js','utf8');
for(const f of pages)test(f+' 2027 metadata and canonical',()=>{
 const h=readFileSync('public/'+f,'utf8'),t=h.match(/<title>([^<]+)<\/title>/)?.[1],d=h.match(/<meta name="description" content="([^"]+)"/)?.[1];
 assert.match(t,/2027/);assert.match(d,/2027/);
 assert.ok(h.includes('href="https://morel.chrisizworski.com/'+(f==='index.html'?'':f)+'"'));
});
for(const slug of slugs)test(slug+' four sibling links',()=>{
 const h=readFileSync('public/'+slug+'.html','utf8');
 const block=h.split('<h2>Where the rest of the state is</h2>')[1]?.split('<h2>Related</h2>')[0];assert.ok(block);
 for(const other of slugs.filter(s=>s!==slug))assert.ok(block.includes('href="/'+other+'.html"'),other);
 assert.equal((block.match(/class="tile"/g)||[]).length,4);
});
test('false-morels title H1 JSONLD agree, no repeated self-link',()=>{
 const h=readFileSync('public/false-morels.html','utf8'), t=h.match(/<title>([^<]+)<\/title>/)[1],h1=h.match(/<h1[^>]*>([^<]+)<\/h1>/)[1],ld=JSON.parse(h.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
 assert.equal(t,h1);assert.equal(t,ld['@graph'][0].headline);
 assert.ok(!h.includes('>What false morels look like</a>'));assert.ok(h.includes('gyromitrin'));
});
async function render(path,payload,date='2026-10-14T19:16:00Z'){
 const e=Object.fromEntries(['wave','the-read','season-stage','s-season','s-season-sub','s-prime','s-front','s-normal','read-stamp','wave-stamp'].map(id=>[id,{textContent:'Loading',innerHTML:''}]));
 if(path==='/false-morels.html'){delete e.wave;delete e['the-read'];}
 const document={readyState:'complete',getElementById(id){return e[id]||null;},createElement(){return {};},body:{appendChild(){}}};
 class FixedDate extends Date{constructor(...a){super(...(a.length?a:[date]));}}
 vm.runInNewContext(script,{document,window:{location:{pathname:path}},Date:FixedDate,Intl,fetch:async()=>({ok:payload!==null,json:async()=>payload})});
 await new Promise(resolve=>setImmediate(resolve));return e;
}
const partial={generatedAt:'2026-10-14T19:16:00Z',model:'modelled from air temperature',regions:slugs.map((slug,i)=>({slug,name:slug,towns:'Michigan',trailing7dayF:53,gddBase50:30,normal:null,stage:i===2?{key:'offseason',label:'Off season',why:'spring only'}:null}))};
for(const f of pages)test(f+' has off-season header and all row badges',async()=>{
 const e=await render(f==='index.html'?'/':'/'+f,partial);
 assert.equal(e['season-stage'].textContent,'Off season');
 if(e.wave)assert.equal((e.wave.innerHTML.match(/class="badge offseason"/g)||[]).length,5);
});
test('offseason feed outage still shows five badges, no invented data',async()=>{
 const e=await render('/',null);assert.equal(e['season-stage'].textContent,'Off season');
 assert.equal((e.wave.innerHTML.match(/class="badge offseason"/g)||[]).length,5);assert.match(e['read-stamp'].textContent,/no current station feed/);
});
test('spring missing stage shows No data',async()=>{
 const e=await render('/where-morels-grow.html',partial,'2027-05-10T19:16:00Z');
 assert.equal((e.wave.innerHTML.match(/No data/g)||[]).length,4);
});
test('data assembly is labelled ET',async()=>{
 const e=await render('/',partial);assert.match(e['read-stamp'].textContent,/assembled Oct 14, 3:16 PM ET/);
});
