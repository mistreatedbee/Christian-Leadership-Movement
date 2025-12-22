# PowerShell script to update .env file with InsForge credentials
# Usage: .\update-env.ps1 -BaseUrl "https://your-url.insforge.app" -AnonKey "your-key"

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$AnonKey
)

# Read current .env file
$envContent = Get-Content .env -ErrorAction SilentlyContinue

if (-not $envContent) {
    Write-Host "Creating new .env file..." -ForegroundColor Yellow
    $envContent = @()
}

# Update or add VITE_INSFORGE_BASE_URL
if ($BaseUrl) {
    if ($envContent -match '^VITE_INSFORGE_BASE_URL=') {
        $envContent = $envContent -replace '^VITE_INSFORGE_BASE_URL=.*', "VITE_INSFORGE_BASE_URL=$BaseUrl"
        Write-Host "✅ Updated VITE_INSFORGE_BASE_URL to: $BaseUrl" -ForegroundColor Green
    } else {
        $envContent += "VITE_INSFORGE_BASE_URL=$BaseUrl"
        Write-Host "✅ Added VITE_INSFORGE_BASE_URL: $BaseUrl" -ForegroundColor Green
    }
}

# Update or add VITE_INSFORGE_ANON_KEY
if ($AnonKey) {
    if ($envContent -match '^VITE_INSFORGE_ANON_KEY=') {
        $envContent = $envContent -replace '^VITE_INSFORGE_ANON_KEY=.*', "VITE_INSFORGE_ANON_KEY=$AnonKey"
        Write-Host "✅ Updated VITE_INSFORGE_ANON_KEY" -ForegroundColor Green
    } else {
        $envContent += "VITE_INSFORGE_ANON_KEY=$AnonKey"
        Write-Host "✅ Added VITE_INSFORGE_ANON_KEY" -ForegroundColor Green
    }
}

# Ensure header comment exists
if (-not ($envContent -match '^# InsForge Configuration')) {
    $envContent = @("# InsForge Configuration", "# Get your anon key from your InsForge dashboard or use the MCP tool") + $envContent
}

# Write back to .env file
$envContent | Set-Content .env

Write-Host "`n✅ .env file updated successfully!" -ForegroundColor Green
Write-Host "`n⚠️  IMPORTANT: Restart your dev server for changes to take effect!" -ForegroundColor Yellow
Write-Host "   Stop: Ctrl+C" -ForegroundColor Yellow
Write-Host "   Start: npm run dev`n" -ForegroundColor Yellow

# Display current .env content
Write-Host "Current .env file:" -ForegroundColor Cyan
Get-Content .env | Where-Object { $_ -match 'VITE_INSFORGE' }

