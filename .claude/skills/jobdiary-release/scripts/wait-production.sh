#!/usr/bin/env bash
# main 병합 커밋의 Vercel Production 배포가 끝날 때까지 기다린다 (최대 약 10분).
# 사용: wait-production.sh <commit-sha>
# 출력: "success <배포 주소>" / "failure ..." / "timeout"
set -euo pipefail
SHA="${1:?usage: wait-production.sh <commit-sha>}"
for _ in $(seq 1 40); do
  id=$(gh api "repos/{owner}/{repo}/deployments?environment=Production&sha=$SHA" -q '.[0].id' 2>/dev/null || true)
  if [ -n "$id" ]; then
    status=$(gh api "repos/{owner}/{repo}/deployments/$id/statuses" -q '.[0] | "\(.state) \(.environment_url)"')
    case "$status" in
      success*|failure*|error*) echo "$status"; exit 0 ;;
    esac
  fi
  sleep 15
done
echo "timeout"
exit 1
