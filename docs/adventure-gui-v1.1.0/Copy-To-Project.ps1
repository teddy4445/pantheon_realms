param([Parameter(Mandatory=$true)][string]$DestinationRoot,[switch]$DryRun)
$ErrorActionPreference='Stop'
$sourceRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$targetRoot=[IO.Path]::GetFullPath($DestinationRoot)
if($sourceRoot.TrimEnd('\') -eq $targetRoot.TrimEnd('\')){throw 'Choose your separate destination checkout.'}
$queue=[Collections.Generic.List[object]]::new();$known=@{}
function Add-File([string]$Relative,[string]$Expected){
 $src=[IO.Path]::GetFullPath((Join-Path $sourceRoot $Relative));$dst=[IO.Path]::GetFullPath((Join-Path $targetRoot $Relative))
 if(-not $src.StartsWith($sourceRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Invalid source $Relative"}
 if(-not $dst.StartsWith($targetRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Invalid destination $Relative"}
 if($known.ContainsKey($dst)){return}
 if(-not(Test-Path -LiteralPath $src -PathType Leaf)){throw "Missing $src"}
 $hash=(Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash
 if($Expected -and $Expected -ne $hash){throw "Source changed since audit: $src"}
 $known[$dst]=$true;$queue.Add([pscustomobject]@{Source=$src;Target=$dst;Hash=$hash})
}
$inventory=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'copy-inventory.json') -Raw | ConvertFrom-Json
foreach($f in $inventory.files){Add-File $f.destinationRelative $f.sha256}
foreach($dir in @('docs/adventure-gui-v1.1.0','docs/gui-six-concepts-2026-10-10','assets-source/adventure-gui-v1.1.0')){
 Get-ChildItem -LiteralPath (Join-Path $sourceRoot $dir) -File -Recurse | ForEach-Object {Add-File $_.FullName.Substring($sourceRoot.Length+1) ''}
}
foreach($rel in @('assets-runtime/adventure-gui-v1.1.0/manifest.json','assets-runtime/adventure-gui-v1.1.0/complete-assets.json')){Add-File $rel ''}
$pending=[Collections.Generic.List[object]]::new();$conflicts=[Collections.Generic.List[string]]::new();$same=0
foreach($f in $queue){
 if(Test-Path -LiteralPath $f.Target){
  if(-not(Test-Path -LiteralPath $f.Target -PathType Leaf)){$conflicts.Add($f.Target)}
  elseif((Get-FileHash -LiteralPath $f.Target -Algorithm SHA256).Hash -ne $f.Hash){$conflicts.Add($f.Target)}
  else{$same++}
 }else{$pending.Add($f)}
}
if($conflicts.Count){$conflicts | Write-Output;throw "$($conflicts.Count) conflicts. No files copied. Reconcile deliberately before retrying."}
if($DryRun){Write-Output "Verified $($queue.Count) source files; would copy $($pending.Count), skip $same identical files. No changes made.";return}
foreach($f in $pending){$parent=Split-Path -Parent $f.Target;if(-not(Test-Path -LiteralPath $parent)){New-Item -ItemType Directory -Path $parent -Force | Out-Null};Copy-Item -LiteralPath $f.Source -Destination $f.Target;if((Get-FileHash -LiteralPath $f.Target -Algorithm SHA256).Hash -ne $f.Hash){throw "Failed verification $($f.Target)"}}
Write-Output "Copied and hash-verified $($pending.Count) files; skipped $same identical files. Application code and master manifests were not merged."
