"""Apply explicitly scoped changes to the user's approved V8.6 attachment."""
from pathlib import Path
import re, hashlib, json
ROOT = Path(__file__).resolve().parents[1]
source = (ROOT.parent / 'upload/Science_at_Home_V8_6.html').read_text()
scripts = list(re.finditer(r'<script[^>]*>(.*?)</script>', source, re.S))
game = scripts[2].group(1)
changes = []
def replace(old, new, expected=1):
    global game
    count = game.count(old)
    assert count == expected, (old[:120], count, expected)
    game = game.replace(old, new)
    changes.append({'before':old, 'after':new, 'occurrences':count})

# One brother, one family actor; the scene transition places Hamad where needed.
replace('this.person("Sister","#e6bf4d","sister",e,11.5,0,4.4),', '')
replace('title:"My sister\'s ice melts",family:"Sister"', 'title:"Hamad\'s ice melts",family:"Brother"')
replace('Please share with your sister.', 'Please share with Hamad.')
replace('let s=["Mom & Dad","My sister","My brother","Bathroom"]', 'let s=["Mom & Dad","Hamad","Family room","Bathroom"]')
replace('y==="Me"?"Mariam":s(y)', 'window.ScienceUI.label(y)')
replace('g==="Me"?"Mariam":g==="Question"', 'g==="Me"?"Hessa":g==="Question"')
replace('c.phase="scene",c.scene=y,c.step=0,c.sceneStart=c.elapsed;', 'c.phase="scene",c.scene=y,c.step=0,c.sceneStart=c.elapsed;window.CharacterModels?.prepareScene(x,y);')
replace('c=Ie,c.paused=!1,ze(),ne(!0)', 'c=Ie,c.paused=!1,ze(),window.CharacterModels?.prepareScene(x,c.scene),ne(!0)')
replace('c.started&&!c.paused&&!b&&!i("#extra").textContent&&x.mode', 'c.started&&!c.paused&&!b&&!i("#extra").textContent&&!i(".finish-backdrop")&&x.mode')
replace('n="ScienceAtHome-v7.1-"', 'n=t.has("qa")?"ScienceAtHome-qa-":"ScienceAtHome-v7.1-"')
replace('let l=o.userData,h=this.clock+l.phase,u=o===this.player;', 'let l=o.userData;if(l.model){window.CharacterModels.update(this,o,n,s);continue}let h=this.clock+l.phase,u=o===this.player;')
replace('ye=!0,setTimeout(()=>{ze(),x?.warm(),Re=!0,ye=!1;', 'ye=!0,setTimeout(async()=>{ze(),x?.warm();await window.CharacterModelsReady;const modelStatus=await window.CharacterModels?.loadAll(x);if(modelStatus?.failed.length)C("Some characters could not load. Refresh to try again.",8);Re=!0,ye=!1;')

# Feedback on all question types, preserving answer keys and scoring.
replace('let ae=Y.value===P.answer,Ie=', 'let ae=Y.value===P.answer;window.ScienceUI.feedback(e(".choices button")[y],ae);let Ie=')
replace('Ue(),E.tries=(E.tries||0)+(P?1:0);', 'Ue();if(P)window.ScienceUI.feedback(e(".choices button")[y],Y);E.tries=(E.tries||0)+(P?1:0);')
replace('b=i("#practice-feedback");if(ge(', 'b=i("#practice-feedback");window.ScienceUI.feedback(e("[data-action=practice-answer]").find(n=>n.dataset.value===String(v)),ok);if(ge(')
replace('b=i("#speed-feedback");c.spLock=', 'b=i("#speed-feedback");window.ScienceUI.feedback(e("[data-action=speed-answer]").find(n=>n.dataset.value===String(v)),ok);c.spLock=')

old='(Ie===0?Y===(Ee.chemical?"chemical":"physical"):String(Ee.answer)===Y)?Ie===0?Je(c.discovery,1):(c.discoveries.includes(Ee.id)||c.discoveries.push(Ee.id),ge("discovery",{item:Ee.id}),C("Explorer sticker saved!"),i("#extra").innerHTML="",Oe(Ee.reason)):(i("#discovery-feedback").textContent="Try again. Look carefully at what changed.",Oe("Try again. Look carefully at what changed.",null,!0))'
new='const correct=Ie===0?Y===(Ee.chemical?"chemical":"physical"):String(Ee.answer)===Y;window.ScienceUI.feedback(E,correct);if(correct){e("#extra .choices button").forEach(button=>button.disabled=!0);const discoveryIndex=c.discovery;setTimeout(()=>{if(c.phase!=="explore"||!i("#discovery-feedback")||c.discovery!==discoveryIndex)return;if(Ie===0)Je(discoveryIndex,1);else{c.discoveries.includes(Ee.id)||c.discoveries.push(Ee.id);ge("discovery",{item:Ee.id});C("Explorer sticker saved!");i("#extra").innerHTML="";Oe(Ee.reason)}},800)}else{i("#discovery-feedback").textContent="Try again. Look carefully at what changed.";Oe("Try again. Look carefully at what changed.",null,!0)}'
replace(old,new)

