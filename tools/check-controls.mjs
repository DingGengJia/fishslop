import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
await page.goto('http://localhost:5173');await page.waitForFunction(()=>!!window.__fishslop);
await page.getByRole('button',{name:"Let's dive in"}).click();
const y=await page.evaluate(()=>window.__fishslop.snapshot().sub.y);
const up=await page.locator('[data-key="KeyE"]').boundingBox();
await page.mouse.move(up.x+up.width/2,up.y+up.height/2);await page.mouse.down();await page.waitForTimeout(1000);await page.mouse.up();
if(await page.evaluate(()=>window.__fishslop.snapshot().sub.y)<=y)throw new Error('Touch depth control failed');
await page.mouse.move(200,430);await page.mouse.down();await page.mouse.move(250,450,{steps:5});await page.mouse.up();
if(await page.evaluate(()=>window.__fishslop.snapshot().sub.yaw)===0)throw new Error('Drag steering failed');
await page.getByRole('button',{name:'Enable sound'}).click();
await page.getByRole('button',{name:'Mute sound'}).waitFor();
const z=await page.evaluate(()=>window.__fishslop.snapshot().sub.z);
await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
if(await page.evaluate(()=>window.__fishslop.snapshot().sub.z)>=z)throw new Error('Keyboard focus lost after sound toggle');
await page.screenshot({path:'artifacts/mobile-playing.png'});
await page.getByRole('button',{name:'Show controls'}).click();await page.keyboard.press('Escape');
if(await page.evaluate(()=>window.__fishslop.status().paused))throw new Error('Escape resume failed');
// Inject before app initialization, after the previous page's pagehide save.
await page.addInitScript(()=>localStorage.setItem('fishslop.aquarium.v1','{"version":1,"fish":null}'));
await page.reload();await page.waitForFunction(()=>!!window.__fishslop);
if(await page.evaluate(()=>window.__fishslop.snapshot().fish.length)!==5)throw new Error('Corrupt save recovery failed');
console.log('PASS: touch controls, drag steering, audio, keyboard focus, Escape resume, corrupt-save recovery');
}finally{await browser.close();}
