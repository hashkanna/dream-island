import {NextRequest,NextResponse} from 'next/server';

const starts=new Map<string,number>();
let issued=0;
export async function POST(req:NextRequest){
 const host=req.headers.get('host')??'',origin=req.headers.get('origin');
 const allowed=new Set(['http://127.0.0.1:3003','http://localhost:3003',process.env.PUBLIC_APP_ORIGIN].filter(Boolean));
 if(!origin||!allowed.has(origin)||new URL(origin).host!==host)return NextResponse.json({error:'Please open Dream Island from its demo link.'},{status:403});
 const now=Date.now(),client=req.headers.get('cf-connecting-ip')??'local';
 for(const [id,time] of starts)if(now-time>120000)starts.delete(id);
 if(starts.has(client))return NextResponse.json({error:'Your last dream is still settling. Try another visit in a moment.'},{status:429,headers:{'Retry-After':'120'}});
 if(issued>=Number(process.env.MAX_DEMO_SESSIONS||40))return NextResponse.json({error:'The live demo has finished its visits for today. Thanks for exploring.'},{status:429});
 const key=process.env.REACTOR_API_KEY;if(!key)return NextResponse.json({error:'The world model is not configured.'},{status:503});
 starts.set(client,now);issued++;
 try{
  const r=await fetch('https://api.reactor.inc/tokens',{method:'POST',headers:{'Reactor-API-Key':key,'Content-Type':'application/json'},body:JSON.stringify({expires_after:60,authorization_details:[{type:'session',resources:{models:{match:['reactor/lingbot-world-2']}},constraints:{max_sessions:1,max_session_duration_seconds:120}}]}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`The dream service could not connect (${r.status}). Please try again shortly.`);
  const {jwt,expires_at}=await r.json();return NextResponse.json({jwt,expires_at},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){starts.delete(client);issued--;return NextResponse.json({error:e instanceof Error?e.message:'The dream service is taking a little longer. Try again.'},{status:502});}
}
