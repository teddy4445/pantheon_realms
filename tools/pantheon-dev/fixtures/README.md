# Audit fixtures, not game content

`creature-pairs.valid.json` is a minimal aggregate for topology checks. It intentionally lacks attack/cost/ability data required by a real creature definition. Do not import it as the production catalog.

`metadata-only.gltf` exercises named animation inspection. It has no renderable geometry and deliberately empty animation channels. It is not a conforming animated creature or proof of export quality. The test suite constructs synthetic GLB bytes separately to test parser rejection and header handling.

The tools use these fixtures without creating a game, editing Blender, connecting to external servers or running the campaign.
