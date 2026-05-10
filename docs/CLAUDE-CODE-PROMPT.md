# 📋 Claude Code 첫 메시지 (복붙용)

이 파일의 내용을 복사해서 Claude Code 첫 메시지로 보내세요.

---

```
이 프로젝트는 DACON 해커톤 "투자 데이터 시각화" 출품작 "Insight Forge"야.
Skills.md 기반 범용 투자 분석 대시보드 시스템.

먼저 docs/HANDOFF.md 와 docs/NEXT-WORK.md 두 파일을 읽고 컨텍스트를 파악해줘.

요약:
- 기본 구현 완료 (Skills.md 5개 × 2번들, 자체지표 5종, 시나리오 9종, 인사이트 22개, 14개 더미 데이터셋, CSV 업로더)
- 다음 작업: B-2 (Yahoo Finance 실시간 연동 + Vercel Serverless Function)
- 마감: 2026-05-14 09:59

작업 순서:
1. docs/HANDOFF.md 읽기 — 프로젝트 전체 이해
2. docs/NEXT-WORK.md 읽기 — B-2 단계별 가이드
3. 현재 코드 구조 한번 훑어보기 (특히 src/core/datasets.js, src/components/DataUploader.jsx)
4. 작업 계획 세워서 보고
5. Step 1부터 차례로 진행

내가 원하는 것:
- 한국어 캐주얼 톤
- 결정 주도 (옵션 제시 + 추천)
- 짧고 직접적
- 빌드/실행 자주 검증
- 외부 API 의존 작업이라 단계별로 진행

먼저 HANDOFF.md 부터 읽고 시작해줘.
```

---

## 🎯 보내는 방법

### 옵션 A: VS Code 안의 Claude Code
1. VS Code에서 프로젝트 폴더 열기 (`code .`)
2. 사이드바의 Claude Code 아이콘 클릭
3. 위 메시지 복붙
4. Enter

### 옵션 B: 터미널의 Claude Code
1. 프로젝트 폴더로 이동 (`cd insight-forge-app`)
2. `claude` 실행
3. 위 메시지 복붙
4. Enter

---

## ⚙️ 추가 팁

**작업 중 이런 식으로 물어봐:**

```
1단계 시작하자. api/stock.js 만들어줘.
docs/NEXT-WORK.md의 Step 1 가이드 따라서.
```

```
방금 변경 후 npm run build 한번 돌려서 빌드 통과하는지 확인해줘.
```

```
vercel dev 띄워서 /api/stock?symbol=005930.KS 동작 테스트해줘.
```

**막히면:**
- 에러 메시지 그대로 복붙해서 물어봐
- 또는 Claude.ai 대화창 다시 와서 의도 설명 받기

---

## 🎯 단계별 끝낼 때마다

작업 한 단계 끝낼 때마다 git commit:
```
git add .
git commit -m "feat(B-2): Step 1 - api/stock.js 작성 완료"
```

이렇게 해두면 나중에 문제 생겨도 되돌리기 쉬움.
