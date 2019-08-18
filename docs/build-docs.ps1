#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

function checkLastExitCode() {
    if ($LASTEXITCODE) {
        throw [System.Exception]"Command exit code indicates failure: $LASTEXITCODE."
    }
}

Remove-Item ./dist -Force -Recurse -ErrorAction SilentlyContinue
New-Item ./dist -ItemType Directory | Out-Null

typedoc ../packages/tasklike-promise-library/src --tsconfig ../packages/tasklike-promise-library/tsconfig.json --out ./dist/docs/
checkLastExitCode

$repoDir = git rev-parse --show-toplevel
checkLastExitCode

# Redactions
function redactContent([string[]]$content) {
    $repoRootPattern = $repoDir -replace "[/\\]$", "" -replace "[/\\]", "[/\\]"
    return $content -replace $repoRootPattern, "[REPOROOT]"
}

Get-ChildItem dist/*.html -File -Recurse | % {
    # Do not read and write the same file at the same time (piped), or redactContent may receive empty content.
    $content = Get-Content $_
    redactContent $content > $_
}

$matchedLines = Get-ChildItem .\dist\* -File -Recurse | Select-String VSCode -SimpleMatch
if ($matchedLines) {
    Write-Host "Detected potential content to be redacted:"
    Write-Host $matchedLines
    Write-Error "Please review the results before continue."
}

# Default page
Copy-Item ./src/* -Destination ./dist/ -Recurse

# Sample page
yarn workspace sample run build
New-Item ./dist/sample -ItemType Directory | Out-Null
Copy-Item ../sample/dist/* -Destination ./dist/sample/ -Recurse
