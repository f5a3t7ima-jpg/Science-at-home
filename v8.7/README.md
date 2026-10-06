# Science at Home — V8.7

Updated from the supplied V8.6 HTML. Open the [game](https://f5a3t7ima-jpg.github.io/Science-at-home/v8.7/) in Chrome or Edge.

## What changed

- Supplied Hessa, Hamad, Mother, Khalid, Grandma and Grandpa GLBs replace the procedural characters. Hessa uses the supplied walking animation; grandparents use their supplied sitting animations.
- A single Hamad appears in the majlis and moves to Mother's courtyard scenes. The former sister's role belongs to Hamad.
- Shaheen guides the route and gold dots. Fahem gives the existing preset science hints and evidence-check prompts. Maha appears when it is time to write on the group paper. Helper portraits are rendered from the supplied 3D models and remain on screen, outside the physical game world.
- Wrong selections are red with a cross; correct selections are green with a tick. Question type is larger.
- Early finishers get a centered Practice / Discover more / Look again menu. Practice no longer starts automatically.

The house geometry, outdoor environment, experiment visuals, photo data, question banks, group differentiation, scoring and original audio data are preserved. Character-name references and the paper reminder are the intended wording changes.

## Ministry context

The helper roles support the National Education Charter's themes of teamwork, self-regulation, critical thinking, and reading/writing. This is a classroom design choice, not a claim of Ministry approval.

- [Ministry of Education: National Education Charter](https://moe.gov.ae/ar/about-us/Pages/national-education-charter.aspx)
- [Ministry campaign announcement](https://moe.gov.ae/ar/mediacenter/news/pages/MOE-launches-back-to-school-campaign-themed-Guided-by-the-Charter-Building-Tomorrow.aspx)

## Assets and validation

The six family assets total about 10.5 MiB. Their geometry, rigs and supplied animation data are retained; embedded texture resolutions are reduced for school laptops. Helpers use small pre-rendered PNGs instead of additional live 3D scenes.

Validation covered 77 checks: loading all six models, finite animated transforms, single-Hamad placement, wrong/correct answers across all six groups and five scenes, Maha's paper reminder, centered early-finish choices, and opening/closing practice. JavaScript syntax and content-preservation checks also passed. Hessa's walk and both grandparents' sitting animations were inspected with software-rendered previews. The available test browser has WebGL disabled, so live GPU rendering, frame rate and camera occlusion still require checking on a WebGL-capable school laptop.

`tools/build.py` applies scoped replacements to the original attachment at `../upload/Science_at_Home_V8_6.html`. `tools/build_offline.py` produces a single HTML file with all models, helper images, original photos and recordings embedded. Keep the `assets` and `vendor` folders alongside `index.html` for the hosted version.

Three.js and its GLTFLoader/BufferGeometryUtils: MIT license. Supplied character models and lesson assets remain their respective owners' content.
