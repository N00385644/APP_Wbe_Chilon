Add-Type -AssemblyName System.Drawing
$encInfo = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encPar = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encPar.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88)
$bmpImg = [System.Drawing.Bitmap]::FromFile('C:\Users\1luis\Documents\Ia chilon\img\WhatsApp Image 2026-10-11 at 11.174.40 PM.jpeg')
$rectBox = New-Object System.Drawing.Rectangle(0, 940, 720, 580)
$outImg = $bmpImg.Clone($rectBox, $bmpImg.PixelFormat)
$outImg.Save('C:\Users\1luis\Documents\Ia chilon\public\tours\wa-namora-08.jpg', $encInfo, $encPar)
$outImg.Dispose()
$bmpImg.Dispose()
Write-Output 'ok namora-08 re-crop y=58.8% h=36.3%'
