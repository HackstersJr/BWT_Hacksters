# scripts/monitor.ps1
# Lightweight system telemetry for MCP server benchmarking

$logFile = "$PSScriptRoot\..\system_metrics.csv"

# Write CSV header if file doesn't exist
if (-not (Test-Path $logFile)) {
    Out-File -FilePath $logFile -InputObject "Timestamp,CPU %,Available RAM (MB)" -Encoding UTF8
}

Write-Host "Started MCP Telemetry Monitor. Logging to $logFile"
Write-Host "Press Ctrl+C to stop..."

try {
    while ($true) {
        $timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        
        # Get CPU (Note: NextValue() requires two calls or a delay, Get-Counter is more reliable but heavier)
        # Using WMI for lightweight CPU fetch, or Get-Counter for accuracy.
        # We will use Get-Counter as specified, but specify the max samples = 1
        $cpuCounter = Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue
        $cpu = $cpuCounter.CounterSamples[0].CookedValue
        $cpuFormatted = "{0:N2}" -f $cpu

        # Get Available RAM
        $memCounter = Get-Counter '\Memory\Available MBytes' -ErrorAction SilentlyContinue
        $ram = $memCounter.CounterSamples[0].CookedValue

        # Write to CSV
        $line = "$timestamp,$cpuFormatted,$ram"
        Add-Content -Path $logFile -Value $line

        Start-Sleep -Seconds 3
    }
} catch {
    Write-Host "Monitor stopped."
}
