[CmdletBinding()]
param(
    [Parameter()]
    [string]$Root = (Get-Location).Path,

    [Parameter()]
    [switch]$TemplateMode
)

$ErrorActionPreference = "Stop"

function Write-Check {
    param(
        [string]$Label,
        [bool]$Passed,
        [string]$Detail = ""
    )

    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $message = "[$status] $Label"
    if ($Detail) {
        $message += " - $Detail"
    }

    if ($Passed) {
        Write-Host $message
    } else {
        Write-Warning $message
    }
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path

$requiredFiles = @(
    "AGENTS.md",
    "CLAUDE.md",
    "PROJECT.md",
    "STATE.md",
    "TASKS.md",
    "DECISIONS.md",
    "BOOTSTRAP-PROMPT.md",
    "VALIDATION.md",
    ".agent\templates\RUN-CARD.md",
    ".agent\templates\CLOSEOUT.md",
    ".agent\templates\SESSION-HANDOFF.md",
    "scripts\Test-AgentProject.ps1"
)

$requiredDirectories = @(
    ".agent\sessions",
    ".agent\runbooks",
    ".agent\verification",
    ".agent\templates",
    "scripts"
)

$contentChecks = @(
    @{
        File = "AGENTS.md"
        Patterns = @(
            "Required reading order",
            "Required closeout",
            "Conflict handling",
            "Never store passwords"
        )
    },
    @{
        File = "PROJECT.md"
        Patterns = @(
            "Canonical key:",
            "Definition of done",
            "Out of scope",
            "Authority"
        )
    },
    @{
        File = "STATE.md"
        Patterns = @(
            "Status:",
            "Health:",
            "Progress:",
            "Sync state:",
            "## Repository",
            "- Git:",
            "- Branch:",
            "- Remote:",
            "- Working tree:",
            "- Baseline commit:",
            "Current objective",
            "Blockers",
            "Single next action"
        )
    },
    @{
        File = "TASKS.md"
        Patterns = @(
            "## Now",
            "## Next",
            "## Later",
            "## Waiting",
            "## Completed"
        )
    }
)

$syncTerms = @("Synced", "Local ahead", "Notion ahead", "Needs review")

$failures = 0

Write-Host "Agent Project Structural Validation"
Write-Host "Root: $rootPath"
Write-Host ""

foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $rootPath $relativePath
    $exists = Test-Path -LiteralPath $fullPath -PathType Leaf
    Write-Check "Required file: $relativePath" $exists
    if (-not $exists) { $failures++ }
}

foreach ($relativePath in $requiredDirectories) {
    $fullPath = Join-Path $rootPath $relativePath
    $exists = Test-Path -LiteralPath $fullPath -PathType Container
    Write-Check "Required directory: $relativePath" $exists
    if (-not $exists) { $failures++ }
}

foreach ($check in $contentChecks) {
    $fullPath = Join-Path $rootPath $check.File

    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        continue
    }

    $content = Get-Content -LiteralPath $fullPath -Raw

    foreach ($pattern in $check.Patterns) {
        $present = $content.Contains($pattern)
        Write-Check "$($check.File) contains '$pattern'" $present
        if (-not $present) { $failures++ }
    }
}

$combinedOperationalContent = @()
foreach ($file in @("AGENTS.md", "STATE.md", "README.md")) {
    $fullPath = Join-Path $rootPath $file
    if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
        $combinedOperationalContent += Get-Content -LiteralPath $fullPath -Raw
    }
}
$combinedText = $combinedOperationalContent -join "`n"

foreach ($term in $syncTerms) {
    $present = $combinedText.Contains($term)
    Write-Check "Synchronization term present: $term" $present
    if (-not $present) { $failures++ }
}

$projectFile = Join-Path $rootPath "PROJECT.md"
if (Test-Path -LiteralPath $projectFile -PathType Leaf) {
    $projectText = Get-Content -LiteralPath $projectFile -Raw
    $placeholderRemaining = $projectText.Contains('Canonical key: `REPLACE-ME`')

    if ($TemplateMode) {
        Write-Check "Template canonical-key placeholder present" $placeholderRemaining
        if (-not $placeholderRemaining) { $failures++ }
    } else {
        $detail = ""
        if ($placeholderRemaining) {
            $detail = "Replace the PROJECT.md placeholder before project verification."
        }
        Write-Check "Canonical project key populated" (-not $placeholderRemaining) $detail
        if ($placeholderRemaining) { $failures++ }
    }
}

$gitIgnore = Join-Path $rootPath ".gitignore"
if (Test-Path -LiteralPath $gitIgnore -PathType Leaf) {
    $gitIgnoreText = Get-Content -LiteralPath $gitIgnore -Raw
    $envIgnored = $gitIgnoreText -match "(?m)^\s*\.env|(?m)^\s*\*+/\.env|(?m)^\s*\*\*/\.env"
    Write-Check ".gitignore appears to exclude .env files" $envIgnored
    if (-not $envIgnored) { $failures++ }
} else {
    Write-Warning "[WARN] No .gitignore found. Add and review one before the first commit."
}

Write-Host ""
if ($failures -gt 0) {
    Write-Warning "Structural validation failed with $failures issue(s)."
    exit 1
}

Write-Host "Structural validation passed."
Write-Host "Next gate: run the shortened cross-agent project-memory smoke test."
exit 0
