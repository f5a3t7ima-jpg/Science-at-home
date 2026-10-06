/* Keep the supplied recorded cast; prioritize short first-use buffers and avoid repeated guide speech. */
window.ScienceVoice={install(engine){
  const originalAlias=engine.alias.bind(engine);
  engine.preferences.Shaheen=['Ryan','Guy'];engine.preferences.Maha=['Libby','Jenny'];
  engine.profiles.Shaheen={rate:.92,pitch:1};engine.profiles.Maha={rate:.94,pitch:1};
  engine.alias=name=>/^Hessa$/i.test(name)?'Me':/^Shaheen$/i.test(name)?'Shaheen':/^Maha$/i.test(name)?'Maha':/^Fahem$/i.test(name)?'Saqr':originalAlias(name);
  const refresh=engine.refresh.bind(engine);
  engine.refresh=()=>{
    refresh();const voices=(engine.synth?.getVoices()||[]).filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
    const female=voices.find(v=>/female|sonia|libby|jenny|samantha|zira|serena/i.test(v.name))||voices[0];
    const male=voices.find(v=>/male|ryan|guy|daniel|david|george/i.test(v.name)&&!/female/i.test(v.name))||voices.at(-1);
    for(const key of Object.keys(engine.preferences))if(!engine.cast[key])engine.cast[key]=['Me','Mom','Grandma','Maha','Question'].includes(key)?female:male;
    engine.cast=Object.fromEntries(Object.entries(engine.cast).filter(([,v])=>v));
    // Natural speech at normal pitch is clearer than the former high-pitched girl fallback.
    if(engine.gprof?.Me)engine.gprof.Me={rate:.94,pitch:1.04};
  };
  engine.preload=()=>{
    if(engine.pre||!engine.ac())return;
    engine.pre=1;
    const phrases=[['Grandma','Come down, my dear!'],['Me','Coming, Grandma!'],['Grandma','Salam, my dear! Help me, please.'],['Me','Of course, Grandma!'],['Me','Here you are!']];
    let index=0;const next=()=>{if(index>=phrases.length)return;const [who,text]=phrases[index++],id=engine.recId(text,who);Promise.resolve(id==null?null:engine.decode(id)).catch(()=>{}).then(()=>{if(window.requestIdleCallback)requestIdleCallback(next,{timeout:1200});else setTimeout(next,150);});};next();
  };
  engine.refresh();engine.preload();
}};
