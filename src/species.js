// Meters in the aquarium; lengths are representative adults, not species maxima.
export const MAX_RESIDENTS=96;
export const SPECIES=Object.freeze([
  {id:0,name:'金鱼',english:'Goldfish',length:.24,speed:.55,kind:'fish',cost:50},
  {id:1,name:'蓝色礁鱼',english:'Azure reef fish',length:.28,speed:.65,kind:'fish',cost:50},
  {id:2,name:'紫色礁鱼',english:'Orchid reef fish',length:.22,speed:.60,kind:'fish',cost:50},
  {id:3,name:'小丑鱼',english:'Clownfish',length:.11,speed:.38,kind:'fish',cost:45},
  {id:4,name:'黑鳍礁鲨',english:'Blacktip reef shark',length:1.6,speed:1.25,kind:'shark',cost:180},
  {id:5,name:'宽吻海豚',english:'Bottlenose dolphin',length:2.6,speed:1.6,kind:'dolphin',cost:220},
  {id:6,measure:'伞径',axis:'x',name:'海月水母',english:'Moon jelly',length:.35,speed:.18,kind:'jelly',cost:65},
  {id:7,name:'座头鲸',english:'Humpback whale',length:12,speed:.85,kind:'whale',cost:550,limit:2,cadence:.18},
  {id:8,name:'巨型蝠鲼',english:'Giant manta ray',length:4,measure:'翼展',axis:'x',speed:.75,kind:'ray',cost:260,limit:4,cadence:.25},
  {id:9,name:'绿海龟',english:'Green sea turtle',length:1,measure:'背甲长',axis:'shell',speed:.40,kind:'turtle',cost:140,cadence:.30},
  {id:10,name:'太平洋沙丁鱼',english:'Pacific sardine',length:.18,speed:.65,kind:'school',cost:25,cadence:1.35},
  {id:11,name:'霓虹虾虎鱼',english:'Neon goby',length:.05,speed:.22,kind:'fish',cost:20,cadence:1.6},
  {id:12,name:'黄高鳍刺尾鱼',english:'Yellow tang',length:.20,speed:.8,kind:'school',cost:55,cadence:1.1},
  {id:13,name:'蓝倒吊',english:'Palette surgeonfish',length:.25,speed:.9,kind:'school',cost:65,cadence:1.05},
  {id:14,name:'长鳍蝴蝶鱼',english:'Pennant butterflyfish',length:.20,speed:.65,kind:'school',cost:60,cadence:.95},
  {id:15,name:'海金鱼',english:'Lyretail anthias',length:.15,speed:.8,kind:'school',cost:35,cadence:1.4},
]);
export const speciesOf=type=>SPECIES[type]||SPECIES[0];
export const validSpecies=type=>Number.isInteger(type)&&type>=0&&type<SPECIES.length;
export const adultScale=growth=>.82+.09*growth;

export const sizeLabel=sp=>`${sp.measure||"体长"}约 ${sp.length<1?Math.round(sp.length*100)+" cm":sp.length+" m"}`;
