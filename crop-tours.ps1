Add-Type -AssemblyName System.Drawing
$srcDir = 'C:\Users\1luis\Documents\Ia chilon\img'
$dstDir = 'C:\Users\1luis\Documents\Ia chilon\public\tours'
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null

$jobs = @(
  @('WhatsApp Image 2026-10-11 a6t 11.14.36 PM.jpeg','wa-porcon-01.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.37 P6M.jpeg','wa-porcon-02.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.376 PM.jpeg','wa-porcon-03.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.386 PM.jpeg','wa-porcon-04.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.740 PM.jpeg','wa-porcon-05.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.146.37 PM.jpeg','wa-porcon-06.jpg'),
  @('WhatsApp Image 2026-10-161 at 11.14.36 PM.jpeg','wa-porcon-07.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.359 PM.jpeg','wa-namora-01.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.368 P6M.jpeg','wa-namora-02.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.39 5PM.jpeg','wa-namora-03.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.39 P5M.jpeg','wa-namora-04.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.472 PM.jpeg','wa-namora-05.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.38 P6M.jpeg','wa-namora-06.jpg'),
  @('WhatsApp Image 21026-10-11 at 11.14.48 PM.jpeg','wa-namora-07.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.174.40 PM.jpeg','wa-namora-08.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.43 5PM.jpeg','wa-cumbemayo-01.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.43 PM5.jpeg','wa-cumbemayo-02.jpg'),
  @('WhatsApp Image 2026-10-11 at 511.14.43 PM.jpeg','wa-cumbemayo-03.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.114.44 PM.jpeg','wa-cumbemayo-04.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.40 PM6.jpeg','wa-yanamarca-01.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.417 PM.jpeg','wa-yanamarca-02.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.539 PM.jpeg','wa-yanamarca-03.jpg'),
  @('WhatsApp Image 2026-10-11 7at 11.14.40 PM.jpeg','wa-yanamarca-04.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.174.41 PM.jpeg','wa-yanamarca-05.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.32 PM2.jpeg','wa-bus-01.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.33 PM.jpeg','wa-bus-02.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.33 PM.3jpeg.jpeg','wa-bus-03.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.34 PM4.jpeg','wa-bus-04.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.34 P5M.jpeg','wa-bus-05.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.34 PM6.jpeg','wa-bus-06.jpg'),
  @('WhatsApp Image 2026-10-11 at 11.14.35 P6M.jpeg','wa-bus-07.jpg'),
  @('WhatsApp Image 2026-10-11 at 151.14.39 P5M.jpeg','wa-bus-08.jpg')
)

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88)

foreach ($jb in $jobs) {
  $srcPath = Join-Path $srcDir $jb[0]
  $dstPath = Join-Path $dstDir $jb[1]
  $bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
  try {
    $pxW = $bmp.Width; $pxH = $bmp.Height
    $topLim = [int]($pxH * 0.119)
    $botLim = [int]($pxH * 0.95)
    $flags = @()
    for ($yy = $topLim; $yy -lt $botLim; $yy += 2) {
      $darkPx = 0; $sampleCt = 0
      for ($xx = 60; $xx -lt $pxW; $xx += 60) {
        $cl = $bmp.GetPixel($xx, $yy); $sampleCt++
        if (($cl.R + $cl.G + $cl.B) -lt 36) { $darkPx++ }
      }
      $flags += ($darkPx -eq $sampleCt)
    }
    # segmentos no-negros (coma unaria: evita aplanado, $W vs $w colisionan en PS)
    $segs = @(); $runStart = -1
    for ($kk = 0; $kk -lt $flags.Count; $kk++) {
      if (-not $flags[$kk]) { if ($runStart -lt 0) { $runStart = $kk } }
      else { if ($runStart -ge 0) { $segs += ,@($runStart, ($kk - 1)); $runStart = -1 } }
    }
    if ($runStart -ge 0) { $segs += ,@($runStart, ($flags.Count - 1)) }
    $segTxt = ($segs | ForEach-Object {
      $a = $topLim + $_[0] * 2; $b = $topLim + ($_[1] + 1) * 2
      "[$a-$b px]"
    }) -join ' '
    Write-Output ("SEGS {0} :: {1}" -f $jb[1], $segTxt)
    $best = $null; $bestLen = -1
    foreach ($sg in $segs) {
      $ln = $sg[1] - $sg[0]
      if ($ln -gt $bestLen) { $bestLen = $ln; $best = $sg }
    }
    $y0 = $topLim + $best[0] * 2
    $y1 = [Math]::Min($topLim + ($best[1] + 1) * 2, $botLim)
    $cropH = $y1 - $y0
    $rect = New-Object System.Drawing.Rectangle(0, $y0, $pxW, $cropH)
    $out = $bmp.Clone($rect, $bmp.PixelFormat)
    try {
      $out.Save($dstPath, $encoder, $encParams)
      $pct = "x=0.0% y={0:F1}% w=100.0% h={1:F1}%" -f (100.0 * $y0 / $pxH), (100.0 * $cropH / $pxH)
      Write-Output ("CROP {0} <= {1} :: {2} [{3}x{4}]" -f $jb[1], $jb[0], $pct, $out.Width, $out.Height)
    } finally { $out.Dispose() }
  } finally { $bmp.Dispose() }
}

Copy-Item -LiteralPath (Join-Path $srcDir 'WhatsApp Image 2026-10-11 at 11.14.32 PM.jpeg') -Destination (Join-Path $dstDir 'wa-flyer-01.jpg') -Force
Copy-Item -LiteralPath (Join-Path $srcDir 'WhatsApp Image 2026-10-11 at 11.14.46 P1M.jpeg') -Destination (Join-Path $dstDir 'wa-flyer-02.jpg') -Force
Copy-Item -LiteralPath (Join-Path $srcDir 'WhatsApp Image 2026-10-11 at 11.14.47 1PM.jpeg') -Destination (Join-Path $dstDir 'wa-flyer-03.jpg') -Force
Copy-Item -LiteralPath (Join-Path $srcDir 'WhatsApp Image 1-10-111 at 11.14.44 PM.jpeg') -Destination (Join-Path $dstDir 'wa-flyer-04.jpg') -Force
Write-Output "FLVERS copied 4"
Get-ChildItem $dstDir -File | Sort-Object Name | ForEach-Object { "{0} {1}KB" -f $_.Name, ([int]($_.Length / 1KB)) }
