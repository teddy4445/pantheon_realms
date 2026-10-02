# Creature model reference views

Model-reference images for the later 3D step (image-to-3D and modelling),
delivered from `assets-source/art/briefs/GPT6_BRIEF_5_CREATURES.md`:
four views per creature form, named

    creature.<pantheon>.tier<N>.<base|upgraded>.ref.<threequarter|front|side|top>.png
    creature.neutral.<family>.<base|upgraded>.ref.<view>.png

1024 × 1024 PNG, transparent background, neutral A-pose / standing pose,
even studio light. The game never reads this folder; nothing here is packaged.
The matching painted portraits (`creature.….portrait.png`) go into
`assets-source/icons/final/` and are imported with `npm run icons:import`.
