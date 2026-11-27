// Hold one detailed model so first-frame gameplay and the transition can be tested separately.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({channel:'chrome', headless:true});
let release;
const detailGate = new Promise(resolve => { release=resolve; });
try {
  const page = await browser.newPage({viewport:{width:960,height:640}});
  const errors = [];
  page.on('pageerror', error=>errors.push(error.message));
  await page.route('**/models/submarine-lite.glb', async route=>{
    await detailGate;
    await route.continue();
  });
  await page.goto(url,{waitUntil:'commit'});
  await page.locator('#dive-view').waitFor();
  await page.locator('#start').click();
  await page.selectOption('#player-form','5');
  await page.keyboard.down('w');
  await page.waitForFunction(()=>parseFloat(document.getElementById('speed-readout').textContent)>2);
  await page.keyboard.up('w');
  await page.keyboard.press('Space');
  await page.selectOption('#player-form','9');
  const saved = ()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fishslop.aquarium.v1')));
  const early = await saved();
  assert.equal(early.playerSpecies,9);
  assert.ok(early.food.length && early.sub.z<10);
  await page.locator('#pause').click();
  const paused = await saved();
  release();
  await page.waitForFunction(()=>performance.getEntriesByName('fishslop-full-detail').length,null,{timeout:60000});
  await page.locator('#modal[open]').waitFor();
  assert.equal(await page.locator('#dive-view').count(),0);
  await page.locator('#resume').click();
  await page.selectOption('#player-form','submarine');
  const after = await saved();
  assert.equal(after.playerSpecies,null);
  assert.ok(after.time>=paused.time && after.time-paused.time<1);
  assert.ok(after.sub.z<=paused.sub.z+.01 && Math.abs(after.sub.z-paused.sub.z)<1);
  assert.deepEqual(after.fish.map(f=>f.id),early.fish.map(f=>f.id));
  assert.deepEqual(errors,[]);
  console.log('PASS: early movement, forms, feeding, pause, and state continuity into full detail.');
} finally {
  release();
  await browser.close();
}
