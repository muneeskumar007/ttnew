Add-Type -AssemblyName System.Drawing

$srcPath = Resolve-Path "public/acelogo.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# 1. Create a 256x256 square image with white or transparent padding
$size = 256
$squareBmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)

# Scale preserving aspect ratio centered in 256x256 with 8px margin
$targetW = 240
$targetH = 240
$ratio = [Math]::Min($targetW / $src.Width, $targetH / $src.Height)
$newW = [int]($src.Width * $ratio)
$newH = [int]($src.Height * $ratio)
$posX = [int](($size - $newW) / 2)
$posY = [int](($size - $newH) / 2)

$g.DrawImage($src, $posX, $posY, $newW, $newH)
$g.Dispose()
$src.Dispose()

# Save square png
$pngPath = Join-Path (Resolve-Path "public") "icon.png"
$squareBmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $pngPath"

# Save ICO file (256x256)
$icoPath = Join-Path (Resolve-Path "public") "icon.ico"
$hIcon = $squareBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$squareBmp.Dispose()
Write-Host "Saved: $icoPath"
