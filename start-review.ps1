$reviewPython = 'C:\Users\chanc\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (-not (Test-Path -LiteralPath $reviewPython)) { $reviewPython = 'python' }
& $reviewPython "$PSScriptRoot\review_server.py"
