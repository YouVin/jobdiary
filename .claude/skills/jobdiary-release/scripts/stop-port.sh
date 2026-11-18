#!/usr/bin/env bash
# 지정 포트(기본 3100)를 잡고 있는 `next start` 프로세스만 종료한다.
# 백그라운드 작업을 멈춰도 node 자식 프로세스가 남아 다음 서버가 EADDRINUSE로 실패하거나
# 이전 빌드를 계속 보여주는 문제를 막는다. 다른 프로그램이 쓰는 포트는 건드리지 않는다.
set -euo pipefail
PORT="${1:-3100}"
powershell.exe -NoProfile -Command "
  \$found = \$false
  foreach (\$id in (Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue).OwningProcess) {
    \$cl = (Get-CimInstance Win32_Process -Filter \"ProcessId=\$id\").CommandLine
    if (\$cl -like '*next*start*') { Stop-Process -Id \$id -Confirm:\$false; \"stopped \$id (next start)\"; \$found = \$true }
    else { \"port $PORT is used by another program (pid \$id); left running\"; \$found = \$true }
  }
  if (-not \$found) { 'port $PORT is free' }
"
