param(
  [Parameter(Mandatory=$true)][string]$DestinationRoot,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$targetRoot = [IO.Path]::GetFullPath($DestinationRoot)
if ($sourceRoot.TrimEnd('\') -eq $targetRoot.TrimEnd('\')) { throw 'Choose your OTHER project checkout. The source already contains these files.' }
$inventory = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'complete-copy-inventory.json') -Raw | ConvertFrom-Json
$queue = [Collections.Generic.List[object]]::new()
$known = @{}
function Add-File([string]$Relative,[string]$ExpectedHash) {
  $src = [IO.Path]::GetFullPath((Join-Path $sourceRoot $Relative))
  $dst = [IO.Path]::GetFullPath((Join-Path $targetRoot $Relative))
  if (-not $src.StartsWith($sourceRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw "Invalid source: $Relative" }
  if (-not $dst.StartsWith($targetRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw "Invalid destination: $Relative" }
  if ($known.ContainsKey($dst)) { return }
  if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Missing source: $src" }
  $hash = (Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash
  if ($ExpectedHash -and $hash -ne $ExpectedHash) { throw "Source changed since audit: $src. Re-run the audit before copying." }
  $known[$dst] = $true
  $queue.Add([pscustomobject]@{Source=$src;Target=$dst;Hash=$hash})
}
foreach ($entry in $inventory.files) { Add-File $entry.destinationRelative $entry.sha256 }
foreach ($dir in @('docs/frontend-v1.1.0','docs/gui-v1.1.0')) {
  Get-ChildItem -LiteralPath (Join-Path $sourceRoot $dir) -File -Recurse | ForEach-Object {
    Add-File $_.FullName.Substring($sourceRoot.Length+1) ''
  }
}
foreach ($rel in @('assets-runtime/frontend-kit-v1.1.0/manifest.json','assets-runtime/frontend-kit-v1.1.0/complete-assets.json','assets-runtime/frontend-v1.1.0/manifest.json','assets-runtime/ui-v1.1.0/manifest.json','assets-source/frontend-kit-v1.1.0/generation-queue.json','assets-source/frontend-kit-v1.1.0/revision-history.json')) { Add-File $rel '' }
$conflicts = [Collections.Generic.List[string]]::new()
$pending = [Collections.Generic.List[object]]::new()
$identical = 0
foreach ($item in $queue) {
  if (Test-Path -LiteralPath $item.Target) {
    if (-not (Test-Path -LiteralPath $item.Target -PathType Leaf)) { $conflicts.Add($item.Target); continue }
    if ((Get-FileHash -LiteralPath $item.Target -Algorithm SHA256).Hash -ne $item.Hash) { $conflicts.Add($item.Target) }
    else { $identical++ }
  } else { $pending.Add($item) }
}
if ($conflicts.Count) { $conflicts | Write-Output; throw "$($conflicts.Count) differing destination files. No files copied. Review conflicts manually." }
if ($DryRun) { Write-Output "Verified $($queue.Count) sources. Would copy $($pending.Count) files; $identical identical files skipped. Destination: $targetRoot"; return }
foreach ($item in $pending) {
  $parent = Split-Path -Parent $item.Target
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  Copy-Item -LiteralPath $item.Source -Destination $item.Target
  if ((Get-FileHash -LiteralPath $item.Target -Algorithm SHA256).Hash -ne $item.Hash) { throw "Copy verification failed: $($item.Target)" }
}
Write-Output "Copied and hash-verified $($pending.Count) files. Skipped $identical identical files. No application code or master target manifests merged."
