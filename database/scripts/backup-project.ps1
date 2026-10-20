param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('core', 'revision')]
  [string]$Target,

  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [Parameter(Mandatory = $true)]
  [string]$ConfirmRef
)

$ErrorActionPreference = 'Stop'
$refs = @{
  core = 'nnsgvnjzfrcmbxfwlyow'
  revision = 'rydnrvvmwixrkmnvpajf'
}
$projectRef = $refs[$Target]
if ($ConfirmRef -ne $projectRef) {
  throw "Target confirmation mismatch. Expected $projectRef."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if ($destinationPath.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backups may contain private data and must be stored outside the repository.'
}

if (!(Get-Command docker -ErrorAction SilentlyContinue) -and !(Get-Command podman -ErrorAction SilentlyContinue)) {
  throw 'Supabase db dump requires Docker or Podman on this workstation.'
}

New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
$schemaFile = Join-Path $destinationPath "$Target-schema.sql"
$dataFile = Join-Path $destinationPath "$Target-public-storage-data.sql"
$rolesFile = Join-Path $destinationPath "$Target-roles.sql"

& npx supabase@2.121.0 db dump --project-ref $projectRef --file $schemaFile
if ($LASTEXITCODE -ne 0) { throw 'Schema backup failed.' }
& npx supabase@2.121.0 db dump --project-ref $projectRef --data-only --use-copy --schema public,storage --file $dataFile
if ($LASTEXITCODE -ne 0) { throw 'Data backup failed.' }
& npx supabase@2.121.0 db dump --project-ref $projectRef --role-only --file $rolesFile
if ($LASTEXITCODE -ne 0) { throw 'Role backup failed.' }

Get-FileHash -Algorithm SHA256 $schemaFile, $dataFile, $rolesFile |
  Select-Object Path, Hash |
  ConvertTo-Json |
  Set-Content -LiteralPath (Join-Path $destinationPath "$Target-checksums.json") -Encoding utf8

Write-Output "Backup completed outside the repository: $destinationPath"
