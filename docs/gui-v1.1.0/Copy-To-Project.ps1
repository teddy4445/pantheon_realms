param(
  [Parameter(Mandatory=$true)][string]$DestinationRoot,
  [switch]$Apply,
  [switch]$IncludeExistingArt
)
$ErrorActionPreference = 'Stop'
$artSourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$artDestinationRoot = [IO.Path]::GetFullPath($DestinationRoot).TrimEnd('\','/')
if (-not (Test-Path -LiteralPath (Join-Path $artDestinationRoot 'package.json'))) { throw 'Destination must be an existing game checkout with package.json.' }
if (-not (Test-Path -LiteralPath (Join-Path $artDestinationRoot 'packages/ui'))) { throw 'Destination must contain packages/ui.' }
$transferPlan = [System.Collections.Generic.List[object]]::new()
$seenDestinations = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
function Add-Transfer([string]$From, [string]$Relative) {
  $targetPath = [IO.Path]::GetFullPath((Join-Path $artDestinationRoot $Relative))
  if (-not $targetPath.StartsWith($artDestinationRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw "Path escapes destination: $Relative" }
  if (-not $seenDestinations.Add($targetPath)) { return }
  if (-not (Test-Path -LiteralPath $From -PathType Leaf)) { throw "Missing source: $From" }
  if (Test-Path -LiteralPath $targetPath) {
    if ((Get-FileHash -LiteralPath $From -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash) {
      throw "Different destination file; nothing has been copied. Resolve intentionally: $targetPath"
    }
    return
  }
  $transferPlan.Add([pscustomobject]@{Source=$From;Target=$targetPath;Bytes=(Get-Item -LiteralPath $From).Length})
}
foreach ($relativeDirectory in @('assets-runtime/ui-v1.1.0','assets-source/ui-v1.1.0','docs/gui-v1.1.0','docs/gui-concepts-2026-10-10')) {
  $folder = Join-Path $artSourceRoot $relativeDirectory
  foreach ($file in Get-ChildItem -LiteralPath $folder -File -Recurse) {
    $relative = $file.FullName.Substring($artSourceRoot.TrimEnd('\','/').Length).TrimStart('\','/')
    Add-Transfer $file.FullName $relative
  }
}
if ($IncludeExistingArt) {
  $inventory = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'existing-art-inventory.json') -Raw | ConvertFrom-Json
  foreach ($item in $inventory.assets) { Add-Transfer $item.sourceAbsolute ('assets-runtime/' + $item.file) }
}
$byteTotal = ($transferPlan | Measure-Object -Property Bytes -Sum).Sum
Write-Output ("{0} missing files; {1:N1} MiB. Identical files skipped. No differing files will be overwritten." -f $transferPlan.Count, ($byteTotal / 1MB))
if (-not $Apply) {
  $transferPlan | Select-Object -First 12 Source,Target
  Write-Output 'Dry run only. Rerun with -Apply to copy. This script does not register manifests or alter game code.'
  return
}
foreach ($transfer in $transferPlan) {
  $parentFolder = Split-Path -Parent $transfer.Target
  New-Item -ItemType Directory -Path $parentFolder -Force | Out-Null
  Copy-Item -LiteralPath $transfer.Source -Destination $transfer.Target
  if ((Get-FileHash -LiteralPath $transfer.Source -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $transfer.Target -Algorithm SHA256).Hash) { throw "Verification failed: $($transfer.Target)" }
}
Write-Output 'Copied and hash-verified. Integrate the new manifest following CLAUDE_CODE_HANDOFF_1.1.0.txt.'
