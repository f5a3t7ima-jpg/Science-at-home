# Science at Home — V8.8

Open the [game](https://f5a3t7ima-jpg.github.io/Science-at-home/v8.8/) in Chrome or Edge. V8.7 remains available at its original address.

## V8.8 changes

- The cover includes بالميثاق نبلغ الآفاق, الميثاق الوطني للتعليم, the school's bilingual credits, and six relevant official Charter illustrations with labels on the right. A smaller teacher credit appears below Hessa's dialogue name.
- Updated Grandma, Grandpa and Hamad models sit on the existing majlis cushions and face into the family conversation. Hamad's low seated pose is adapted from the supplied grandfather animation while retaining Hamad's proportions.
- At the existing marshmallow-sharing point, Dad asks Hessa to share. Hessa takes a marshmallow from Mom, walks around the fire pit, hands it to Hamad, and Hamad thanks her. The original paper activity follows.
- Physical, chemical and other key question words are bold and coloured. Question wording, answer keys and scoring are unchanged.
- Startup warms the character shaders after models load, preloads only the first needed recordings, and avoids updating hidden characters. Shaheen's route label no longer flickers between two instructions, and dialogue waits for speech to finish.
- Hessa's existing recordings play slightly slower. All 196 original recordings are retained. New route/sharing lines use the device's available English speech voices; their quality and offline availability depend on the browser and device. No new neural recordings were generated.

V8.7's larger questions, red/green answer feedback, centred early-finish activity choices, Shaheen's directions, Fahem's science hints and Maha's paper reminders remain included. The original house, interior, experiment pictures, original recordings and question banks are preserved.

## Credits

مدرسة أم الفضل بنت الحارث الحلقة 2  
Um Al Fadhel Bint Al Hareth C2  
قسم العلوم  
Department of Science  
إعداد المعلمة: فاطمة عبدالرحمن الربيح المصعبي  
Teacher: Fatima Al Rubaih

The Charter illustrations were extracted from the supplied Ministry introductory guide. The selected concepts are extended family, generosity and humility, teamwork, critical thinking, effective communication, and reading and writing. Their use describes classroom learning goals; it does not imply Ministry endorsement.

[Ministry of Education: National Education Charter](https://moe.gov.ae/ar/about-us/Pages/national-education-charter.aspx)

## Validation and build

The browser QA page passed 85 checks covering the cover, credits, model loading, answer feedback across six groups and five scenes, keyword emphasis, paper reminder and centred activity menu. CPU tests checked actual skinned seated bounds, the complete collision-free sharing route, handover ownership, thank-you timing and cutscene cleanup. Software-rendered views were inspected for seated poses, the majlis reply camera and handover. JavaScript syntax and exact content-preservation checks passed.

The available test browser has WebGL disabled. Its picture-mode interface was verified, but live GPU frame rate and spoken voice quality still need checking on the classroom laptop. Software validation renders are not screenshots from the game's WebGL renderer.

`tools/polish_v88.py` runs the original V8.7 build and applies 19 scoped game changes. `tools/build_offline.py` embeds all models, helper portraits, Charter icons, photos, recordings and scripts in one downloadable HTML file. Embedded original audio works without downloads; additional device speech may need internet. Keep `assets` and `vendor` alongside `index.html` for the hosted version.

Three.js and its GLTFLoader/BufferGeometryUtils: MIT licence. Supplied character models, official illustrations and lesson assets remain their respective owners' content.
