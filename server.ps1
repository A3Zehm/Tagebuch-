# server.ps1 - kleiner Webserver, um die App am PC zu testen.
# Start: Doppelklick auf "Starten.cmd" oder im Terminal:
#   powershell -ExecutionPolicy Bypass -File server.ps1
# Beenden: Fenster schliessen oder Strg+C.

param([int]$Port = 8080)

$wurzel = [IO.Path]::GetFullPath($PSScriptRoot)
$typen = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
  '.md'   = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Die App laeuft auf http://localhost:$Port  (Beenden mit Strg+C)"

try {
  while ($listener.IsListening) {
    $aufgabe = $listener.GetContextAsync()
    while (-not $aufgabe.AsyncWaitHandle.WaitOne(200)) { }
    $ctx = $aufgabe.GetAwaiter().GetResult()

    $pfad = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($pfad -eq '') { $pfad = 'index.html' }
    $datei = [IO.Path]::GetFullPath((Join-Path $wurzel $pfad))

    try {
      if ($datei.StartsWith($wurzel) -and (Test-Path $datei -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($datei)
        $endung = [IO.Path]::GetExtension($datei).ToLower()
        $ctx.Response.ContentType = if ($typen[$endung]) { $typen[$endung] } else { 'application/octet-stream' }
        $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
        $ctx.Response.ContentLength64 = $bytes.Length
        if ($ctx.Request.HttpMethod -ne 'HEAD') {
          $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
      } else {
        $ctx.Response.StatusCode = 404
      }
    } catch {
      Write-Host "Fehler bei $pfad : $_"
    } finally {
      $ctx.Response.Close()
    }
  }
} finally {
  $listener.Stop()
}
