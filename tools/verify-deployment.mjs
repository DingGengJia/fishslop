import {chromium} from '@playwright/test';
const url=process.argv[2]||'https://dinggengjia.github.io/fishslop/';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],assets=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(url)){assets.push({url:r.url(),status:r.status()});if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);}});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#loading').waitFor({state:'detached',timeout:60000});
 await page.getByRole('button',{name:"Let's dive in"}).click();
 await page.locator('body.playing').waitFor({state:'attached'});
 await page.getByRole('button',{name:'Open aquarium shop'}).click();
await page.locator('[data-buy="fish:3"]').click();
 if(await page.locator('#population').textContent()!=='30')throw new Error('Purchase did not update population');
 await page.getByRole('button',{name:'Pause game',exact:true}).click();
 await page.locator('dialog[open]').waitFor();
 await page.getByRole('button',{name:'Back to the reef'}).click();
 await page.screenshot({path:'artifacts/deployed-vps.png'});
 await page.reload();await page.locator('#loading').waitFor({state:'detached',timeout:60000});
 if(await page.locator('#population').textContent()!=='30')throw new Error('Progress did not persist');
 for(const name of ['submarine-lite.glb','goldfish-lite.glb','azure-lite.glb','orchid-lite.glb'])if(!assets.some(a=>a.url.endsWith(name)&&a.status===200))throw new Error(`Missing model: ${name}`);
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify({url,result:'PASS',checks:['WebGL scene loaded','all four runtime GLB models loaded','start','purchase','pause/resume','save and reload'],assets},null,2));
}finally{await browser.close();}
