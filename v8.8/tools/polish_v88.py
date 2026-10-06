"""Rebuild V8.7 from the approved source, then apply the user's V8.8 touches."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parents[1]
subprocess.run(['python',str(ROOT/'tools/build.py')],check=True)
p=ROOT/'assets/game.js';game=p.read_text();changes=[]
def replace(old,new,expected=1):
 global game
 assert game.count(old)==expected,(old[:100],game.count(old),expected)
 game=game.replace(old,new);changes.append({'before':old,'after':new,'occurrences':expected})
# Install UI and voice adapters before displaying the cover.
replace('window.ScienceGame=Xt,window.ScienceUI.init(Xt)','window.ScienceGame=Xt,Xt.voiceEngine=Fe,Xt.startSharing=startSharingScene,window.ScienceUI.init(Xt)')
replace('i("#overlay").innerHTML=y,D=!1','i("#overlay").innerHTML=y,window.ScienceUI?.enhance(),D=!1')
# Prepare the imported skin shaders while the loading screen is still visible.
replace('ze(),x?.warm();await window.CharacterModelsReady;', 'ze();await window.CharacterModelsReady;')
replace('if(modelStatus?.failed.length)C(', 'x?.warm();Fe.preload();if(modelStatus?.failed.length)C(')
replace('e==="low"?1.25:2','e==="high"?2:1.25')
# Run the marshmallow choreography after all actors have updated their poses.
replace('this.ambient(n),this.director.update(n)', 'this.ambient(n),window.CharacterModels?.updateSharing(this,n),this.director.update(n)')
# Hessa replies in a shared third-person shot, never from inside the experiment glass.
replace('x?.talk(y),Le(`<section class="speech-anchor', 'x?.talk(y),x&&window.CharacterModels?.dialogueCamera(x,y),Le(`<section class="speech-anchor')
# Spoken lines finish before the automatic advance. No eight-second hard interruption.
replace('return Y>=4&&!(L?.busy&&Y<8)?!0:Fe.lastFailure||u.muted?Y>=Math.min(E,4):Y>=.7&&!L?.busy', 'return L?.busy?!1:Fe.lastFailure||u.muted?Y>=Math.min(E,4):Y>=.9')
replace('new C({sampleRate:24e3})','new C({sampleRate:24e3,latencyHint:"interactive"})')
replace('this.src=S,S.start(),clearTimeout(this.timer),this.timer=setTimeout(fin,B.duration*1e3+1500)', 'this.src=S,S.playbackRate.value=s==="Me"?.96:1,S.start(),clearTimeout(this.timer),this.timer=setTimeout(fin,B.duration/S.playbackRate.value*1e3+1500)')
# Keep the approved sharing point in the lesson, now staged with the father in the yard.
old='if(y.type==="share"){x?.setPose("hold"),tt("Grandpa","Please share with Hamad.",\'<button data-action="share-reply" class="primary">Here you are!</button>\');return}'
new='if(y.type==="share"){window.CharacterModels?.setupSharing(x);Le(\'<div></div>\');window.ScienceUI.sharingPanel("Dad","Please share with Hamad.");i("#sharing-dialogue").insertAdjacentHTML("beforeend",\'<button data-action="share-reply" class="primary">Share with Hamad</button>\');Oe("Please share with Hamad.",null,!0,"Dad");return}if(y.type==="sharing"){startSharingScene();return}'
replace(old,new)
replace('else if(P==="share-reply")f[c.step]={type:"reply-shown",text:"Here you are!"},$t();', 'else if(P==="share-reply")startSharingScene();')
replace('["reply","reply-shown","share"].includes(P.type)','["reply","reply-shown"].includes(P.type)')
replace('else if(P.type==="notice"&&Ye(Y,2))', 'else if(P.type==="share"&&Y>=6&&!L?.busy)startSharingScene();else if(P.type==="notice"&&Ye(Y,2))')
replace('P?.type!=="notebook"&&!L?.busy&&!d','!["notebook","share","sharing"].includes(P?.type)&&!L?.busy&&!d')
replace('c.elapsed>=Z()&&c.challengeStarted===null&&!L?.busy&&!d','c.elapsed>=Z()&&c.challengeStarted===null&&!["share","sharing"].includes(c.activeType)&&!L?.busy&&!d')
sharing='''function startSharingScene(){
if(c.activeType==="sharing"&&x?.sharing?.playing)return;
Ue();d=null;c.activeType="sharing";f[c.step]={type:"sharing"};c.sequence=f;
Le('<div></div>');window.ScienceUI.sharingPanel("Mom","Take a marshmallow to Hamad.");
const scene=c.scene,step=c.step,done=()=>{if(c.scene!==scene||c.step!==step||c.activeType!=="sharing")return;window.CharacterModels?.cancelSharing(x);c.respect.push("Here you are!");ge("shared_marshmallow",{with:"Hamad"});re();};
const callbacks={say:(speaker,text)=>{window.ScienceUI.sharingPanel(speaker,text);Oe(text,null,!0,speaker)},done};
if(!window.CharacterModels?.startSharing(x,callbacks)){
 let elapsed=0,last=performance.now(),offered=false,thanked=false;
 const frame=now=>{if(c.scene!==scene||c.step!==step||c.activeType!=="sharing")return;if(!c.paused)elapsed+=(now-last)/1000;last=now;if(elapsed>=5.1&&!offered){offered=true;callbacks.say("Me","Here you are!")}if(elapsed>=6.6&&!thanked){thanked=true;callbacks.say("Brother","Thank you, Hessa!")}if(elapsed>=10&&!L?.busy){done();return}requestAnimationFrame(frame)};requestAnimationFrame(frame);
}
}
'''
replace('function qt(){',sharing+'function qt(){')
# Don't move the grandparents off their cushions for the family challenge.
replace('t.userData.sitting=!0,t.rotation.y=0)}}setPose', 't.userData.sitting=["Grandma","Grandpa","Brother"].includes(t.userData.name),t.rotation.y=t.userData.name==="Brother"?-Math.PI/2:0)}window.CharacterModels?.prepareScene(this,4)}setPose')
# One route label owner prevents the old half-second HUD refresh from flickering.
replace('E.textContent=P?.portal?"Next: "+P.label:"Next: "+Qe[c.scene].family','E.textContent=window.ScienceUI.route()')
# The original lab/photo/scoring banks are untouched.
game=game.replace('V8.7','V8.8');p.write_text(game)
html=(ROOT/'index.html').read_text().replace('V8.7','V8.8')
html=html.replace('<script src="assets/updates.js">','<script src="assets/voice-updates.js"></script><script src="assets/updates.js">')
(ROOT/'index.html').write_text(html)
(ROOT/'tools/polish-manifest.json').write_text(json.dumps(changes,indent=2)+'\n')
print('V8.8:',len(changes),'scoped patches')
