# @pr/campaign — missions and campaign progression

* `createMissionMatch` turns a mission manifest (+ optional hero carryover) into a fresh `MatchState`.
* `startCampaign`, `recordCompletion` (idempotent), `startNextMission` (deterministic from the record),
  `restartCurrentMission`, `startPracticeReplay`.

No rendering, no persistence.
