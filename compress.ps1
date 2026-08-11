Add-Type -AssemblyName System.Drawing

$url = "https://eoazxjqemimzsefldfms.supabase.co/rest/v1/variants"
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYXp4anFlbWltenNlZmxkZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjY4ODcsImV4cCI6MjEwMTY0Mjg4N30.gxQsH8F9-zK_01xOt8CMquSPp59rZeaFOjuvhONGA2c"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYXp4anFlbWltenNlZmxkZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjY4ODcsImV4cCI6MjEwMTY0Mjg4N30.gxQsH8F9-zK_01xOt8CMquSPp59rZeaFOjuvhONGA2c"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

Write-Host "Obteniendo variantes..."
$variants = Invoke-RestMethod -Uri "$($url)?select=id" -Headers $headers

Write-Host "Total de variantes: $($variants.Count)"

foreach ($v in $variants) {
    Write-Host "Procesando ID $($v.id)..."
    
    try {
        $variantData = Invoke-RestMethod -Uri "$($url)?id=eq.$($v.id)&select=photo" -Headers $headers
        $photo = $variantData[0].photo
        
        if ([string]::IsNullOrEmpty($photo) -or (-not $photo.StartsWith("data:image"))) {
            Write-Host "  Sin foto o formato incorrecto. Saltando."
            continue
        }
        
        if ($photo.Length -lt 100000) {
            Write-Host "  Foto ya es ligera ($([math]::Round($photo.Length/1024)) KB). Saltando."
            continue
        }
        
        Write-Host "  Comprimiendo foto original de $([math]::Round($photo.Length/1024/1024, 2)) MB..."
        
        $base64Data = $photo.Substring($photo.IndexOf(',') + 1)
        $bytes = [Convert]::FromBase64String($base64Data)
        $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
        $img = [System.Drawing.Image]::FromStream($ms)
        
        $maxWidth = 400.0
        $maxHeight = 400.0
        $ratio = [math]::Min($maxWidth / $img.Width, $maxHeight / $img.Height)
        
        if ($ratio -ge 1) {
            Write-Host "  La imagen ya es pequea ($($img.Width)x$($img.Height))."
            $img.Dispose()
            $ms.Dispose()
            continue
        }
        
        $newWidth = [int]($img.Width * $ratio)
        $newHeight = [int]($img.Height * $ratio)
        
        $newImg = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $newWidth, $newHeight)
        
        $outMs = New-Object System.IO.MemoryStream
        $newImg.Save($outMs, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $outBytes = $outMs.ToArray()
        
        $newPhoto = "data:image/jpeg;base64," + [Convert]::ToBase64String($outBytes)
        
        Write-Host "  Nuevo tamao: $([math]::Round($newPhoto.Length/1024)) KB. Actualizando base de datos..."
        
        $updateBody = @{ photo = $newPhoto } | ConvertTo-Json
        Invoke-RestMethod -Uri "$($url)?id=eq.$($v.id)" -Method Patch -Headers $headers -Body $updateBody | Out-Null
        
        Write-Host "  Actualizado."
        
        $img.Dispose()
        $newImg.Dispose()
        $g.Dispose()
        $ms.Dispose()
        $outMs.Dispose()
        
    } catch {
        Write-Host "  ERROR al procesar ID $($v.id): $_"
    }
}

Write-Host "PROCESO COMPLETADO."
