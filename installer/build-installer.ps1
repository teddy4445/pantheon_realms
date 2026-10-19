# Double-click build-installer.cmd. Optional arguments: --check, --no-pause.
# Build from this checkout, including current uncommitted game changes.
$ErrorActionPreference = 'Stop'
$runChecks = $false
foreach ($argument in $args) {
    switch ($argument) {
        '--check' { $runChecks = $true }
        '--no-pause' { }
        default { Write-Error "Unknown argument: $argument. Use --check and/or --no-pause."; exit 1 }
    }
}
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$originalLocation = Get-Location
$transcribing = $false
try {
    Set-Location -LiteralPath $root
    Start-Transcript -Path (Join-Path $PSScriptRoot 'build-installer.log') -Force | Out-Null
    $transcribing = $true
    if (!(Test-Path 'apps/desktop/electron-builder.json')) { throw 'Keep the installer folder inside the game checkout.' }

    # Explorer and terminals opened before Node was installed may have an old PATH.
    $nodeFolders = @("$env:ProgramFiles\nodejs", "${env:ProgramFiles(x86)}\nodejs", "$env:LOCALAPPDATA\Programs\nodejs")
    foreach ($folder in $nodeFolders) {
        if ((Test-Path "$folder\node.exe") -and (Test-Path "$folder\npm.cmd")) {
            $env:PATH = "$folder;$env:PATH"
            break
        }
    }
    if (!(Get-Command node.exe -ErrorAction SilentlyContinue) -or !(Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Install Node.js LTS (including npm) from https://nodejs.org, then run this launcher again.'
    }
    $nodeVersion = [version]((& node.exe --version).Trim().TrimStart('v'))
    if (!(($nodeVersion.Major -eq 20 -and $nodeVersion.Minor -ge 19) -or ($nodeVersion.Major -eq 22 -and $nodeVersion.Minor -ge 12) -or $nodeVersion.Major -ge 24)) { throw 'This build requires Node.js 20.19+, 22.12+, or 24+; install the current LTS.' }
    $version = (Get-Content 'apps/desktop/package.json' -Raw | ConvertFrom-Json).version
    $gameVersion = (Get-Content 'package.json' -Raw | ConvertFrom-Json).version
    if ($version -ne $gameVersion) { throw "Game version $gameVersion differs from desktop version $version. Update both before packaging." }
    if ($version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') { throw "Invalid version: $version" }
    $drive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($root).Substring(0,1))
    if ($drive.Free -lt 6GB) { throw 'Free at least 6 GB on the game drive, then run this launcher again.' }
    Write-Host "Building Pantheon Realms $version from $root"

    # A copied node_modules lockfile does not prove workspace links or native
    # binaries exist. npm ci recreates both using the exact locked versions.
    Write-Host '[1/4] Installing locked dependencies...'
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check the network connection and the log above.' }
    if ($runChecks) {
        Write-Host '[2/4] Running checks...'
        & npm.cmd run check
        if ($LASTEXITCODE -ne 0) { throw 'Game checks failed; no replacement installer was generated.' }
    } else { Write-Host '[2/4] Checks skipped (use --check to include them).' }

    Write-Host '[3/4] Building the current game and desktop shell...'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Game build failed.' }
    & npm.cmd run desktop:build
    if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }

    # Each build has a fresh output folder: a stale installer can never count as success.
    $releaseRoot = [IO.Path]::GetFullPath((Join-Path $root 'apps\desktop\release'))
    $stage = Join-Path $releaseRoot ('installer-' + [guid]::NewGuid().ToString('N'))
    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    Write-Host '[4/4] Packaging the Windows installer...'
    & npm.cmd --workspace '@pr/desktop' run dist -- --win --x64 "--config.directories.output=$stage"
    if ($LASTEXITCODE -ne 0) { throw "Packaging failed. Build output remains in $stage" }
    $name = "Pantheon-Realms-Setup-$version-x64.exe"
    $built = Join-Path $stage $name
    if (!(Test-Path -LiteralPath $built)) { throw "Expected installer was not generated: $built" }
    $destination = Join-Path $PSScriptRoot $name
    $pending = Join-Path $PSScriptRoot ($name + '.pending')
    Copy-Item -LiteralPath $built -Destination $pending -Force
    if (Test-Path -LiteralPath $destination) {
        [IO.File]::Replace($pending, $destination, [System.Management.Automation.Language.NullString]::Value)
    } else { [IO.File]::Move($pending, $destination) }
    $sha = [Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($destination)
    try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') }
    finally { $stream.Dispose(); $sha.Dispose() }
    "$hash  $name" | Set-Content -LiteralPath "$destination.sha256" -Encoding ascii
    Write-Host "Ready: $destination"
    Write-Host "SHA-256: $hash"
    # Validate the absolute cleanup target before recursively deleting build output.
    $resolvedStage = [IO.Path]::GetFullPath($stage)
    if (!$resolvedStage.StartsWith($releaseRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup path.' }
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    Write-Host 'Open the Setup EXE in the installer folder to install and play.'
} catch {
    Write-Host "BUILD FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'See installer\build-installer.log for details. Any previous installer is kept until the new installer is ready.'
    exit 1
} finally {
    if ($transcribing) { Stop-Transcript | Out-Null }
    Set-Location -LiteralPath $originalLocation.Path
}




