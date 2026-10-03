# Audit fixtures, not game content

`creature-pairs.valid.json` is a minimal aggregate for topology checks. It intentionally lacks attack/cost/ability data required by a real creature definition. Do not import it as the production catalog.

The sprite-manifest tests build small synthetic `pantheon-realms-sprites-1` manifests and placeholder files in a temporary directory; no game art is stored here.

The tools use these fixtures without creating a game, editing art, connecting to external servers or running the campaign.
