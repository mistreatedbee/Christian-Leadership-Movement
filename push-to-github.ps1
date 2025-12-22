# PowerShell script to push changes to GitHub
# Run this script from the project root directory

Write-Host "=== Pushing Changes to GitHub ===" -ForegroundColor Cyan

# Navigate to project directory
$projectDir = Join-Path $PSScriptRoot "Christian-Leadership-Movement-main"
if (Test-Path $projectDir) {
    Set-Location $projectDir
    Write-Host "Changed to directory: $projectDir" -ForegroundColor Green
} else {
    Write-Host "Project directory not found. Using current directory." -ForegroundColor Yellow
}

# Check if git is available
$gitPath = $null
$possiblePaths = @(
    "git",
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Git\bin\git.exe"
)

foreach ($path in $possiblePaths) {
    try {
        $result = Get-Command $path -ErrorAction SilentlyContinue
        if ($result) {
            $gitPath = $result.Source
            break
        }
    } catch {
        continue
    }
}

if (-not $gitPath) {
    Write-Host "ERROR: Git is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternatively, you can manually push using these commands:" -ForegroundColor Yellow
    Write-Host "  cd '$projectDir'" -ForegroundColor White
    Write-Host "  git init" -ForegroundColor White
    Write-Host "  git remote add origin https://github.com/mistreatedbee/Christian-Leadership-Movement.git" -ForegroundColor White
    Write-Host "  git add ." -ForegroundColor White
    Write-Host "  git commit -m 'Fix: Application forms visibility, course fees management, and event registration routing'" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
    exit 1
}

Write-Host "Found Git at: $gitPath" -ForegroundColor Green

# Check if .git exists
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    & $gitPath init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to initialize git repository" -ForegroundColor Red
        exit 1
    }
}

# Check remote
$remoteCheck = & $gitPath remote -v 2>&1
if ($remoteCheck -notmatch "origin.*github.com.*mistreatedbee.*Christian-Leadership-Movement") {
    Write-Host "Setting up remote repository..." -ForegroundColor Yellow
    & $gitPath remote remove origin 2>$null
    & $gitPath remote add origin https://github.com/mistreatedbee/Christian-Leadership-Movement.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to add remote repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "Remote repository configured" -ForegroundColor Green
}

# Add all changes
Write-Host "Adding all changes..." -ForegroundColor Yellow
& $gitPath add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to add changes" -ForegroundColor Red
    exit 1
}

# Check if there are changes to commit
$status = & $gitPath status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit" -ForegroundColor Yellow
} else {
    # Commit changes
    Write-Host "Committing changes..." -ForegroundColor Yellow
    $commitMessage = @"
Fix: Application forms visibility, course fees management, and event registration routing

- Fixed application forms to show preview for non-logged-in users
- Fixed course fees to display immediately after admin saves
- Fixed event registration routing to navigate to correct pages
- Fixed payment redirect URL format in event registration
"@
    
    & $gitPath commit -m $commitMessage
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to commit changes" -ForegroundColor Red
        exit 1
    }
    Write-Host "Changes committed successfully" -ForegroundColor Green
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
& $gitPath push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Pull first: git pull origin main --allow-unrelated-histories" -ForegroundColor White
    Write-Host "  2. Or force push (if you're sure): git push -u origin main --force" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "=== Successfully pushed to GitHub! ===" -ForegroundColor Green
Write-Host "Repository: https://github.com/mistreatedbee/Christian-Leadership-Movement" -ForegroundColor Cyan


