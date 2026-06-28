param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$Jar = (Join-Path (Split-Path -Parent $PSScriptRoot) "target/rutea-native-host-0.1.0.jar")
)

# Smoke test end-to-end del host por Native Messaging, sin Chrome ni datos reales.
# Envia hello + routine.save + routine.list enmarcados a una BD temporal aislada
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
$messages = @($hello, $save, $list)

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
