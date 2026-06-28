param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$Jar = (Join-Path (Split-Path -Parent $PSScriptRoot) "target/rutea-native-host-0.1.0.jar")
)

# Smoke test end-to-end del host por Native Messaging, sin Chrome ni datos reales.
# Envia hello + routine.save + routine.list + ai.navigation.propose enmarcados a una BD temporal aislada
# y comprueba que las respuestas son `ok`. Pensado para verificacion autonoma.

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($JavaHome)) {
    throw "Indica -JavaHome o define JAVA_HOME (JDK 21)."
}
$javaExe = Join-Path $JavaHome "bin/java.exe"
if (-not (Test-Path $javaExe)) { throw "No existe $javaExe" }
if (-not (Test-Path $Jar)) { throw "No existe el JAR $Jar. Ejecuta: mvn -B -f native-host/pom.xml package" }

function WriteFrame([System.IO.Stream]$stream, [string]$json) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $len = [System.BitConverter]::GetBytes([int]$bytes.Length)
    $stream.Write($len, 0, 4)
    $stream.Write($bytes, 0, $bytes.Length)
}

$routine = '{"schemaVersion":1,"id":"a1b2c3d4-1111-4111-8111-111111111111","name":"Smoke","allowedDomains":["localhost"],"steps":[{"id":"a1b2c3d4-2222-4222-8222-222222222222","action":"navigate","risk":"low","confirmationRequired":false}]}'
$hello = '{"protocolVersion":1,"messageId":"11111111-1111-4111-8111-111111111111","type":"hello","timestamp":"2026-06-28T10:00:00Z","payload":{"requestedProtocolVersions":[1]}}'
$save = '{"protocolVersion":1,"messageId":"22222222-2222-4222-8222-222222222222","type":"routine.save","timestamp":"2026-06-28T10:00:01Z","payload":{"routine":' + $routine + '}}'
$list = '{"protocolVersion":1,"messageId":"33333333-3333-4333-8333-333333333333","type":"routine.list","timestamp":"2026-06-28T10:00:02Z","payload":{}}'
$aiPayload = '{"schemaVersion":1,"requestId":"44444444-4444-4444-8444-444444444444","strategy":"auto","instruction":"Elegir junio y no firmados y pulsar Buscar","url":"https://soi.gpex.es/inicio.php","allowedDomains":["soi.gpex.es"],"allowedActions":["select","click","assert"],"limits":{"maxModelTurns":5,"maxActions":20,"maxIterations":1,"maxInputBytes":65536,"maxScreenshotCount":0,"maxDurationMs":60000},"screenContext":{"schemaVersion":1,"url":"https://soi.gpex.es/inicio.php","title":"Datos gestion / revision / mensual","capturedAt":"2026-06-28T12:00:00Z","viewport":{"width":1725,"height":1247},"controls":[{"id":"c1","kind":"select","role":"combobox","accessibleName":"Mes","label":"Mes","value":"Mayo","options":["Mayo","Junio"],"visible":true,"enabled":true,"locatorCandidates":[{"kind":"label","value":"Mes"}]},{"id":"c2","kind":"select","role":"combobox","accessibleName":"Firmadas","label":"Firmadas","value":"Mes Enviado","options":["Mes Enviado","Mes No Firmado"],"visible":true,"enabled":true,"locatorCandidates":[{"kind":"label","value":"Firmadas"}]},{"id":"c3","kind":"button","role":"button","accessibleName":"Buscar","text":"Buscar","visible":true,"enabled":true,"locatorCandidates":[{"kind":"role","value":"button","name":"Buscar"}]}],"tables":[],"actions":[{"actionId":"a1","kind":"select","controlId":"c1","description":"Seleccionar Mes","risk":"low"},{"actionId":"a2","kind":"select","controlId":"c2","description":"Seleccionar Firmadas","risk":"low"},{"actionId":"a3","kind":"click","controlId":"c3","description":"Click Buscar","risk":"low"}],"redactions":[],"truncated":false,"contextHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}'
$ai = '{"protocolVersion":1,"messageId":"55555555-5555-4555-8555-555555555555","type":"ai.navigation.propose","timestamp":"2026-06-28T10:00:03Z","payload":' + $aiPayload + '}'
$messages = @($hello, $save, $list, $ai)

$work = Join-Path ([System.IO.Path]::GetTempPath()) ("rutea-smoke-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $work | Out-Null
$inFile = Join-Path $work "in.bin"
$outFile = Join-Path $work "out.bin"

$buffer = New-Object System.IO.MemoryStream
foreach ($m in $messages) { WriteFrame $buffer $m }
[System.IO.File]::WriteAllBytes($inFile, $buffer.ToArray())

$env:LOCALAPPDATA = $work
cmd /c "`"$javaExe`" -jar `"$Jar`" < `"$inFile`" > `"$outFile`""

$out = [System.IO.File]::ReadAllBytes($outFile)
$offset = 0
$ok = $true
$count = 0
while ($offset + 4 -le $out.Length) {
    $len = [System.BitConverter]::ToInt32($out, $offset); $offset += 4
    if ($offset + $len -gt $out.Length) { break }
    $msg = [System.Text.Encoding]::UTF8.GetString($out, $offset, $len); $offset += $len
    $count += 1
    $parsed = $msg | ConvertFrom-Json
    $state = if ($parsed.ok) { "ok" } else { "ERROR(" + $parsed.error.code + ")" }
    Write-Host ("Respuesta $count : $state")
    if (-not $parsed.ok) { $ok = $false }
}

Remove-Item $work -Recurse -Force
if ($count -ne $messages.Count -or -not $ok) {
    Write-Error "Smoke test FALLIDO ($count/$($messages.Count) respuestas ok=$ok)"
    exit 1
}
Write-Host "Smoke test OK"
