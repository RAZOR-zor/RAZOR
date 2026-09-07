param(
    [Parameter(Mandatory=$true)][string]$Token,
    [Parameter(Mandatory=$true)][string]$Ver,
    [string]$Repo = 'RAZOR-zor/RAZOR'
)

$ErrorActionPreference = 'Stop'
$tag = 'v' + $Ver
$headers = @{ Authorization = 'token ' + $Token; Accept = 'application/vnd.github+json' }
$apiBase = "https://api.github.com/repos/$Repo/releases"

$release = $null
try {
    $release = Invoke-RestMethod -Uri "$apiBase/tags/$tag" -Headers $headers
    Write-Output "Release $tag sudah ada - asset lama akan diganti"
} catch {
    Write-Output "Membuat release $tag..."
    $body = @{
        tag_name   = $tag
        name       = $tag
        body       = "Release $tag"
        draft      = $false
        prerelease = $false
    } | ConvertTo-Json
    $release = Invoke-RestMethod -Uri $apiBase -Method Post -Headers $headers -Body $body
    Write-Output ("Release created: " + $release.html_url)
}

function Upload-Asset {
    param([string]$Name, [string]$FilePath)
    $old = $release.assets | Where-Object { $_.name -eq $Name }
    if ($old) {
        Write-Output "  Hapus asset lama: $Name"
        Invoke-RestMethod -Uri "$apiBase/assets/$($old.id)" -Method Delete -Headers $headers | Out-Null
    }
    $url = "https://uploads.github.com/repos/$Repo/releases/$($release.id)/assets?name=$Name"
    Invoke-RestMethod -Uri $url -Method Post -Headers ($headers + @{ 'Content-Type' = 'application/octet-stream' }) -InFile $FilePath -TimeoutSec 600 | Out-Null
    Write-Output "  Upload OK: $Name"
}

$distDir = Split-Path $PSScriptRoot -Parent
Write-Output "Uploading installer (~80 MB, mohon tunggu)..."
Upload-Asset -Name "RAZOR-$Ver-Setup.exe" -FilePath (Join-Path $distDir "dist\RAZOR-$Ver-Setup.exe")
Write-Output "Uploading latest.yml..."
Upload-Asset -Name "latest.yml" -FilePath (Join-Path $distDir "dist\latest.yml")

Write-Output ""
Write-Output "============================================"
Write-Output "RELEASE $tag BERHASIL!"
Write-Output $release.html_url
Write-Output "============================================"