# Centered early-finish menu. The original activity banks remain untouched.
old='Le(\'<section class="dock dialogue"><h2>Explore the house! Check your paper.</h2><p id="explore-countdown"></p><div class="row"><button class="primary" data-action="practice">Practice \\u2605</button><button data-action="discoveries">Discover more</button><button data-action="gallery">Look again</button></div></section>\')'
replace(old, 'Le(window.ScienceUI.finishMenu("Family Challenge in "+l(Z()-c.elapsed)));requestAnimationFrame(()=>i(".finish-menu [data-action=practice]")?.focus())')
# The replaced comma-expression needs a comma before the next original operation.
replace('?.focus()),J("driver",ee("driver"))', '?.focus()),J("driver",ee("driver"))') if False else None
replace('c.phase==="explore"&&!i("#extra").textContent&&!L?.busy&&!d&&c.elapsed<Z()-8&&c.elapsed-Math.max(c.exploreStart||0,c.prClosed||0)>(c.prClosed?15:5)&&prOpen();', '')
replace('else if(P==="practice")prOpen();', 'else if(P==="keep-exploring"){Le(\'<div class="walk-tip">Click the floor to walk. <button class="small" data-action="explore-menu">Choose an activity</button></div>\');x?.free()}else if(P==="explore-menu")O();else if(P==="practice")prOpen();')

# Fahem replaces the former generic AI helper; the evidence-check questions stay verbatim.
replace('${SAQR_SVG}<div class="saqr-bubble"><b>Saqr AI</b>', '${window.ScienceUI.portrait("fahem")}<div class="saqr-bubble"><b>Fahem · Science helper</b>')
replace('Saqr AI noticed', 'Fahem noticed')
replace('Saqr AI: soda is a chemical change.', 'Fahem thinks: soda is a chemical change.')
replace('Saqr AI thinks: change in color.', 'Fahem thinks: change in color.')
replace('Is Saqr AI right?', 'Is Fahem right?')
replace('Saqr helps. Review all five signs.', 'Fahem helps. Review all five signs.')
replace('Saqr AI is an offline, rule-based helper.', 'Fahem gives preset science hints. Shaheen guides the route. Maha reminds the team to write on paper.')
replace('The page makes no network requests. Edge natural speech needs internet.', 'Characters load from this game\'s assets. Original voices are included. Additional device speech may need internet.')
replace('Original procedural art and textures. Three.js: MIT license.', 'Original house, lesson pictures and recordings; supplied character models. Three.js: MIT license.')

# Maha appears with the unchanged group-specific paper instructions.
replace('<div class="page"><p class="eyebrow">Our group paper', '<div class="page"><div class="maha-paper">${window.ScienceUI.portrait("maha")}<div><strong>Maha · Paper time</strong><p>Now it is time to write on your group paper.</p></div></div><p class="eyebrow">Our group paper')
replace('<h2>Write in your paper!</h2>', '<h2>Recorder, write. Team, help!</h2>')
replace('i("#extra").innerHTML="",c.phase==="explore"&&(c.prClosed=c.elapsed)', 'i("#extra").innerHTML="",c.phase==="explore"&&(c.prClosed=c.elapsed,O())')
replace('querySelector(".modal")', 'querySelector(".modal,.finish-backdrop")',expected=0) if False else None

# Export a small integration surface. Lesson internals remain in their original closure.
replace('beginScene:Q,points:B,challengeItem:sh,answer:ns,challengeAnswer:de', 'beginScene:Q,points:B,challengeItem:sh,answer:ns,challengeAnswer:de,openExploreMenu:O,requestHint:mi')
replace('),g0(Xt),i("#loading")?.remove()', '),window.ScienceGame=Xt,window.ScienceUI.init(Xt),g0(Xt),i("#loading")?.remove()')
game=game.replace('V8.6', 'V8.7')

# Separate the original large data blocks without re-encoding their contents.
names=['photo-data.js','voice-data.js','game.js']
for k,name in enumerate(names): (ROOT/'assets'/name).write_text(game if k==2 else scripts[k].group(1))
html=source
for k,match in reversed(list(enumerate(scripts))):
    html=html[:match.start()]+f'<script src="assets/{names[k]}"></script>'+html[match.end():]
html=html.replace('</head>', '<link rel="stylesheet" href="assets/updates.css"></head>')
html=html.replace('<script src="assets/game.js">', '<script src="assets/updates.js"></script><script>window.CharacterModelsReady=import("./assets/characters.js").catch(error=>{console.error("Character loader:",error);return null});</script><script src="assets/game.js">')
html=html.replace('V8.6','V8.7').replace('an offline Grade 5 family science adventure.', 'a Grade 5 family science adventure.')
(ROOT/'index.html').write_text(html)
(ROOT/'tools/change-manifest.json').write_text(json.dumps(changes,indent=2)+'\n')
(ROOT/'tools/preserved-content.json').write_text(json.dumps({
    'sourceSHA256':hashlib.sha256(source.encode()).hexdigest(),
    'originalPhotosSHA256':hashlib.sha256(scripts[0].group(1).encode()).hexdigest(),
    'originalVoicesSHA256':hashlib.sha256(scripts[1].group(1).encode()).hexdigest(),
    'targetedReplacements':len(changes)
},indent=2)+'\n')
print('Built V8.7 with',len(changes),'scoped changes. Photos and voice data preserved byte-for-byte.')
