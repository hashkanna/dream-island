export const ISLANDS = [
 {name:'Home',x:0,y:0,z:4,r:2.15,color:'#89d4b0',bottom:'#abd8ca'},
 {name:'Peach Patch',x:-4.8,y:.3,z:1.8,r:1.7,color:'#f4b7a3',bottom:'#e4c3ba'},
 {name:'Mint Meadow',x:4.6,y:.5,z:1.4,r:1.7,color:'#aad9a3',bottom:'#b1cfc1'},
 {name:'Daisy Daydream',x:-6.8,y:1,z:-3,r:1.8,color:'#f2df96',bottom:'#d9d1b3',friend:0},
 {name:'Blueberry Bend',x:0,y:1.1,z:-2,r:1.9,color:'#a2d4e3',bottom:'#b6c8e0'},
 {name:'Strawberry Snooze',x:6.6,y:1.4,z:-3.2,r:1.8,color:'#f5b4c7',bottom:'#dcc1d8',friend:1},
 {name:'Moonmallow',x:-3.4,y:1.9,z:-7.3,r:1.65,color:'#c6bce9',bottom:'#bdbfdf'},
 {name:'Lavender Lounge',x:3.4,y:2.2,z:-7.5,r:1.8,color:'#d1baec',bottom:'#c9c4e3',friend:2},
 {name:'Star Sprinkle',x:0,y:3,z:-12,r:1.65,color:'#f5d186',bottom:'#e1cbae'}
] as const;
export const FRIENDS=[{name:'Peep',color:'#ffe5a0'},{name:'Pip',color:'#ffb6c9'},{name:'Momo',color:'#cdb9ef'}];
export const neighbours=(id:number)=>ISLANDS.map((p,i)=>({i,d:Math.hypot(p.x-ISLANDS[id].x,p.z-ISLANDS[id].z)})).filter(p=>p.i!==id&&p.d<7.25).map(p=>p.i);
export type GameSnapshot={phase:'menu'|'playing'|'won'|'over'|'paused';island:number;stars:number;combo:number;friends:number[];time:number;best:number;selected:number;storm:number;hopping:boolean;message:string;visited:number[]};
export const INITIAL:GameSnapshot={phase:'menu',island:0,stars:0,combo:0,friends:[],time:90,best:0,selected:1,storm:-1,hopping:false,message:'',visited:[0]};
